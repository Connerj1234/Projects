# Earnings Intelligence

## Project Overview

Earnings Intelligence is an end-to-end data science and product system that converts earnings-call language into measurable signals, links those signals to post-event market behavior, and exposes the results in a custom web dashboard with semantic transcript search.

Core question:
- Can earnings communication help explain short-horizon abnormal returns after earnings events?

This repository is designed as a reproducible research-and-product workflow, not a single notebook experiment.

## Why This Project Exists

This project is built to demonstrate practical, senior-level data science execution:
- Robust data pipelines with explicit artifacts
- Transparent label construction using an event-study framework
- Time-aware modeling to reduce leakage
- Honest evaluation with uncertainty and limitations
- A user-facing product layer (custom web UI + retrieval demo)

## Product Goals

The system targets two complementary outcomes:
- Predictive: estimate post-event direction and magnitude of abnormal return
- Exploratory: retrieve relevant transcript passages for analyst-style questions

Together, these support both quantitative modeling and qualitative interpretation.

## Data Strategy

### Primary path used
- Transcript source: Hugging Face `Bose345/sp500_earnings_transcripts`
- Price source: Stooq daily OHLCV
- Benchmark: SPY

Rationale:
- Transcript dataset avoids brittle scraping and paywall/API bottlenecks
- Stooq provides free daily price history sufficient for event-study labels

### Backup path (design intent)
- SEC filings (10-Q MD&A sections) can be used as text source with same downstream pipeline
- Event date becomes filing date
- Label construction remains abnormal-return based

## Prediction Tasks

Two supervised tasks are defined from market-based labels:

1. Direction classification
- `target_up = 1 if CAR(0,1) > 0 else 0`

2. Magnitude regression
- `target_car = winsorized CAR(0,1)`

Where:
- `AR_t = r_stock_t - r_benchmark_t`
- `CAR(0,1) = AR_0 + AR_1`

## Methodology: How We Test Whether Language Is Informative

The signal test is explicit:

1. Build event-study outcomes from stock prices  
2. Build language features from transcripts  
3. Train models to predict price-derived targets  
4. Evaluate on future time periods only (chronological split)  

Interpretation:
- If out-of-sample metrics materially beat naive baselines, language carries predictive signal
- If metrics remain near baseline, language-only signal is weak for the chosen horizon/label

## System Architecture

### Pipeline architecture
- `src/earnings_intel/ingestion`: source loading and downloads
- `src/earnings_intel/cleaning`: dataset cleanup
- `src/earnings_intel/labeling`: event windows and abnormal returns
- `src/earnings_intel/features`: engineered/text/embedding features
- `src/earnings_intel/modeling`: splits, baselines, evaluation
- `src/earnings_intel/retrieval`: chunking, indexing, query API
- `src/earnings_intel/pipelines`: runnable phase entrypoints

### Artifact architecture
- `data/raw`: source copies and cached downloads
- `data/processed`: normalized and modeled intermediate outputs
- `data/features`: model-ready feature artifacts
- `reports`: QC, feature docs, model card
- `models/trained`: serialized trained models/vectorizers
- `web`: custom HTML/CSS/JS product UI + exported JSON assets

## Phase-by-Phase Implementation

## Phase 1: Transcript ingestion and normalization

Implemented outputs:
- `data/raw/transcripts/transcripts_raw.csv`
- `data/processed/transcripts.parquet`

Processing:
- Schema normalization to stable fields (`doc_id`, `ticker`, `event_date`, text, metadata)
- Deduplication by `(ticker, event_date)` with longest transcript retained
- QC fields: length, token count, forward-looking heuristic

Acceptance checks:
- Minimum event count
- No null tickers
- Date parse ratio threshold
- Minimum transcript-length threshold

## Phase 2: Prices and label construction

Implemented outputs:
- `data/raw/prices/{ticker}.csv`
- `data/processed/prices.parquet`
- `data/processed/event_returns.parquet`

Processing:
- Stooq download + caching
- Return and abnormal-return computation
- Event alignment to first trading day on/after event date
- Label derivation for classification and regression tasks

