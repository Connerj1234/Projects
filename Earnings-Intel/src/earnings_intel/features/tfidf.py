from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import sparse
from sklearn.feature_extraction.text import TfidfVectorizer


@dataclass
class TfidfArtifacts:
    matrix: sparse.csr_matrix
    vectorizer: TfidfVectorizer


def build_tfidf(texts: list[str], max_features: int = 20000, min_df: int = 3) -> TfidfArtifacts:
    vec = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2),
        max_features=max_features,
        min_df=min_df,
        dtype=np.float32,
    )
    mat = vec.fit_transform(texts)
    return TfidfArtifacts(matrix=mat.tocsr(), vectorizer=vec)
