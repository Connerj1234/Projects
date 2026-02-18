from __future__ import annotations

import argparse
import re
from pathlib import Path

import numpy as np
import pandas as pd
from joblib import dump
from scipy import sparse

from earnings_intel.features.embeddings import svd_embeddings
from earnings_intel.features.lexicons import lexicon_features
from earnings_intel.features.readability import readability_features
from earnings_intel.features.sentiment import sentiment_features
from earnings_intel.features.tfidf import build_tfidf
from earnings_intel.utils.io import ensure_parent, read_yaml
from earnings_intel.utils.logging import get_logger

LOGGER = get_logger(__name__)


def _numbers_density(text: str) -> float:
    toks = re.findall(r"\b\w+\b", (text or "").lower())
    if not toks:
        return 0.0
    n_num = len(re.findall(r"\b\d+(?:\.\d+)?%?\b", text or ""))
    return float(n_num / len(toks))


def _qa_ratio(text: str) -> float:
    if not text:
        return 0.0
    low = text.lower()
    idx = low.find("question-and-answer")
    if idx < 0:
        idx = low.find("q&a")
    if idx < 0:
        return 0.0
    q_len = len(low[idx:])
    return float(q_len / max(len(low), 1))


def build_tabular_features(transcripts: pd.DataFrame) -> pd.DataFrame:
    rows: list[dict[str, float | str | pd.Timestamp]] = []
    for rec in transcripts[["doc_id", "ticker", "event_date", "full_text"]].itertuples(index=False):
        text = rec.full_text or ""
        f_read = readability_features(text)
        f_lex = lexicon_features(text)
        f_sent = sentiment_features(text)
        row = {
            "doc_id": rec.doc_id,
            "ticker": rec.ticker,
            "event_date": rec.event_date,
            "numbers_density": _numbers_density(text),
            "qa_ratio": _qa_ratio(text),
        }
        row.update(f_read)
        row.update(f_lex)
        row.update(f_sent)
        rows.append(row)
    return pd.DataFrame(rows)


def write_feature_dictionary(path: str) -> None:
    ensure_parent(path)
    content = """# Feature Dictionary

## Tabular features

- `sent_count`: number of sentence-like segments split on `.?!`
- `token_count`: count of word-like tokens
- `avg_sentence_len`: token_count / max(sent_count, 1)
- `avg_token_len`: average token character length
- `flesch_proxy`: readability proxy from sentence length and syllable estimate
- `uncertainty_count`: count of uncertainty lexicon hits
- `uncertainty_ratio`: uncertainty_count / token_count
- `risk_count`: count of risk lexicon hits
- `risk_ratio`: risk_count / token_count
- `positive_count`: count of positive sentiment lexicon hits
- `negative_count`: count of negative sentiment lexicon hits
- `positive_ratio`: positive_count / token_count
- `negative_ratio`: negative_count / token_count
- `sentiment_net`: (positive_count - negative_count) / token_count
- `numbers_density`: numeric token count / token_count
- `qa_ratio`: share of transcript characters in Q&A section (heuristic)

## Text features

- `features_text.npz`: TF-IDF sparse matrix over full transcript text (1-2 gram, english stopwords)
- `tfidf_vectorizer.joblib`: fitted TF-IDF vectorizer object

## Embeddings

- `embeddings.npy`: dense document vectors from TruncatedSVD over TF-IDF, L2-normalized
"""
    Path(path).write_text(content, encoding="utf-8")


def run(config_path: str) -> None:
    cfg = read_yaml(config_path)
    inp = cfg["input"]
    out = cfg["output"]
    tfidf_cfg = cfg.get("tfidf", {})
    emb_cfg = cfg.get("embeddings", {})
    max_docs = cfg.get("max_docs")
    text_char_limit = int(cfg.get("text_char_limit", 12000))
    labeled_only = bool(cfg.get("labeled_only", True))

    transcripts = pd.read_parquet(inp["transcripts_path"])
    event_returns = pd.read_parquet(inp["event_returns_path"])
    merged = transcripts.merge(
        event_returns[["doc_id", "target_car", "target_up", "has_label"]],
        on="doc_id",
        how="left",
    )
    if labeled_only:
        mask = merged["has_label"].astype("boolean").fillna(False)
        merged = merged[mask].copy()
        LOGGER.info("Filtered to labeled documents: %s", len(merged))
    if max_docs:
        merged = merged.sort_values("event_date").tail(int(max_docs)).copy()
        LOGGER.info("Limited features run to last %s documents via config", len(merged))

    merged["full_text"] = merged["full_text"].fillna("").astype(str).str.slice(0, text_char_limit)
    LOGGER.info("Building tabular features for %s documents", len(merged))

    tab = build_tabular_features(merged)
    tab = tab.merge(
        merged[["doc_id", "target_car", "target_up", "has_label"]],
        on="doc_id",
        how="left",
    )

    ensure_parent(out["tabular_path"])
    tab.to_parquet(out["tabular_path"], index=False)
    LOGGER.info("Saved tabular features: %s (rows=%s)", out["tabular_path"], len(tab))

    texts = merged["full_text"].fillna("").astype(str).tolist()
    LOGGER.info("Building TF-IDF features...")
    tfidf = build_tfidf(
        texts=texts,
        max_features=int(tfidf_cfg.get("max_features", 20000)),
        min_df=int(tfidf_cfg.get("min_df", 3)),
    )
    ensure_parent(out["text_npz_path"])
    sparse.save_npz(out["text_npz_path"], tfidf.matrix, compressed=True)
    ensure_parent(out["vectorizer_path"])
    dump(tfidf.vectorizer, out["vectorizer_path"])
    LOGGER.info(
        "Saved TF-IDF matrix: %s (shape=%s)", out["text_npz_path"], tuple(tfidf.matrix.shape)
    )

    LOGGER.info("Building dense embeddings...")
    emb = svd_embeddings(
        tfidf_matrix=tfidf.matrix,
        dim=int(emb_cfg.get("dim", 256)),
        random_state=int(emb_cfg.get("random_state", 42)),
    )
    ensure_parent(out["embeddings_path"])
    np.save(out["embeddings_path"], emb)
    LOGGER.info("Saved embeddings: %s (shape=%s)", out["embeddings_path"], tuple(emb.shape))

    write_feature_dictionary(out["feature_dictionary_report"])
    LOGGER.info("Saved feature dictionary: %s", out["feature_dictionary_report"])


def main() -> None:
    parser = argparse.ArgumentParser(description="Run feature engineering pipeline.")
    parser.add_argument("--config", default="configs/features.yaml", help="Path to features config.")
    args = parser.parse_args()
    run(args.config)


if __name__ == "__main__":
    main()