Acceptance checks:
- Adequate price history around events
- Label coverage threshold
- Winsorization applied for regression target

## Phase 3: Feature engineering

Implemented outputs:
- `data/features/features_tabular.parquet`
- `data/features/features_text.npz`
- `data/features/embeddings.npy`
- `reports/feature_dictionary.md`

Feature families:
- Interpretable engineered features:
  - length/readability
  - sentiment and uncertainty/risk lexicons
  - numeric density
  - Q&A ratio heuristic
- Text representation:
  - TF-IDF sparse vectors
- Dense representation:
  - SVD-based embeddings over TF-IDF

## Phase 4: Modeling and evaluation

Implemented outputs:
- `models/trained/*.joblib`
- `data/processed/predictions.parquet`
- `reports/model_card.md`

Baselines implemented:
- Classification:
  - majority class
  - logistic regression (TF-IDF)
  - logistic regression (tabular)
- Regression:
  - mean predictor
  - ridge regression (TF-IDF)
  - elastic net (tabular)

Evaluation:
- Time-based split: 70/15/15
- Classification metrics: AUC, accuracy, Brier
- Regression metrics: MAE, R2, Spearman
- Test-set bootstrap confidence intervals

## Phase 5: Retrieval layer

Implemented outputs:
- `data/processed/chunks.parquet`
- `data/processed/retrieval_index/`

Processing:
- Transcript chunking with overlap and metadata (`doc_id`, `ticker`, `event_date`, `section`)
- Local TF-IDF + nearest-neighbor index
- Query API returning scored passages

## Phase 6: Product UI (custom webpage)

Implemented outputs:
- `web/index.html`
- `web/styles.css`
- `web/app.js`
- `web/data/*.json` (exported from pipeline artifacts)

UI sections:
- Coverage and data summaries
- Feature and model result charts
- Retrieval demo
- Key findings section summarizing actual outcomes

## Current Results and What They Mean

From the current run:
- Transcript scale: 33,359 rows
- Labeled events used for modeling: 3,633
- Label coverage in configured subset: ~91%

Model outcomes:
- Best classification baseline AUC is near random (~0.51)
- Regression baselines show low lift (R2 near zero/negative)

Interpretation:
- In this configuration (`CAR(0,1)`, baseline models, current features), transcript language alone shows limited short-horizon predictive edge
- Retrieval is still practically useful for qualitative analysis and narrative evidence lookup

## What This Project Demonstrates

Even with modest predictive performance, this repository demonstrates:
- Complete pipeline execution from raw text to market-linked evaluation
- Reproducible artifact-oriented workflow
- Honest, leakage-aware modeling/evaluation
- Productization of outputs through a user-facing interface

## Limitations

- Label is event-study based and not causal
- Short-horizon returns are noisy and difficult to predict
- Partial ticker coverage due to market data symbol/download limits
- Current models are baseline-focused; stronger models are planned
- Retrieval ranking is lexical-semantic hybrid and can be improved

## Roadmap

Planned next improvements:
- Stronger primary models (GBM, embedding-linear hybrids, stacked models)
- Additional event windows and sensitivity analysis
- Better ticker mapping/coverage and robustness checks
- Retrieval relevance tuning and richer filtering
- Web UI narrative polish and demo-script alignment

## Interview Narrative (Suggested Story)

1. Problem framing:
- Estimate post-earnings response from communication signals

2. Data and labeling:
- Explain transcript normalization and event-study label construction

3. Leakage control:
- Emphasize chronological split and artifact reproducibility

4. Results:
- Report weak baseline signal honestly and quantify uncertainty

5. Product value:
- Show retrieval and dashboard utility for analyst workflows

6. Next iteration:
- Outline concrete model/data upgrades to seek stronger lift

## Knowledge Base Scope

This README is the primary project knowledge base:
- what the project is
- why it exists
- how it works
- what was implemented
- what results were observed
- what comes next

Operational progress tracking remains in:
- `PROJECT_STATUS.md`

## Minimal Command Reference

```bash
make setup
make data
make features
make train
make retrieval
make app
```

To view the webpage:

```bash
cd web
python -m http.server 8000
```
