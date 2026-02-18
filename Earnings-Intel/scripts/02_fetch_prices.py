#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd
import yfinance as yf

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "data" / "raw" / "prices" / "daily_prices.parquet"


def fetch_price_history(ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
    data = yf.download(ticker, start=start_date, end=end_date, auto_adjust=True, progress=False)
    if data.empty:
        return pd.DataFrame()

    data = data.reset_index()[["Date", "Close"]]
    data.columns = ["date", "close"]
    data["ticker"] = ticker
    data["date"] = pd.to_datetime(data["date"]).dt.normalize()
    return data[["ticker", "date", "close"]]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tickers", nargs="+", required=True)
    parser.add_argument("--start-date", default="2018-01-01")
    parser.add_argument("--end-date", default="2026-01-31")
    parser.add_argument("--benchmark", default="SPY")
    args = parser.parse_args()

    tickers = sorted(set(args.tickers + [args.benchmark]))

    frames = []
    for ticker in tickers:
        frames.append(fetch_price_history(ticker, args.start_date, args.end_date))

    df = pd.concat(frames, ignore_index=True)
    if df.empty:
        raise RuntimeError("No price data returned.")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(OUT_PATH, index=False)
    print(f"Saved {len(df)} price rows to {OUT_PATH}")


if __name__ == "__main__":
    main()
