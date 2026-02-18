from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from earnings_intel.cleaning.transcripts_clean import drop_empty_transcripts
from earnings_intel.ingestion.kaggle_transcripts import (
    deduplicate_longest,
    load_source,
    normalize_transcripts,
)
from earnings_intel.ingestion.prices_stooq import PriceIngestionSummary, ingest_stooq_prices
from earnings_intel.labeling.abnormal_returns import compute_event_returns
from earnings_intel.utils.io import ensure_parent, read_yaml
from earnings_intel.utils.logging import get_logger

LOGGER = get_logger(__name__)


def build_data_quality_report(
    transcripts_df: pd.DataFrame,
    report_path: str,
    min_median_char_len: int,
    prices_df: pd.DataFrame | None = None,
    prices_summary: PriceIngestionSummary | None = None,
    event_returns_df: pd.DataFrame | None = None,
    min_history_days: int = 200,
) -> None:
    total_rows = len(transcripts_df)
    null_tickers = int(transcripts_df["ticker"].isna().sum())
    date_parse_ratio = float(transcripts_df["event_date"].notna().mean()) if total_rows else 0.0
    median_char_len = float(transcripts_df["char_len"].median()) if total_rows else 0.0

    pass_min_events = total_rows >= 50
    pass_no_null_tickers = null_tickers == 0
    pass_date_parse = date_parse_ratio >= 0.95
    pass_median_len = median_char_len >= min_median_char_len

    counts_by_ticker = (
        transcripts_df["ticker"].value_counts().head(25).rename_axis("ticker").reset_index(name="events")
    )
    by_year_quarter = (
        transcripts_df.assign(
            year=transcripts_df["event_date"].dt.year, quarter=transcripts_df["event_date"].dt.quarter
        )
        .groupby(["year", "quarter"], dropna=False)
        .size()
        .reset_index(name="events")
        .sort_values(["year", "quarter"])
    )

    ticker_history_pass = None
    label_coverage_pass = None
    ticker_history_pct = None
    label_coverage_pct = None

    if prices_df is not None and not prices_df.empty:
        history = prices_df.groupby("ticker")["date"].nunique()
        ticker_history_pct = float((history >= min_history_days).mean()) if len(history) else 0.0
        ticker_history_pass = bool((history >= min_history_days).all())

    if event_returns_df is not None and not event_returns_df.empty:
        label_coverage_pct = float(event_returns_df["has_label"].mean())
        label_coverage_pass = label_coverage_pct >= 0.80

    ensure_parent(report_path)
    with Path(report_path).open("w", encoding="utf-8") as f:
        f.write("# Data Quality Report\n\n")
        f.write("## Acceptance checks\n\n")
        f.write(f"- at least 50 events: {'PASS' if pass_min_events else 'FAIL'} ({total_rows})\n")
        f.write(f"- no null tickers: {'PASS' if pass_no_null_tickers else 'FAIL'} ({null_tickers} null)\n")
        f.write(
            f"- event_date parses >=95%: {'PASS' if pass_date_parse else 'FAIL'} ({date_parse_ratio:.2%})\n"
        )
        f.write(
            f"- median char_len >= {min_median_char_len}: {'PASS' if pass_median_len else 'FAIL'} ({median_char_len:.0f})\n"
        )
        if ticker_history_pct is not None:
            f.write(
                f"- ticker price history includes >= {min_history_days} days: {'PASS' if ticker_history_pass else 'FAIL'} ({ticker_history_pct:.2%} tickers)\n"
            )
        if label_coverage_pct is not None:
            f.write(
                f"- label coverage >= 80%: {'PASS' if label_coverage_pass else 'FAIL'} ({label_coverage_pct:.2%})\n"
            )
        f.write("\n## Summary stats\n\n")
        f.write(f"- rows: {total_rows}\n")
        f.write(f"- unique tickers: {transcripts_df['ticker'].nunique()}\n")
        f.write(
            f"- event_date range: {transcripts_df['event_date'].min()} to {transcripts_df['event_date'].max()}\n"
        )
        f.write(f"- char_len median: {median_char_len:.0f}\n")
        f.write(f"- token_len median: {transcripts_df['token_len'].median():.0f}\n")
        if prices_summary is not None:
            f.write(f"- price rows: {prices_summary.total_rows}\n")
            f.write(f"- price requested tickers: {prices_summary.requested_tickers}\n")
            f.write(f"- price downloaded tickers: {prices_summary.downloaded_tickers}\n")
            f.write(f"- price failed tickers: {prices_summary.failed_tickers}\n")
            f.write(f"- benchmark ticker: {prices_summary.benchmark_ticker}\n")
        if label_coverage_pct is not None:
            f.write(f"- labeled events: {int(event_returns_df['has_label'].sum())}\n")
            f.write(f"- label coverage: {label_coverage_pct:.2%}\n")
        f.write("\n## Counts by ticker (top 25)\n\n")
        f.write(counts_by_ticker.to_markdown(index=False))
        f.write("\n\n## Counts by year and quarter\n\n")
        f.write(by_year_quarter.to_markdown(index=False))
        f.write("\n")


