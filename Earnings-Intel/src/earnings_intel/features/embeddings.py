from __future__ import annotations

import numpy as np
from scipy import sparse
from sklearn.decomposition import TruncatedSVD
from sklearn.preprocessing import Normalizer


def svd_embeddings(tfidf_matrix: sparse.csr_matrix, dim: int = 256, random_state: int = 42) -> np.ndarray:
    if tfidf_matrix.shape[0] == 0:
        return np.empty((0, dim), dtype=np.float32)

    max_dim = max(2, min(dim, tfidf_matrix.shape[1] - 1 if tfidf_matrix.shape[1] > 1 else 1))
    svd = TruncatedSVD(n_components=max_dim, random_state=random_state)
    emb = svd.fit_transform(tfidf_matrix)
    emb = Normalizer(copy=False).fit_transform(emb)
    return emb.astype(np.float32, copy=False)
