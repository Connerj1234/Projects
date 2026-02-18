#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

from earnings_intel.retrieval import search

ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / "vectorstore" / "transcript_index.joblib"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", required=True)
    parser.add_argument("--top-k", type=int, default=5)
    args = parser.parse_args()

    results = search(INDEX_PATH, args.query, top_k=args.top_k)
    for i, r in enumerate(results, 1):
        snippet = r["text"][:220].replace("\n", " ")
        print(f"{i}. [{r['ticker']} {r['date']} Q{r['quarter']}] score={r['score']:.4f}")
        print(f"   {snippet}...")


if __name__ == "__main__":
    main()
