from __future__ import annotations

import argparse

import pandas as pd

from earnings_intel.retrieval.chunking import chunk_transcript
from earnings_intel.retrieval.index import build_retrieval_index
from earnings_intel.utils.io import ensure_parent, read_yaml
from earnings_intel.utils.logging import get_logger

LOGGER = get_logger(__name__)


def run(config_path: str) -> None:
    cfg = read_yaml(config_path)
    inp = cfg["input"]
    out = cfg["output"]
    chunk_cfg = cfg.get("chunking", {})
    idx_cfg = cfg.get("index", {})

    chunk_size = int(chunk_cfg.get("chunk_size_tokens", 300))
    overlap = int(chunk_cfg.get("overlap_tokens", 50))
    max_docs = chunk_cfg.get("max_docs")
    max_features = int(idx_cfg.get("max_features", 30000))

    transcripts = pd.read_parquet(inp["transcripts_path"])
    transcripts = transcripts.sort_values("event_date").reset_index(drop=True)
    if max_docs:
        transcripts = transcripts.tail(int(max_docs)).copy()
        LOGGER.info("Limited retrieval build to last %s transcripts", len(transcripts))

    rows = []
    for rec in transcripts[["doc_id", "ticker", "event_date", "full_text"]].itertuples(index=False):
        rows.extend(
            chunk_transcript(
                doc_id=rec.doc_id,
                ticker=str(rec.ticker).upper(),
                event_date=rec.event_date,
                text=rec.full_text or "",
                chunk_size_tokens=chunk_size,
                overlap_tokens=overlap,
            )
        )

    chunks = pd.DataFrame(rows)
    ensure_parent(out["chunks_path"])
    chunks.to_parquet(out["chunks_path"], index=False)
    LOGGER.info("Saved chunks: %s (rows=%s)", out["chunks_path"], len(chunks))

    artifacts = build_retrieval_index(
        texts=chunks["chunk_text"].fillna("").astype(str).tolist(),
        index_dir=out["index_dir"],
        max_features=max_features,
    )
    LOGGER.info(
        "Saved retrieval index: matrix=%s vectorizer=%s nn=%s",
        artifacts.matrix_path,
        artifacts.vectorizer_path,
        artifacts.nn_path,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Run retrieval chunking and index pipeline.")
    parser.add_argument("--config", default="configs/retrieval.yaml", help="Path to retrieval config.")
    args = parser.parse_args()
    run(args.config)


if __name__ == "__main__":
    main()
