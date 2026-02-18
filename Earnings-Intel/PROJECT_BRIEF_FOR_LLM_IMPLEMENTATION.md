# Earnings Intelligence Platform - Implementation Gameplan (Codex Ready)

## 0) What you are building
An interview ready end to end Data Science product that turns earnings communication text into measurable signals, links them to post event market behavior, and exposes everything in a clean dashboard with a semantic search demo.

This file expands the original project brief into a step by step build plan with concrete data sources, scripts, artifacts, and acceptance checks for each phase.

## 1) Data strategy (solve the rate limit problem first)

### Primary path (recommended): static transcript corpus + free price history
Use a pre built transcript dataset (Kaggle) so the pipeline is not blocked by paywalls or scraping limits, then compute your own labels and build your own models.

Pick one dataset and commit to it:

Option A: Motley Fool scraped earnings call transcripts  
- High coverage across tickers and dates  
- Columns typically include ticker, date, quarter, and transcript text

Option B: AlphaSpread scraped earnings call transcripts (Top 50)  
- Smaller than A, easier to start  
- Still enough for a full modeling and dashboard story

Price data: Stooq daily OHLCV, accessed via CSV endpoints  
- Free, no API keys  
- Good enough for event study style labels

### Backup path (if you want to say you built ingestion too): SEC filings as the text source
If transcripts become messy, use 10 Q MD&A sections as the text. EDGAR is public, but you must respect fair access and cache aggressively.

You can keep the exact same downstream pipeline:
- text document per company per date
- event date = filing date
- label = abnormal return around filing

## 2) Target prediction tasks (you will train your own models)
You will build labels from prices and then train both interpretable baselines and stronger models.

Define two tasks:

Task 1: Direction classification  
- target_up = 1 if CAR(0, 1) > 0 else 0

Task 2: Magnitude regression  
- target_car = CAR(0, 1) in percent units, winsorized at p1 and p99

Where CAR is cumulative abnormal return relative to a benchmark.

Benchmark choices:
- SPY for US equities, or a sector ETF if you want a stronger story
- If you cannot map a sector, stick to SPY

## 3) Repository layout (create this structure)
.
- README.md
- pyproject.toml
- Makefile
- configs/
  - project.yaml
  - data.yaml
  - model.yaml
- data/
  - raw/
    - transcripts/
    - prices/
  - interim/
  - processed/
  - features/
- notebooks/
  - 01_data_qc.ipynb
  - 02_feature_sanity.ipynb
  - 03_modeling_report.ipynb
- src/
  - earnings_intel/
    - __init__.py
    - utils/
      - io.py
      - logging.py
      - dates.py
      - text.py
    - ingestion/
      - kaggle_transcripts.py
      - sec_filings.py
      - prices_stooq.py
    - cleaning/
      - transcripts_clean.py
      - prices_clean.py
    - labeling/
      - event_windows.py
      - abnormal_returns.py
    - features/
      - lexicons.py
      - sentiment.py
      - tfidf.py
      - embeddings.py
      - readability.py
    - modeling/
      - splits.py
      - baselines.py
      - train.py
      - evaluate.py
      - interpret.py
    - retrieval/
      - chunking.py
      - index.py
      - query.py
    - app/
      - streamlit_app.py
      - pages/
        - 01_overview.py
        - 02_data_quality.py
        - 03_feature_explorer.py
        - 04_model_results.py
        - 05_retrieval_demo.py
        - 06_limitations.py
- reports/
  - data_quality.md
  - feature_dictionary.md
  - model_card.md
  - demo_script.md
- models/
  - trained/

## 4) One command runs (Codex should implement these)
Goal: make the project runnable with a small set of commands that always rebuild consistent artifacts.

Make targets:
- make setup
- make data
- make features
- make train
- make retrieval
- make app
- make all

Each target should be idempotent and should skip work if artifacts are already present, unless a force flag is set in configs.

## 5) Phase 1: Data ingestion and normalization

### 5.1 Ingest transcripts (Kaggle path)
Input:
- Kaggle dataset files (CSV)

Output artifacts:
- data/raw/transcripts/transcripts_raw.csv
- data/processed/transcripts.parquet

Steps:
1. Load CSV(s)
2. Normalize schema to:
   - doc_id (stable hash)
   - ticker
   - event_date (earnings call date)
   - fiscal_year, fiscal_quarter (if available)
   - speaker_segments (optional)
   - full_text
   - source_name
3. Deduplicate by (ticker, event_date) keeping the longest text
4. Basic QC columns:
   - char_len
   - token_len
   - contains_forward_looking (heuristic)
5. Save parquet

Acceptance checks:
- at least 50 events after filtering
- no null tickers
- event_date parses for at least 95 percent of rows
- median char_len above a minimum (example 5,000)

### 5.2 Ingest prices (Stooq path)
Input:
- list of tickers from transcripts
- benchmark ticker (SPY recommended)

Output artifacts:
- data/raw/prices/{ticker}.csv
- data/processed/prices.parquet

Steps:
1. For each ticker, download daily OHLCV CSV from Stooq
2. Parse and standardize columns:
   - date, open, high, low, close, volume
3. Keep a single timezone naive date index
4. Save a combined parquet table partitioned by ticker

Acceptance checks:
- each ticker has at least 200 trading days of history around its events
- duplicates removed
- no future dates

### 5.3 Data coverage report
Generate:
- reports/data_quality.md
- figures used in the dashboard

Include:
- counts by ticker
- counts by year and quarter
- transcript length distribution
- percent of events with complete price coverage

## 6) Phase 2: Label construction (event study style)

