PYTHON ?= python

.PHONY: setup data features train retrieval app all

setup:
	$(PYTHON) -m pip install -e .

data:
	PYTHONPATH=src $(PYTHON) -m earnings_intel.pipelines.data --config configs/data.yaml

features:
	PYTHONPATH=src $(PYTHON) -m earnings_intel.pipelines.features --config configs/features.yaml

train:
	PYTHONPATH=src $(PYTHON) -m earnings_intel.modeling.train --config configs/model.yaml

retrieval:
	PYTHONPATH=src $(PYTHON) -m earnings_intel.pipelines.retrieval --config configs/retrieval.yaml

app:
	PYTHONPATH=src $(PYTHON) -m earnings_intel.pipelines.web_assets --config configs/web.yaml
	@echo "Web assets built in web/data"
	@echo "Run: cd web && python -m http.server 8000"

all: data features train retrieval
