from __future__ import annotations

from pathlib import Path

import pandas as pd
from joblib import load
from scipy import sparse


def query(
    text: str,
    top_k: int = 5,
    chunks_path: str = "data/processed/chunks.parquet",
    index_dir: str = "data/processed/retrieval_index",
    ticker: str | None = None,
    year: int | None = None,
) -> list[dict[str, object]]:
    chunks = pd.read_parquet(chunks_path)
    if ticker:
        chunks = chunks[chunks["ticker"] == ticker.upper()].copy()
    if year:
        chunks = chunks[pd.to_datetime(chunks["event_date"]).dt.year == int(year)].copy()
    if chunks.empty:
        return []

    idx = Path(index_dir)
    X_all = sparse.load_npz(str(idx / "chunks_tfidf.npz")).tocsr()
    vec = load(str(idx / "vectorizer.joblib"))
    nn = load(str(idx / "nn.joblib"))

    # If filters are applied, run search on filtered submatrix.
    if ticker or year:
        row_idx = chunks.index.to_numpy()
        X = X_all[row_idx]
    else:
        row_idx = chunks.index.to_numpy()
        X = X_all

    q = vec.transform([text])
    # sklearn returns cosine distances; lower is better.
    dists, idxs = nn.kneighbors(q if not (ticker or year) else q, n_neighbors=min(top_k, X.shape[0]))

    # For filtered queries, refit a temporary NN on filtered X for correct indexing.
    if ticker or year:
        from sklearn.neighbors import NearestNeighbors

        local_nn = NearestNeighbors(metric="cosine", algorithm="brute")
        local_nn.fit(X)
        dists, idxs = local_nn.kneighbors(q, n_neighbors=min(top_k, X.shape[0]))
        source_rows = row_idx[idxs[0]]
    else:
        source_rows = idxs[0]

    results = []
    for dist, row in zip(dists[0], source_rows):
        rec = chunks.loc[row]
        results.append(
            {
                "score": float(1.0 - dist),
                "chunk_id": rec["chunk_id"],
                "doc_id": rec["doc_id"],
                "ticker": rec["ticker"],
                "event_date": rec["event_date"],
                "section": rec["section"],
                "chunk_text": rec["chunk_text"],
            }
        )
    return results
