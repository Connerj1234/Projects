# Earnings Intelligence Platform - Project Brief (Clean Restart)

## 1) Project Intent
Build an interview-ready, end-to-end Data Science product that:
- ingests and cleans earnings-related text + market data,
- engineers interpretable NLP features,
- evaluates relationships to post-earnings market behavior,
- supports semantic retrieval over earnings content,
- and presents results in a polished, interactive dashboard/UI.

This should showcase the full lifecycle: **data collection -> cleaning -> feature engineering -> modeling -> evaluation -> visualization -> product interface**.

---

## 2) Problem Statement
Investors and analysts struggle to systematically convert earnings-call language into measurable signals and practical insights.  
The goal is to build a reproducible pipeline that:
1. Extracts linguistic signals from earnings communications.
2. Links those signals to market reaction windows.
3. Enables fast exploratory search of transcript content.
4. Surfaces all outputs in a clear, interactive app.

---

## 3) Target Outcomes
By completion, the project should produce:

1. **Reliable datasets**
- Transcript-level dataset (cleaned and normalized)
- Price dataset (ticker + benchmark)
- Feature dataset (text-derived metrics + topics)
- Event-level dataset (abnormal return outcomes)

2. **Modeling outputs**
- Baseline and primary model results
- Robustness checks and validation
- Interpretable findings + limitations

3. **Retrieval outputs**
- Chunked transcript index
- Queryable semantic search with ranked snippets

4. **Product output**
- Interactive dashboard/web app that explains:
  - data coverage and quality,
  - feature behavior,
  - modeling results,
  - retrieval examples,
  - caveats and next steps.

---

## 4) Scope (What to Build)

### A) Data Ingestion
- Pull transcript text from compliant/free sources (or approved fallback dataset).
- Pull daily price history for analysis tickers + benchmark.
- Track source provenance and ingestion metadata.

### B) Data Cleaning + Normalization
- Standardize schema (`ticker`, `date`, `year`, `quarter`, `content`, etc.).
- Remove duplicates, null-heavy rows, malformed dates.
- Add quality checks (coverage by ticker/year, text length checks).

### C) Feature Engineering
- Core textual features:
  - sentiment (pos/neg/compound),
  - risk/opportunity lexicon ratios,
  - text volume/complexity proxies,
  - optional topic factors (NMF/LDA/embeddings-derived dimensions).
- Document each feature and expected interpretation.

### D) Event-Study / Modeling
- Construct event windows around earnings dates.
- Compute abnormal returns vs benchmark.
- Train/evaluate explanatory or predictive models with guardrails:
  - minimum sample checks,
  - time-aware split/validation,
  - baseline comparison,
  - uncertainty reporting.

### E) Retrieval Layer
- Chunk transcript text and build vector index.
- Support natural-language query -> ranked passages.
- Include metadata in results (ticker/date/quarter/source).

### F) Dashboard/UI
- Build an interview-friendly, interactive app that includes:
  1. Project overview + architecture
  2. Data coverage and quality
  3. Feature exploration
  4. Backtest/model results
  5. Retrieval search demo
  6. Limitations + roadmap

---

## 5) Non-Functional Requirements
- Reproducible local run via simple commands (`make` or equivalent).
- Modular code structure (ingestion, features, modeling, retrieval, app).
- Clear artifact paths for generated outputs.
- Logging and actionable error messages.
- Compliance-conscious ingestion (rate limiting, terms-aware usage, source attribution).

---

## 6) Success Criteria (Definition of Done)
Project is considered complete when all are true:

1. **Pipeline reliability**
- End-to-end run succeeds from raw ingestion to app-ready artifacts.

2. **Coverage sufficiency**
- Enough transcript/event observations for credible analysis (target: >= 50-100 events minimum).

3. **Modeling credibility**
- Includes validation strategy, uncertainty context, and non-causal caveats.

4. **Retrieval quality**
- Returned snippets are materially relevant (not dominated by generic boilerplate).

5. **UI quality**
- App is interactive, coherent, and supports interview storytelling.

6. **Portfolio readiness**
- README + summary clearly explain business problem, methods, findings, and limitations.

---

## 7) Risks and Mitigations
- **Low transcript coverage** -> use broader ticker universe and/or approved fallback corpus.
- **Provider throttling/outages** -> multi-source ingestion + retries + caching.
- **Small-sample overclaiming** -> explicit thresholds and caution labels.
- **Boilerplate contamination in retrieval/features** -> boilerplate filters + de-duplication.
- **Dependency instability** -> pinned versions and environment lockfile.

---

## 8) Suggested Build Phases

### Phase 1: Core Data Backbone
- Implement ingestion + normalization + coverage audit.
- Produce stable raw/processed tables.

### Phase 2: Feature + Modeling Engine
- Engineer text features.
- Build event dataset and baseline/primary models.
- Add validation and robustness outputs.

### Phase 3: Retrieval System
- Build chunking + embeddings + vector index.
- Add query script/API endpoint.

### Phase 4: Dashboard/Product Layer
- Build UI pages for coverage, features, modeling, and retrieval.
- Add narrative framing for interview walkthroughs.

### Phase 5: Final Polish
- Tighten documentation, architecture diagram, and demo script.
- Validate clean run on fresh environment.

---

## 9) Deliverables Checklist
- [ ] Reproducible ingestion scripts
- [ ] Data quality/coverage audit report
- [ ] Feature engineering pipeline + feature dictionary
- [ ] Event-study/modeling report with validation
- [ ] Retrieval index + query interface
- [ ] Dashboard/UI with interactive views
- [ ] Portfolio-grade README + project summary

---

## 10) Instruction for the Next LLM
Treat this as a greenfield rebuild.  
Prioritize **correctness, reproducibility, and credibility** over speed.  
Implement in phases, with passing checks and clear artifacts at each stage.  
Do not skip evaluation rigor or documentation quality.
