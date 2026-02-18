from __future__ import annotations

import numpy as np
from scipy.stats import spearmanr
from sklearn.metrics import accuracy_score, brier_score_loss, mean_absolute_error, r2_score, roc_auc_score


def classification_metrics(y_true: np.ndarray, y_pred: np.ndarray, y_prob: np.ndarray) -> dict[str, float]:
    out = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "brier": float(brier_score_loss(y_true, y_prob)),
    }
    try:
        out["auc"] = float(roc_auc_score(y_true, y_prob))
    except Exception:  # noqa: BLE001
        out["auc"] = float("nan")
    return out


def regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    if np.nanstd(y_true) == 0 or np.nanstd(y_pred) == 0:
        rho = float("nan")
    else:
        rho, _ = spearmanr(y_true, y_pred)
    return {
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "r2": float(r2_score(y_true, y_pred)),
        "spearman": float(rho) if rho == rho else float("nan"),
    }


def bootstrap_ci(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    metric_fn,
    n_iter: int = 200,
    random_state: int = 42,
) -> tuple[float, float]:
    rng = np.random.default_rng(seed=random_state)
    n = len(y_true)
    if n == 0:
        return float("nan"), float("nan")
    vals = []
    for _ in range(n_iter):
        idx = rng.integers(low=0, high=n, size=n)
        v = metric_fn(y_true[idx], y_pred[idx])
        if np.isfinite(v):
            vals.append(v)
    if not vals:
        return float("nan"), float("nan")
    lo = float(np.quantile(vals, 0.025))
    hi = float(np.quantile(vals, 0.975))
    return lo, hi
