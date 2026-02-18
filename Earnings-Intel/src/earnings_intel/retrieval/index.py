from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from joblib import dump
from scipy import sparse
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors

from earnings_intel.utils.io import ensure_parent


@dataclass
class RetrievalIndexArtifacts:
    matrix_path: str
    vectorizer_path: str
    nn_path: str


def build_retrieval_index(
    texts: list[str],
    index_dir: str,
    max_features: int = 30000,
) -> RetrievalIndexArtifacts:
    vec = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2),
        min_df=2,
        max_features=max_features,
    )
    X = vec.fit_transform(texts).tocsr()
    nn = NearestNeighbors(metric="cosine", algorithm="brute")
    nn.fit(X)

    idx = Path(index_dir)
    idx.mkdir(parents=True, exist_ok=True)
    matrix_path = str(idx / "chunks_tfidf.npz")
    vectorizer_path = str(idx / "vectorizer.joblib")
    nn_path = str(idx / "nn.joblib")
    ensure_parent(matrix_path)
    sparse.save_npz(matrix_path, X, compressed=True)
    dump(vec, vectorizer_path)
    dump(nn, nn_path)
    return RetrievalIndexArtifacts(
        matrix_path=matrix_path,
        vectorizer_path=vectorizer_path,
        nn_path=nn_path,
    )
