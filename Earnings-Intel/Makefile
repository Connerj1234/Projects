PYTHON ?= python3
TRANSCRIPTS_FALLBACK_PATH ?=
SEC_REQUEST_INTERVAL_SEC ?= 0.25
YF_MAX_RETRIES ?= 6
YF_BASE_DELAY_SEC ?= 1.0
YF_PAUSE_BETWEEN_TICKERS_SEC ?= 0.35
YF_PROVIDER ?= auto
FETCH_FALLBACK_ARG := $(if $(TRANSCRIPTS_FALLBACK_PATH),--fallback-path $(TRANSCRIPTS_FALLBACK_PATH),)

venv:
	$(PYTHON) -m venv .venv
	. .venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt

fetch:
	. .venv/bin/activate && PYTHONPATH=src python scripts/01_fetch_transcripts_fmp.py --tickers AAPL MSFT NVDA AMD AMZN GOOGL META TSLA --start-year 2019 --end-year 2025 --request-interval-sec $(SEC_REQUEST_INTERVAL_SEC) $(FETCH_FALLBACK_ARG)
	. .venv/bin/activate && PYTHONPATH=src python scripts/02_fetch_prices.py --tickers AAPL MSFT NVDA AMD AMZN GOOGL META TSLA --start-date 2018-01-01 --end-date 2026-01-31 --provider $(YF_PROVIDER) --max-retries $(YF_MAX_RETRIES) --base-delay-sec $(YF_BASE_DELAY_SEC) --pause-between-tickers-sec $(YF_PAUSE_BETWEEN_TICKERS_SEC)

features:
	. .venv/bin/activate && PYTHONPATH=src python scripts/03_build_features.py

backtest:
	. .venv/bin/activate && PYTHONPATH=src python scripts/04_backtest_event_study.py

index:
	. .venv/bin/activate && PYTHONPATH=src python scripts/05_build_retrieval_index.py

api:
	. .venv/bin/activate && PYTHONPATH=src uvicorn app.api:app --reload --port 8000

all: fetch features backtest index
