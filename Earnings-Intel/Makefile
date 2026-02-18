PYTHON ?= python

.PHONY: setup data features train retrieval app all

setup:
	$(PYTHON) -m pip install -e .

data:
	PYTHONPATH=src $(PYTHON) -m earnings_intel.pipelines.data --config configs/data.yaml

features:
	@echo "Not implemented yet: features pipeline."

train:
	@echo "Not implemented yet: training pipeline."

retrieval:
	@echo "Not implemented yet: retrieval pipeline."

app:
	@echo "Not implemented yet: streamlit app."

all: data features train retrieval