### 6.1 Build event windows
For each (ticker, event_date):
- define trading day t0 as the first market day on or after event_date
- compute daily returns for ticker and benchmark
- compute abnormal return = r_ticker minus r_benchmark

### 6.2 Compute labels
Compute:
- AR_0, AR_1
- CAR_0_1 = AR_0 + AR_1
- optional CAR_m1_1 for robustness

Output artifacts:
- data/processed/event_returns.parquet

Acceptance checks:
- label coverage above 80 percent of transcript events
- winsorization applied and logged
- clear note in report that this is not causal

## 7) Phase 3: Feature engineering

### 7.1 Interpretable engineered features
Create a feature dictionary in reports/feature_dictionary.md.

Features (minimum set):
- length: tokens, sentences
- readability: Flesch style proxies, average sentence length
- uncertainty and risk: lexicon ratio
- positivity and negativity: sentiment scores
- numbers density: count of numeric tokens
- Q and A vs prepared remarks split if available

### 7.2 Text vector features
Create two representations:
1. TF IDF with max_features (example 20k)  
2. Embeddings using a compact sentence transformer model

Store:
- data/features/features_tabular.parquet
- data/features/features_text.npz (sparse)
- data/features/embeddings.npy

Acceptance checks:
- no feature leakage from future data
- consistent feature shapes across train and test splits

## 8) Phase 4: Modeling and evaluation (senior level)

### 8.1 Splits (time aware)
Use a time based split:
- train: earliest 70 percent by event_date
- validation: next 15 percent
- test: latest 15 percent

Also add a rolling backtest option:
- expanding window training, fixed horizon evaluation

### 8.2 Baselines
Classification:
- majority class
- logistic regression on TF IDF
- logistic regression on engineered features

Regression:
- mean predictor
- ridge regression on TF IDF
- elastic net on engineered features

### 8.3 Primary models
Pick at least two:
- gradient boosted trees on engineered features
- linear model on embeddings
- hybrid model that stacks engineered features with embedding PCA components

### 8.4 Metrics
Classification:
- AUC
- accuracy
- calibration curve and Brier score

Regression:
- MAE
- R2
- Spearman correlation between predicted and realized CAR

Also include:
- confidence intervals via bootstrap on test set
- sensitivity analysis for different event windows

Output artifacts:
- models/trained/{model_name}.pkl
- reports/model_card.md
- data/processed/predictions.parquet

Acceptance checks:
- baselines run end to end
- primary model beats baseline on at least one key metric without overclaiming
- evaluation includes uncertainty and limitations

### 8.5 Interpretability
Provide:
- permutation importance
- SHAP for tree models (optional)
- example explanations for 3 events with top contributing features

## 9) Phase 5: Retrieval layer (semantic search)

### 9.1 Chunking
Chunk each transcript into passages:
- chunk size around 200 to 400 tokens
- overlap around 50 tokens
- attach metadata: doc_id, ticker, event_date, section

### 9.2 Index
Use FAISS (local) or Chroma (local persistent) and store:
- data/processed/retrieval_index/
- data/processed/chunks.parquet

### 9.3 Query API
Implement a function:
query(text, top_k) -> list of passages with scores and metadata

Acceptance checks:
- basic qualitative tests in a notebook
- retrieval is not dominated by boilerplate, apply filters

## 10) Phase 6: Dashboard and product story (Streamlit)

### Pages and required visuals

1. Overview
- architecture diagram (simple)
- end to end flow
- what questions the product answers

2. Data quality
- coverage heatmap by ticker x quarter
- transcript length distributions
- label coverage

3. Feature explorer
- feature distributions
- correlations with CAR
- per ticker comparisons
- example transcript snippets with highlighted terms

4. Model results
- leaderboard table for models
- calibration plot for classification
- prediction error plot for regression
- feature importance and example explanations

5. Retrieval demo
- search box
- show top passages with metadata
- add filters by ticker and year

6. Limitations and roadmap
- non causality caveat
- survivorship and coverage caveats
- planned improvements (more tickers, better event alignment, fine tuned models)

Acceptance checks:
- app runs locally
- all plots load from saved artifacts, not from recomputing
- each page contains narrative text suitable for an interview walkthrough

## 11) Interview narrative (what to highlight)
Make sure the final README and demo script cover:
- how you designed a reproducible pipeline with clear artifacts
- how you constructed labels with an event study approach
- why you chose specific features and models
- how you avoided leakage with time splits
- how you evaluated honestly with uncertainty
- how the retrieval layer complements the predictive modeling
- what you would do next with better data access

## 12) Concrete implementation checklist (Codex should execute in order)

Step 1: Project bootstrap
- create repo layout
- add pyproject with pinned deps
- add Makefile targets that call python modules

Step 2: Data ingestion
- implement kaggle_transcripts ingestion and cleaning
- implement stooq price downloader with caching

Step 3: Coverage and QC
- implement reports/data_quality.md generator
- implement notebook 01_data_qc.ipynb

Step 4: Labels
- implement abnormal return calculator
- create event_returns.parquet

Step 5: Features
- implement engineered features and dictionaries
- implement tfidf and embeddings pipeline

Step 6: Models
- implement time splits
- run baselines
- run primary models
- write model_card.md

Step 7: Retrieval
- implement chunking
- build vector index
- implement query function

Step 8: App
- implement Streamlit pages and navigation
- load artifacts only

Step 9: Final polish
- add demo_script.md
- ensure make all runs from scratch
- add screenshots or a short gif for README

## 13) Notes on data compliance and robustness
- If using EDGAR, respect the SEC fair access request rate and include a descriptive User Agent header.
- Cache all downloaded content and never refetch the same filing or price series during normal runs.
- Prefer static datasets for transcripts to avoid brittle scrapers.

