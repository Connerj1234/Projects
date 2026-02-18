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
from earnings_intel.utils.io import ensure_parent, read_yaml
from earnings_intel.utils.logging import get_logger

LOGGER = get_logger(__name__)


def build_data_quality_report(df: pd.DataFrame, report_path: str, min_median_char_len: int) -> None:
    total_rows = len(df)
    null_tickers = int(df["ticker"].isna().sum())
    date_parse_ratio = float(df["event_date"].notna().mean()) if total_rows else 0.0
    median_char_len = float(df["char_len"].median()) if total_rows else 0.0

    pass_min_events = total_rows >= 50
    pass_no_null_tickers = null_tickers == 0
    pass_date_parse = date_parse_ratio >= 0.95
    pass_median_len = median_char_len >= min_median_char_len

    counts_by_ticker = (
        df["ticker"].value_counts().head(25).rename_axis("ticker").reset_index(name="events")
    )
    by_year_quarter = (
        df.assign(year=df["event_date"].dt.year, quarter=df["event_date"].dt.quarter)
        .groupby(["year", "quarter"], dropna=False)
        .size()
        .reset_index(name="events")
        .sort_values(["year", "quarter"])
    )

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
        f.write("\n## Summary stats\n\n")
        f.write(f"- rows: {total_rows}\n")
        f.write(f"- unique tickers: {df['ticker'].nunique()}\n")
        f.write(f"- event_date range: {df['event_date'].min()} to {df['event_date'].max()}\n")
        f.write(f"- char_len median: {median_char_len:.0f}\n")
        f.write(f"- token_len median: {df['token_len'].median():.0f}\n")
        f.write("\n## Counts by ticker (top 25)\n\n")
        f.write(counts_by_ticker.to_markdown(index=False))
        f.write("\n\n## Counts by year and quarter\n\n")
        f.write(by_year_quarter.to_markdown(index=False))
        f.write("\n")


def run(config_path: str) -> None:
    config = read_yaml(config_path)
    transcripts_cfg = config["transcripts"]
    report_cfg = config["report"]

    input_path = transcripts_cfg["input_path"]
    raw_csv_path = transcripts_cfg["raw_csv_path"]
    output_path = transcripts_cfg["output_path"]
    source_name = transcripts_cfg["source_name"]
    min_median_char_len = int(transcripts_cfg.get("min_median_char_len", 5000))

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

    build_data_quality_report(
        df=processed,
        report_path=report_cfg["output_path"],
        min_median_char_len=min_median_char_len,
    )
    LOGGER.info("Saved quality report: %s", report_cfg["output_path"])


def main() -> None:
    parser = argparse.ArgumentParser(description="Run data ingestion and QC pipeline.")
    parser.add_argument("--config", default="configs/data.yaml", help="Path to data config YAML.")
    args = parser.parse_args()
    run(args.config)


if __name__ == "__main__":
    main()
