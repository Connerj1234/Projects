#!/usr/bin/env python3
from __future__ import annotations

import argparse
from io import StringIO
from pathlib import Path
import random
import time

import pandas as pd
import requests
import yfinance as yf

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "data" / "raw" / "prices" / "daily_prices.parquet"


def fetch_price_history(
    ticker: str,
    start_date: str,
    end_date: str,
    max_retries: int,
    base_delay_sec: float,
) -> tuple[pd.DataFrame, str | None]:
    last_error: str | None = None
    for attempt in range(max_retries):
        try:
            data = yf.download(
                ticker,
                start=start_date,
                end=end_date,
                auto_adjust=True,
                progress=False,
                threads=False,
            )
        except Exception as exc:
            last_error = f"exception: {type(exc).__name__}: {exc}"
            data = pd.DataFrame()

        if not data.empty:
            data = data.reset_index()[["Date", "Close"]]
            data.columns = ["date", "close"]
            data["ticker"] = ticker
            data["date"] = pd.to_datetime(data["date"]).dt.normalize()
            return data[["ticker", "date", "close"]], None

        if last_error is None:
            last_error = "empty_result"
        if attempt < max_retries - 1:
            delay = base_delay_sec * (2**attempt) + random.uniform(0.0, 0.4)
            time.sleep(delay)

    return pd.DataFrame(), last_error


def _stooq_symbol(ticker: str) -> str:
    return f"{ticker.lower().replace('-', '.')}.us"


def fetch_price_history_stooq(
    ticker: str,
    start_date: str,
    end_date: str,
    timeout_sec: int = 30,
) -> tuple[pd.DataFrame, str | None]:
    symbol = _stooq_symbol(ticker)
    url = f"https://stooq.com/q/d/l/?s={symbol}&i=d"
    try:
        resp = requests.get(url, timeout=timeout_sec)
    except requests.RequestException as exc:
        return pd.DataFrame(), f"stooq_request_error: {exc}"

    if resp.status_code != 200:
        body = (resp.text or "").strip().replace("\n", " ")
        return pd.DataFrame(), f"stooq_http_{resp.status_code}: {body[:160]}"

    text = resp.text or ""
    if "No data" in text or "Brak danych" in text:
        return pd.DataFrame(), "stooq_no_data"

    try:
        data = pd.read_csv(StringIO(text))
    except Exception as exc:
        return pd.DataFrame(), f"stooq_csv_error: {type(exc).__name__}: {exc}"

    if data.empty or "Date" not in data.columns or "Close" not in data.columns:
        return pd.DataFrame(), "stooq_empty_or_invalid_columns"

    data = data[["Date", "Close"]].copy()
    data.columns = ["date", "close"]
    data["date"] = pd.to_datetime(data["date"], errors="coerce").dt.normalize()
    data["close"] = pd.to_numeric(data["close"], errors="coerce")
    data = data.dropna(subset=["date", "close"])
    if data.empty:
        return pd.DataFrame(), "stooq_empty_after_cleaning"

    start = pd.to_datetime(start_date).normalize()
    end = pd.to_datetime(end_date).normalize()
    data = data[(data["date"] >= start) & (data["date"] <= end)]
    if data.empty:
        return pd.DataFrame(), "stooq_empty_in_range"

    data["ticker"] = ticker
    return data[["ticker", "date", "close"]], None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tickers", nargs="+", required=True)
    parser.add_argument("--start-date", default="2018-01-01")
    parser.add_argument("--end-date", default="2026-01-31")
    parser.add_argument("--benchmark", default="SPY")
    parser.add_argument("--max-retries", type=int, default=6)
    parser.add_argument("--base-delay-sec", type=float, default=1.0)
    parser.add_argument("--pause-between-tickers-sec", type=float, default=0.35)
    parser.add_argument(
        "--provider",
        choices=["auto", "yfinance", "stooq"],
        default="auto",
        help="Price source: auto tries Yahoo first, then Stooq fallback.",
    )
    args = parser.parse_args()

    tickers = sorted(set(args.tickers + [args.benchmark]))

    frames: list[pd.DataFrame] = []
    errors: list[str] = []
    providers_used: dict[str, str] = {}
    for ticker in tickers:
        frame = pd.DataFrame()
        error: str | None = None

        if args.provider in {"auto", "yfinance"}:
            frame, error = fetch_price_history(
                ticker=ticker,
                start_date=args.start_date,
                end_date=args.end_date,
                max_retries=max(1, args.max_retries),
                base_delay_sec=max(0.1, args.base_delay_sec),
            )
            if not frame.empty:
                providers_used[ticker] = "yfinance"

        if frame.empty and args.provider in {"auto", "stooq"}:
            stooq_frame, stooq_error = fetch_price_history_stooq(
                ticker=ticker,
                start_date=args.start_date,
                end_date=args.end_date,
            )
            if not stooq_frame.empty:
                frame = stooq_frame
                providers_used[ticker] = "stooq"
                error = None
            elif args.provider == "auto":
                error = f"yfinance={error or 'empty_result'}; stooq={stooq_error or 'empty_result'}"
            else:
                error = stooq_error

        if frame.empty:
            errors.append(f"{ticker}: {error or 'empty_result'}")
        else:
            frames.append(frame)
        time.sleep(max(0.0, args.pause_between_tickers_sec))

    df = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()
    if df.empty:
        example_errors = "\n".join(f"  - {e}" for e in errors[:8]) or "  - none"
        raise RuntimeError(
            "No price data returned.\n"
            "Both configured providers returned no data.\n"
            "Example ticker errors:\n"
            f"{example_errors}\n"
            "Retry later or run with --provider stooq to bypass Yahoo rate limits."
        )

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(OUT_PATH, index=False)
    print(f"Saved {len(df)} price rows to {OUT_PATH}")
    if providers_used:
        y_count = sum(1 for p in providers_used.values() if p == "yfinance")
        s_count = sum(1 for p in providers_used.values() if p == "stooq")
        print(f"Providers used: yfinance={y_count}, stooq={s_count}")
    if errors:
        print("Tickers with no data after retries:")
        for e in errors:
            print(f"  - {e}")


if __name__ == "__main__":
    main()
