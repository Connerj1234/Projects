from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from pathlib import Path

import pandas as pd

from earnings_intel.utils.io import ensure_parent


@dataclass
class PriceIngestionSummary:
    requested_tickers: int
    downloaded_tickers: int
    failed_tickers: int
    total_rows: int
    benchmark_ticker: str


def _candidate_symbols(ticker: str) -> list[str]:
    t = ticker.lower()
    return [f"{t}.us", f"{t.replace('.', '-')}.us", f"{t.replace('.', '')}.us"]


def _stooq_url(stooq_symbol: str) -> str:
    return f"https://stooq.com/q/d/l/?s={stooq_symbol}&i=d"


def _clean_price_frame(df: pd.DataFrame, ticker: str) -> pd.DataFrame:
    out = df.rename(columns=str.lower).copy()
    needed = ["date", "open", "high", "low", "close", "volume"]
    for c in needed:
        if c not in out.columns:
            out[c] = pd.NA
    out = out[needed]
    out["date"] = pd.to_datetime(out["date"], errors="coerce").dt.normalize()
    out = out[out["date"].notna()]
    out = out[out["date"] <= pd.Timestamp(date.today())]
    for c in ["open", "high", "low", "close", "volume"]:
        out[c] = pd.to_numeric(out[c], errors="coerce")
    out = out.drop_duplicates(subset=["date"]).sort_values("date")
    out["ticker"] = ticker
    return out[["ticker", "date", "open", "high", "low", "close", "volume"]]


def _download_ticker_prices(ticker: str) -> pd.DataFrame:
    last_error: Exception | None = None
    for stooq_symbol in _candidate_symbols(ticker):
        try:
            frame = pd.read_csv(_stooq_url(stooq_symbol))
            if not frame.empty and "Date" in frame.columns:
                return _clean_price_frame(frame, ticker=ticker)
        except Exception as exc:  # noqa: BLE001
            last_error = exc
    if last_error is not None:
        raise last_error
    raise RuntimeError(f"Unable to download ticker {ticker}")


def ingest_stooq_prices(
    tickers: list[str],
    raw_dir: str,
    output_path: str,
    benchmark_ticker: str = "SPY",
    force_download: bool = False,
) -> tuple[pd.DataFrame, PriceIngestionSummary]:
    unique_tickers = sorted({t.strip().upper() for t in tickers if t and str(t).strip()})
    if benchmark_ticker.upper() not in unique_tickers:
        unique_tickers.append(benchmark_ticker.upper())

    raw_base = Path(raw_dir)
    raw_base.mkdir(parents=True, exist_ok=True)

    frames: list[pd.DataFrame] = []
    downloaded = 0
    failed = 0

    for ticker in unique_tickers:
        raw_path = raw_base / f"{ticker}.csv"
        frame: pd.DataFrame | None = None

        if raw_path.exists() and not force_download:
            try:
                cached = pd.read_csv(raw_path)
                frame = _clean_price_frame(cached, ticker=ticker)
            except Exception:  # noqa: BLE001
                frame = None

        if frame is None:
            try:
                frame = _download_ticker_prices(ticker)
                frame.to_csv(raw_path, index=False)
                downloaded += 1
            except Exception:  # noqa: BLE001
                failed += 1
                continue

        if not frame.empty:
            frames.append(frame)

    combined = (
        pd.concat(frames, ignore_index=True)
        if frames
        else pd.DataFrame(columns=["ticker", "date", "open", "high", "low", "close", "volume"])
    )
    combined = combined.sort_values(["ticker", "date"]).reset_index(drop=True)

    ensure_parent(output_path)
    combined.to_parquet(output_path, index=False)

    summary = PriceIngestionSummary(
        requested_tickers=len(unique_tickers),
        downloaded_tickers=downloaded,
        failed_tickers=failed,
        total_rows=len(combined),
        benchmark_ticker=benchmark_ticker.upper(),
    )
    return combined, summary
