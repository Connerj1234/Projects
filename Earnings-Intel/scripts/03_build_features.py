#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

import pandas as pd
from sklearn.decomposition import NMF
from sklearn.feature_extraction.text import TfidfVectorizer

from earnings_intel.text_features import extract_text_features, safe_log1p

ROOT = Path(__file__).resolve().parents[1]
IN_PATH = ROOT / "data" / "raw" / "transcripts" / "fmp_transcripts.parquet"
OUT_PATH = ROOT / "data" / "processed" / "transcript_features.parquet"


def main() -> None:
    df = pd.read_parquet(IN_PATH)
    if df.empty:
        raise RuntimeError("Transcript input is empty.")

    df["content"] = df["content"].fillna("")
    feature_rows = df["content"].map(extract_text_features)

    df["word_count"] = [f.word_count for f in feature_rows]
    df["risk_ratio"] = [f.risk_ratio for f in feature_rows]
    df["opportunity_ratio"] = [f.opportunity_ratio for f in feature_rows]
    df["sentiment_neg"] = [f.sentiment_neg for f in feature_rows]
    df["sentiment_pos"] = [f.sentiment_pos for f in feature_rows]
    df["sentiment_compound"] = [f.sentiment_compound for f in feature_rows]
    df["log_word_count"] = df["word_count"].map(safe_log1p)

    # Topic exposure features from transcript text.
    vectorizer = TfidfVectorizer(max_features=4000, ngram_range=(1, 2), min_df=3, max_df=0.85)
    X = vectorizer.fit_transform(df["content"])
    n_topics = min(8, max(3, X.shape[0] // 20))
    nmf = NMF(n_components=n_topics, random_state=42)
    topic_matrix = nmf.fit_transform(X)
    for i in range(n_topics):
        df[f"topic_{i + 1}"] = topic_matrix[:, i]

    cols = [
        "ticker",
        "date",
        "year",
        "quarter",
        "word_count",
        "log_word_count",
        "risk_ratio",
        "opportunity_ratio",
        "sentiment_neg",
        "sentiment_pos",
        "sentiment_compound",
    ] + [c for c in df.columns if c.startswith("topic_")]

    out = df[cols].copy().sort_values(["ticker", "date"]) 
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    out.to_parquet(OUT_PATH, index=False)

    print(f"Saved {len(out)} feature rows to {OUT_PATH}")


if __name__ == "__main__":
    main()