def run(config_path: str) -> None:
    config = read_yaml(config_path)
    transcripts_cfg = config["transcripts"]
    prices_cfg = config.get("prices", {})
    labels_cfg = config.get("labels", {})
    report_cfg = config["report"]

    input_path = transcripts_cfg["input_path"]
    raw_csv_path = transcripts_cfg["raw_csv_path"]
    output_path = transcripts_cfg["output_path"]
    source_name = transcripts_cfg["source_name"]
    min_median_char_len = int(transcripts_cfg.get("min_median_char_len", 5000))
    min_history_days = int(prices_cfg.get("min_history_days", 200))

    LOGGER.info("Loading transcripts from %s", input_path)
    src = load_source(input_path)

    ensure_parent(raw_csv_path)
    src.to_csv(raw_csv_path, index=False)
    LOGGER.info("Saved raw CSV: %s", raw_csv_path)

    normalized = normalize_transcripts(src, source_name=source_name)
    normalized = drop_empty_transcripts(normalized)
    processed = deduplicate_longest(normalized)

    ensure_parent(output_path)
    processed.to_parquet(output_path, index=False)
    LOGGER.info("Saved processed transcripts: %s (rows=%s)", output_path, len(processed))

    prices_df: pd.DataFrame | None = None
    prices_summary: PriceIngestionSummary | None = None
    event_returns_df: pd.DataFrame | None = None

    prices_enabled = bool(prices_cfg.get("enabled", False))
    labels_enabled = bool(labels_cfg.get("enabled", False))

    if prices_enabled:
        raw_dir = prices_cfg["raw_dir"]
        prices_output = prices_cfg["output_path"]
        benchmark_ticker = prices_cfg.get("benchmark_ticker", "SPY")
        max_tickers = prices_cfg.get("max_tickers")
        force_download = bool(prices_cfg.get("force_download", False))

        tickers = sorted(processed["ticker"].dropna().astype(str).str.upper().unique().tolist())
        if max_tickers:
            tickers = tickers[: int(max_tickers)]
            LOGGER.info("Price ingestion limited to first %s tickers via config", len(tickers))

        LOGGER.info("Downloading/loading prices for %s tickers (+benchmark)", len(tickers))
        prices_df, prices_summary = ingest_stooq_prices(
            tickers=tickers,
            raw_dir=raw_dir,
            output_path=prices_output,
            benchmark_ticker=benchmark_ticker,
            force_download=force_download,
        )
        LOGGER.info(
            "Saved processed prices: %s (rows=%s, failed_tickers=%s)",
            prices_output,
            len(prices_df),
            prices_summary.failed_tickers,
        )

    if labels_enabled:
        labels_output = labels_cfg["output_path"]
        winsor_lower = float(labels_cfg.get("winsor_lower", 0.01))
        winsor_upper = float(labels_cfg.get("winsor_upper", 0.99))
        benchmark_ticker = prices_cfg.get("benchmark_ticker", "SPY")
        if prices_df is None:
            prices_df = pd.DataFrame(columns=["ticker", "date", "close"])

        events_input = processed
        if prices_cfg.get("max_tickers"):
            keep = set(sorted(events_input["ticker"].dropna().astype(str).str.upper().unique())[: int(prices_cfg["max_tickers"])])
            events_input = events_input[events_input["ticker"].str.upper().isin(keep)].copy()

        event_returns_df = compute_event_returns(
            transcripts=events_input,
            prices=prices_df,
            benchmark_ticker=str(benchmark_ticker),
            winsor_lower=winsor_lower,
            winsor_upper=winsor_upper,
        )
        ensure_parent(labels_output)
        event_returns_df.to_parquet(labels_output, index=False)
        LOGGER.info("Saved event returns: %s (rows=%s)", labels_output, len(event_returns_df))

    build_data_quality_report(
        transcripts_df=processed,
        report_path=report_cfg["output_path"],
        min_median_char_len=min_median_char_len,
        prices_df=prices_df,
        prices_summary=prices_summary,
        event_returns_df=event_returns_df,
        min_history_days=min_history_days,
    )
    LOGGER.info("Saved quality report: %s", report_cfg["output_path"])


def main() -> None:
    parser = argparse.ArgumentParser(description="Run data ingestion and QC pipeline.")
    parser.add_argument("--config", default="configs/data.yaml", help="Path to data config YAML.")
    args = parser.parse_args()
    run(args.config)


if __name__ == "__main__":
    main()
