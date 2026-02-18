# Earnings Intelligence

Earnings Intelligence is an end-to-end data science product that turns earnings communication text into measurable signals, links those signals to post-event market behavior, and exposes outputs in a dashboard and semantic retrieval workflow.

## Why this project

The goal is to demonstrate production-style data science:
- Reproducible pipelines with deterministic artifacts
- Transparent labeling using an event-study framework
- Time-aware evaluation to reduce leakage risk
- A product layer (dashboard + retrieval) on top of modeling

## What it does

1. Ingest and normalize earnings transcript text.
2. Join event dates to market data to build return labels.
3. Engineer interpretable and text-native features.
4. Train baseline and primary models for direction and magnitude tasks.
5. Provide semantic passage search over transcript chunks.
6. Serve results through a custom HTML/CSS/JS web dashboard.

## Architecture

- Pipeline code lives in `src/earnings_intel/`
- Configs live in `configs/`
- Artifacts are written to `data/`, `reports/`, and `models/`
- Orchestration is done through `Makefile` targets

## Data sources

- Transcript corpus: Hugging Face dataset `Bose345/sp500_earnings_transcripts`
- Price data source: Stooq daily OHLCV
- Benchmark target: SPY (configurable)

## Repository layout

Core folders:
- `src/earnings_intel/` for ingestion, cleaning, labeling, features, modeling, retrieval, and app code
- `configs/` for project/data/model config
- `data/` for raw/interim/processed/features
- `reports/` for QC and model documentation
- `models/trained/` for serialized models

## Running

```bash
make setup
make data
make features
make train
make retrieval
make app
make all
```

- `make setup` installs the package in editable mode
- `make data` runs transcript ingestion, price ingestion, label generation, and QC reporting
- `make features` builds tabular/text/embedding feature artifacts
- `make train` runs baseline modeling, evaluation, and writes predictions/model card
- `make retrieval` builds transcript chunks and a local semantic index
- `make app` exports compact JSON assets for the custom webpage in `web/`
- `make all` is the full workflow entry point (expands as phases are implemented)

To run the webpage locally:

```bash
cd web
python -m http.server 8000
```

## Implementation brief

The detailed build plan and acceptance criteria are defined in:
- `PROJECT_BRIEF_FOR_LLM_IMPLEMENTATION.md`

## Project tracking

Execution status, completed steps, current work, and next steps are tracked separately in:
- `PROJECT_STATUS.md`
