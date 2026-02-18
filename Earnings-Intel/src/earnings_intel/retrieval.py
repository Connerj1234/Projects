from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import joblib
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


@dataclass
class RetrievalArtifacts:
    embeddings: np.ndarray
    metadata: list[dict]


def encode_texts(texts: list[str]) -> np.ndarray:
    model = SentenceTransformer(MODEL_NAME)
    return model.encode(texts, show_progress_bar=True, normalize_embeddings=True)


def save_artifacts(path: Path, embeddings: np.ndarray, metadata: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"embeddings": embeddings, "metadata": metadata}, path)


def load_artifacts(path: Path) -> RetrievalArtifacts:
    data = joblib.load(path)
    return RetrievalArtifacts(embeddings=data["embeddings"], metadata=data["metadata"])


def search(path: Path, query: str, top_k: int = 5) -> list[dict]:
    artifacts = load_artifacts(path)
    model = SentenceTransformer(MODEL_NAME)
    q = model.encode([query], normalize_embeddings=True)
    sims = cosine_similarity(q, artifacts.embeddings)[0]
    order = np.argsort(-sims)[:top_k]

    results = []
    for i in order:
        row = dict(artifacts.metadata[i])
        row["score"] = float(sims[i])
        results.append(row)
    return results
