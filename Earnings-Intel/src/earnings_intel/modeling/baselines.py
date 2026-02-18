from __future__ import annotations

import numpy as np
from scipy import sparse
from sklearn.linear_model import ElasticNet, LogisticRegression, Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


class MajorityClassifier:
    def __init__(self) -> None:
        self.majority_class = 0

    def fit(self, y: np.ndarray) -> "MajorityClassifier":
        vals, counts = np.unique(y.astype(int), return_counts=True)
        self.majority_class = int(vals[np.argmax(counts)])
        return self

    def predict(self, n: int) -> np.ndarray:
        return np.full(shape=(n,), fill_value=self.majority_class, dtype=int)

    def predict_proba(self, n: int) -> np.ndarray:
        p = float(self.majority_class)
        return np.full(shape=(n,), fill_value=p, dtype=float)


class MeanRegressor:
    def __init__(self) -> None:
        self.mean_ = 0.0

    def fit(self, y: np.ndarray) -> "MeanRegressor":
        self.mean_ = float(np.mean(y))
        return self

    def predict(self, n: int) -> np.ndarray:
        return np.full(shape=(n,), fill_value=self.mean_, dtype=float)


def train_logistic_tfidf(X: sparse.csr_matrix, y: np.ndarray, random_state: int = 42) -> LogisticRegression:
    model = LogisticRegression(max_iter=1000, solver="liblinear", random_state=random_state)
    model.fit(X, y)
    return model


def train_logistic_tabular(X: np.ndarray, y: np.ndarray, random_state: int = 42) -> Pipeline:
    model = Pipeline(
        steps=[
            ("scale", StandardScaler()),
            ("clf", LogisticRegression(max_iter=1000, solver="liblinear", random_state=random_state)),
        ]
    )
    model.fit(X, y)
    return model


def train_ridge_tfidf(X: sparse.csr_matrix, y: np.ndarray) -> Ridge:
    model = Ridge(alpha=1.0, random_state=42)
    model.fit(X, y)
    return model


def train_elasticnet_tabular(X: np.ndarray, y: np.ndarray, random_state: int = 42) -> Pipeline:
    model = Pipeline(
        steps=[
            ("scale", StandardScaler()),
            ("reg", ElasticNet(alpha=0.05, l1_ratio=0.5, random_state=random_state, max_iter=5000)),
        ]
    )
    model.fit(X, y)
    return model
