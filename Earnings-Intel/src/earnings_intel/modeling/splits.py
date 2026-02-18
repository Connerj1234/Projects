from __future__ import annotations

import numpy as np
import pandas as pd


def time_based_split_indices(
    df: pd.DataFrame,
    train_frac: float = 0.70,
    val_frac: float = 0.15,
    test_frac: float = 0.15,
) -> dict[str, np.ndarray]:
    if not np.isclose(train_frac + val_frac + test_frac, 1.0):
        raise ValueError("train_frac + val_frac + test_frac must equal 1.0")
    if df.empty:
        return {"train": np.array([], dtype=int), "val": np.array([], dtype=int), "test": np.array([], dtype=int)}

    ordered = df.sort_values("event_date").reset_index(drop=True)
    n = len(ordered)
    n_train = int(n * train_frac)
    n_val = int(n * val_frac)
    n_test = n - n_train - n_val

    train_idx = np.arange(0, n_train, dtype=int)
    val_idx = np.arange(n_train, n_train + n_val, dtype=int)
    test_idx = np.arange(n_train + n_val, n_train + n_val + n_test, dtype=int)

    return {"train": train_idx, "val": val_idx, "test": test_idx}
