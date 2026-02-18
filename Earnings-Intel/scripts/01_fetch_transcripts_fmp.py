#!/usr/bin/env python3
from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path
import os

import pandas as pd
import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "data" / "raw" / "transcripts" / "fmp_transcripts.parquet"


def fetch_one(ticker: str, year: int, quarter: int, api_key: str) -> list[dict]:
    url = f"https://financialmodelingprep.com/api/v3/earning_call_transcript/{ticker}"
    params = {"year": year, "quarter": quarter, "apikey": api_key}
    resp = requests.get(url, params=params, timeout=30)
    if resp.status_code != 200:
        return []
    data = resp.json()
    if not isinstance(data, list):
        return []

    rows = []
    for item in data:
        date_str = item.get("date")
        if not date_str:
            continue
        rows.append(
            {
                "ticker": ticker,
                "date": pd.to_datetime(date_str).normalize(),
                "year": int(item.get("year", year)),
                "quarter": int(item.get("quarter", quarter)),
                "symbol": item.get("symbol", ticker),
                "content": item.get("content", ""),
                "source": "fmp",
                "ingested_at": pd.Timestamp(datetime.utcnow()),
            }
        )
    return rows


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tickers", nargs="+", required=True)
    parser.add_argument("--start-year", type=int, default=2019)
    parser.add_argument("--end-year", type=int, default=2025)
    args = parser.parse_args()

    load_dotenv(ROOT / ".env")
    api_key = os.getenv("FMP_API_KEY")
    if not api_key:
        raise RuntimeError("FMP_API_KEY missing. Add it to .env from .env.example")

    all_rows: list[dict] = []
    for ticker in args.tickers:
        for year in range(args.start_year, args.end_year + 1):
            for quarter in [1, 2, 3, 4]:
                all_rows.extend(fetch_one(ticker=ticker, year=year, quarter=quarter, api_key=api_key))

    df = pd.DataFrame(all_rows)
    if df.empty:
        raise RuntimeError("No transcripts returned. Verify API key and ticker coverage.")

    df = df.drop_duplicates(subset=["ticker", "date", "quarter", "year"]).sort_values(["ticker", "date"])
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(OUT_PATH, index=False)

    print(f"Saved {len(df)} transcript rows to {OUT_PATH}")


if __name__ == "__main__":
    main()
