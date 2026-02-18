from __future__ import annotations

from pathlib import Path
import sys

from fastapi import FastAPI
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT / "src"))

from earnings_intel.retrieval import search  # noqa: E402

INDEX_PATH = ROOT / "vectorstore" / "transcript_index.joblib"

app = FastAPI(title="Earnings Call Intelligence API", version="0.1.0")


class QueryPayload(BaseModel):
    query: str
    top_k: int = 5


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/search")
def semantic_search(payload: QueryPayload) -> dict:
    results = search(INDEX_PATH, payload.query, top_k=payload.top_k)
    return {"count": len(results), "results": results}
