#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

import pandas as pd

from earnings_intel.retrieval import encode_texts, save_artifacts
from earnings_intel.text_features import chunk_text

ROOT = Path(__file__).resolve().parents[1]
IN_PATH = ROOT / "data" / "raw" / "transcripts" / "fmp_transcripts.parquet"
OUT_PATH = ROOT / "vectorstore" / "transcript_index.joblib"


def main() -> None:
    df = pd.read_parquet(IN_PATH)
    if df.empty:
        raise RuntimeError("Transcript input is empty.")

    texts: list[str] = []
    metadata: list[dict] = []

    for row in df.itertuples(index=False):
        chunks = chunk_text(row.content)
        for i, chunk in enumerate(chunks):
            texts.append(chunk)
            metadata.append(
                {
                    "ticker": row.ticker,
                    "date": str(pd.Timestamp(row.date).date()),
                    "quarter": int(row.quarter),
                    "chunk_id": i,
                    "text": chunk,
                }
            )

    if not texts:
        raise RuntimeError("No chunks built from transcripts.")

    embeddings = encode_texts(texts)
    save_artifacts(OUT_PATH, embeddings, metadata)

    print(f"Saved retrieval artifacts to {OUT_PATH} ({len(texts)} chunks)")


if __name__ == "__main__":
    main()
