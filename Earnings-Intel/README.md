# Earnings Intelligence

End-to-end project for transcript-based earnings intelligence using earnings-call text and post-event market behavior.

## Project brief

Implementation target: `PROJECT_BRIEF_FOR_LLM_IMPLEMENTATION.md`.

## Current implementation status

Implemented:
- Repository scaffold (configs, package layout, reports/models/data folders)
- Transcript ingestion pipeline from local Hugging Face export
- Schema normalization and deduplication by `(ticker, event_date)` with longest transcript retained
- Data QC checks and markdown report generation

Not implemented yet:
- Price ingestion (Stooq)
- Label construction (event-study abnormal returns)
- Features, modeling, retrieval index, Streamlit app pages

## Commands

```bash
make setup
make data
make all
```

Command behavior today:
- `make setup`: installs package in editable mode
- `make data`: runs transcript ingestion/normalization + QC report
- `make all`: currently runs `data` and placeholder targets for later phases

## Input data expectations

Current data pipeline expects:
- `data/raw/transcripts/sp500_transcripts.parquet`
- Source schema compatible with `Bose345/sp500_earnings_transcripts`:
  - `symbol`, `quarter`, `year`, `date`, `content`, `structured_content`

If needed, regenerate input from Hugging Face:

```bash
python scripts/download_dataset.py
```

## Outputs from `make data`

- `data/raw/transcripts/transcripts_raw.csv`
- `data/processed/transcripts.parquet`
- `reports/data_quality.md`

## Data quality checks (implemented)

- At least 50 events
- No null tickers
- `event_date` parse rate >= 95%
- Median transcript length above configured threshold (`configs/data.yaml`)
