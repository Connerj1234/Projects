# Earnings-Intel Project Summary

## What This Project Is
This repository is an end-to-end research pipeline that turns earnings-call language into:
- quantitative text features,
- event-level return outcomes,
- and a semantic search product over transcript content.

It is designed as a portfolio project that shows data engineering, NLP feature design, market-event analysis, and lightweight API productization.

## What the Pipeline Does
1. Ingest transcript text (`scripts/01_fetch_transcripts_fmp.py`)
- Pulls transcript-like text from SEC EDGAR filings (8-K/6-K scanning) with compliance controls.
- Supports local fallback transcript files when coverage is sparse.

2. Ingest market prices (`scripts/02_fetch_prices.py`)
- Pulls daily prices for target tickers + benchmark (`SPY`).
- Uses Yahoo Finance first, then Stooq fallback for rate-limit resilience.

3. Build NLP features (`scripts/03_build_features.py`)
- Extracts sentiment, risk/opportunity ratios, word-volume metrics.
- Adds unsupervised topic exposures (NMF).

4. Build event-study dataset + backtest summary (`scripts/04_backtest_event_study.py`)
- Computes abnormal returns (+1d, +5d) relative to market benchmark.
- Produces regression or fallback descriptive summary (if dependency issues occur).

5. Build retrieval index (`scripts/05_build_retrieval_index.py`)
- Chunks transcript text, encodes embeddings, and saves vector artifacts.

6. Query retrieval (`scripts/06_query_retrieval.py` or API)
- Returns top-k transcript passages relevant to analyst-style natural-language queries.

## Current End Outputs
- `/Users/connerjamison/GitHub/Projects/Earnings-Intel/data/processed/transcript_features.parquet`
- `/Users/connerjamison/GitHub/Projects/Earnings-Intel/data/processed/event_level_dataset.parquet`
- `/Users/connerjamison/GitHub/Projects/Earnings-Intel/models/backtest_summary.txt`
- `/Users/connerjamison/GitHub/Projects/Earnings-Intel/vectorstore/transcript_index.joblib`
- API endpoint: `POST /search`

## How to Interpret the Current Run
- Your pipeline is functioning end-to-end.
- Retrieval works and returns relevant chunks.
- Main limitation is **coverage**: current transcript count is small, so statistical inference is weak and retrieval may over-focus on boilerplate text.

## Next Step (Most Important)
Increase transcript/event coverage before further model tuning.

Target:
- At least 50-100 event rows across more quarters and/or more tickers.

Why:
- Better statistical power for backtest coefficients.
- Better topic quality and retrieval diversity.
- More credible portfolio narrative.

## Practical Execution Plan
1. Expand transcript source coverage
- Add a larger fallback transcript dataset (CSV/Parquet with `ticker,date,year,quarter,content`).
- Keep SEC ingestion for compliance and reproducibility.

2. Re-run full pipeline
- `make fetch YF_PROVIDER=stooq`
- `make features`
- `make backtest`
- `make index`

3. Validate quality
- Check event row count in `event_level_dataset.parquet`.
- Re-run retrieval queries and confirm results are not dominated by disclaimer boilerplate.

4. Final portfolio packaging
- Include architecture diagram, key findings, limitations, and next-iteration plan in README/notebook.

## One-Sentence Project Pitch
Built a production-style earnings intelligence pipeline that transforms unstructured call language into interpretable risk signals, links those signals to abnormal returns, and exposes semantic transcript search through an API.
