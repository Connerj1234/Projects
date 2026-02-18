# Earnings Call Intelligence (Senior DS Portfolio Project)

This project builds an end-to-end pipeline that:
1. Ingests earnings call transcripts
2. Extracts NLP-based risk/opportunity signals
3. Runs an event-study backtest against benchmark-adjusted returns
4. Builds semantic retrieval over transcript chunks
5. Serves retrieval results via a small API

## Why this reads as senior-level
- Time-aware market evaluation (event windows, abnormal returns)
- Robust regression with interpretable NLP factors
- Reproducible ETL -> feature engineering -> modeling -> retrieval pipeline
- Productized output (query API + artifacts)

## Software stack
- Python 3.11+
- pandas, numpy, scikit-learn, statsmodels
- VaderSentiment for lightweight sentiment
- sentence-transformers for semantic embeddings
- yfinance for price history
- FastAPI + uvicorn for retrieval API

## Project layout
```
projects/earnings-intel/
  app/api.py
  data/
    raw/transcripts/
    raw/prices/
    processed/
  docs/
  models/
  notebooks/
  scripts/
    01_fetch_transcripts_fmp.py
    02_fetch_prices.py
    03_build_features.py
    04_backtest_event_study.py
    05_build_retrieval_index.py
    06_query_retrieval.py
  src/earnings_intel/
    event_study.py
    io_utils.py
    retrieval.py
    text_features.py
  vectorstore/
  .env.example
  requirements.txt
  Makefile
```

## Data sources
### 1) Earnings call transcripts (primary)
- Source: Financial Modeling Prep earnings call transcript endpoint
- URL docs: [https://site.financialmodelingprep.com/developer/docs](https://site.financialmodelingprep.com/developer/docs)
- You need an API key in `.env`:
  - `FMP_API_KEY=...`

### 2) Price data for event windows
- Source: Yahoo Finance (via `yfinance` package)
- Includes ticker history + benchmark (`SPY` default)

### 3) Optional extensions for stronger final report
- SEC 10-Q/10-K from EDGAR for cross-source validation
- Sector labels (GICS or free alternatives) for subgroup robustness tests

## Setup
From `/Users/connerjamison/GitHub/Portfolio-Website/projects/earnings-intel`:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r requirements.txt
cp .env.example .env
# Fill FMP_API_KEY in .env
```

## Run pipeline
```bash
source .venv/bin/activate
cd /Users/connerjamison/GitHub/Portfolio-Website/projects/earnings-intel

PYTHONPATH=src python scripts/01_fetch_transcripts_fmp.py --tickers AAPL MSFT NVDA AMD AMZN GOOGL META TSLA --start-year 2019 --end-year 2025
PYTHONPATH=src python scripts/02_fetch_prices.py --tickers AAPL MSFT NVDA AMD AMZN GOOGL META TSLA --start-date 2018-01-01 --end-date 2026-01-31
PYTHONPATH=src python scripts/03_build_features.py
PYTHONPATH=src python scripts/04_backtest_event_study.py
PYTHONPATH=src python scripts/05_build_retrieval_index.py
```

## Query retrieval
```bash
PYTHONPATH=src python scripts/06_query_retrieval.py --query "supply chain risk and demand visibility" --top-k 5
```

## Run API
```bash
uvicorn app.api:app --reload --port 8000
```
Test:
```bash
curl -X POST http://127.0.0.1:8000/search \
  -H "Content-Type: application/json" \
  -d '{"query":"AI infrastructure demand", "top_k":3}'
```

## Outputs you will get
- `data/raw/transcripts/fmp_transcripts.parquet`
- `data/raw/prices/daily_prices.parquet`
- `data/processed/transcript_features.parquet`
- `data/processed/event_level_dataset.parquet`
- `models/backtest_summary.txt`
- `vectorstore/transcript_index.joblib`

## How to use results in portfolio
### Repo highlights
- Add architecture diagram (ETL -> NLP features -> event study -> retrieval API)
- Include 1 notebook that visualizes factor distributions and top coefficients
- Include a short model-risk section (coverage bias, transcript quality, non-causal interpretation)

### Resume bullet drafts
- Built an end-to-end earnings-call intelligence pipeline across 8 mega-cap tickers (2019-2025), extracting interpretable NLP risk/opportunity features and benchmarking market impact via event-study abnormal returns.
- Designed a semantic retrieval system over transcript chunks with sentence-transformer embeddings and exposed search functionality through a FastAPI service for analyst-facing exploration.
- Implemented robust OLS backtests (HC3 errors) and produced reproducible artifacts for signal validation, error analysis, and portfolio-ready reporting.

## Suggested next upgrades (to push it further)
1. Add speaker-level segmentation (management vs analyst Q&A) and tone-gap features.
2. Add walk-forward validation by year to test signal stability.
3. Add a simple dashboard (Streamlit) for retrieval + factor charts.
4. Add a small CI workflow to run feature/backtest scripts on sample data.

## Notes and caveats
- This is an educational/research pipeline, not investment advice.
- FMP data coverage may vary by ticker and historical depth.
- Abnormal return associations are not causal claims.
