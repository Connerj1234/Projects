from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd
from joblib import dump
from scipy import sparse

from earnings_intel.modeling.baselines import (
    MajorityClassifier,
    MeanRegressor,
    train_elasticnet_tabular,
    train_logistic_tabular,
    train_logistic_tfidf,
    train_ridge_tfidf,
)
from earnings_intel.modeling.evaluate import bootstrap_ci, classification_metrics, regression_metrics
from earnings_intel.modeling.splits import time_based_split_indices
from earnings_intel.utils.io import ensure_parent, read_yaml
from earnings_intel.utils.logging import get_logger

LOGGER = get_logger(__name__)


FEATURE_EXCLUDE = {"doc_id", "ticker", "event_date", "target_car", "target_up", "has_label"}


def _tabular_feature_matrix(df: pd.DataFrame) -> np.ndarray:
    feature_cols = [c for c in df.columns if c not in FEATURE_EXCLUDE]
    return df[feature_cols].to_numpy(dtype=float), feature_cols


def _make_split_labels(n: int, split_idx: dict[str, np.ndarray]) -> np.ndarray:
    labels = np.full(shape=(n,), fill_value="train", dtype=object)
    labels[split_idx["val"]] = "val"
    labels[split_idx["test"]] = "test"
    return labels


def _save_model(model, path: Path) -> None:
    ensure_parent(path)
    dump(model, path)


def _pred_rows(
    meta_df: pd.DataFrame,
    split_labels: np.ndarray,
    idx: np.ndarray,
    task: str,
    model_name: str,
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_prob: np.ndarray | None = None,
) -> pd.DataFrame:
    out = pd.DataFrame(
        {
            "doc_id": meta_df.iloc[idx]["doc_id"].to_numpy(),
            "event_date": meta_df.iloc[idx]["event_date"].to_numpy(),
            "split": split_labels[idx],
            "task": task,
            "model": model_name,
            "y_true": y_true,
            "y_pred": y_pred,
        }
    )
    out["y_score"] = y_prob if y_prob is not None else np.nan
    return out


def run(config_path: str) -> None:
    cfg = read_yaml(config_path)
    split_cfg = cfg["split"]
    inp = cfg["input"]
    out = cfg["output"]
    model_cfg = cfg.get("modeling", {})
    random_state = int(model_cfg.get("random_state", 42))
    bootstrap_iterations = int(model_cfg.get("bootstrap_iterations", 200))

    tab = pd.read_parquet(inp["tabular_path"]).copy()
    X_text = sparse.load_npz(inp["text_npz_path"]).tocsr()
    X_emb = np.load(inp["embeddings_path"])

    if len(tab) != X_text.shape[0] or len(tab) != X_emb.shape[0]:
        raise ValueError(
            f"Feature row mismatch: tab={len(tab)} tfidf={X_text.shape[0]} emb={X_emb.shape[0]}"
        )
    order_idx = np.argsort(pd.to_datetime(tab["event_date"]).to_numpy())
    tab = tab.iloc[order_idx].reset_index(drop=True)
    X_text = X_text[order_idx]
    X_emb = X_emb[order_idx]

    X_tab, feature_cols = _tabular_feature_matrix(tab)
    y_cls = tab["target_up"].astype(int).to_numpy()
    y_reg = tab["target_car"].astype(float).to_numpy()

    split_idx = time_based_split_indices(
        df=tab,
        train_frac=float(split_cfg["train_frac"]),
        val_frac=float(split_cfg["val_frac"]),
        test_frac=float(split_cfg["test_frac"]),
    )
    split_labels = _make_split_labels(len(tab), split_idx)
    idx_train, idx_val, idx_test = split_idx["train"], split_idx["val"], split_idx["test"]

    X_tab_train, X_tab_val, X_tab_test = X_tab[idx_train], X_tab[idx_val], X_tab[idx_test]
    X_text_train, X_text_val, X_text_test = X_text[idx_train], X_text[idx_val], X_text[idx_test]
    y_cls_train, y_cls_val, y_cls_test = y_cls[idx_train], y_cls[idx_val], y_cls[idx_test]
    y_reg_train, y_reg_val, y_reg_test = y_reg[idx_train], y_reg[idx_val], y_reg[idx_test]

    models_dir = Path(out["models_dir"])
    models_dir.mkdir(parents=True, exist_ok=True)

    metrics_rows: list[dict[str, float | str]] = []
    pred_frames: list[pd.DataFrame] = []

    # Classification baselines.
    maj = MajorityClassifier().fit(y_cls_train)
    cls_models = {
        "majority_class": maj,
        "logreg_tfidf": train_logistic_tfidf(X_text_train, y_cls_train, random_state=random_state),
        "logreg_tabular": train_logistic_tabular(X_tab_train, y_cls_train, random_state=random_state),
    }

    for name, model in cls_models.items():
        if name == "majority_class":
            y_val_pred = model.predict(len(idx_val))
            y_val_prob = model.predict_proba(len(idx_val))
            y_test_pred = model.predict(len(idx_test))
            y_test_prob = model.predict_proba(len(idx_test))
        elif name == "logreg_tfidf":
            y_val_prob = model.predict_proba(X_text_val)[:, 1]
            y_test_prob = model.predict_proba(X_text_test)[:, 1]
            y_val_pred = (y_val_prob >= 0.5).astype(int)
            y_test_pred = (y_test_prob >= 0.5).astype(int)
        else:
            y_val_prob = model.predict_proba(X_tab_val)[:, 1]
            y_test_prob = model.predict_proba(X_tab_test)[:, 1]
            y_val_pred = (y_val_prob >= 0.5).astype(int)
            y_test_pred = (y_test_prob >= 0.5).astype(int)

        m_val = classification_metrics(y_cls_val, y_val_pred, y_val_prob)
        m_test = classification_metrics(y_cls_test, y_test_pred, y_test_prob)
        auc_lo, auc_hi = bootstrap_ci(
            y_true=y_cls_test,
            y_pred=y_test_prob,
            metric_fn=lambda yt, yp: float(np.nan_to_num(classification_metrics(yt, (yp >= 0.5).astype(int), yp)["auc"])),
            n_iter=bootstrap_iterations,
            random_state=random_state,
        )
        acc_lo, acc_hi = bootstrap_ci(
            y_true=y_cls_test,
            y_pred=y_test_pred,
            metric_fn=lambda yt, yp: float(np.mean(yt == yp)),
            n_iter=bootstrap_iterations,
            random_state=random_state,
        )
        brier_lo, brier_hi = bootstrap_ci(
            y_true=y_cls_test,
            y_pred=y_test_prob,
            metric_fn=lambda yt, yp: float(np.mean((yt - yp) ** 2)),
            n_iter=bootstrap_iterations,
            random_state=random_state,
        )

        metrics_rows.extend(
            [
                {
                    "task": "classification",
                    "model": name,
                    "split": "val",
                    **m_val,
                    "auc_ci_low": np.nan,
                    "auc_ci_high": np.nan,
                    "accuracy_ci_low": np.nan,
                    "accuracy_ci_high": np.nan,
                    "brier_ci_low": np.nan,
                    "brier_ci_high": np.nan,
                },
                {
                    "task": "classification",
                    "model": name,
                    "split": "test",
                    **m_test,
                    "auc_ci_low": auc_lo,
                    "auc_ci_high": auc_hi,
                    "accuracy_ci_low": acc_lo,
                    "accuracy_ci_high": acc_hi,
                    "brier_ci_low": brier_lo,
                    "brier_ci_high": brier_hi,
                },
            ]
        )
        pred_frames.append(
            _pred_rows(tab, split_labels, idx_val, "classification", name, y_cls_val, y_val_pred, y_val_prob)
        )
        pred_frames.append(
            _pred_rows(tab, split_labels, idx_test, "classification", name, y_cls_test, y_test_pred, y_test_prob)
        )
        _save_model(model, models_dir / f"{name}.joblib")

    # Regression baselines.
    mean_reg = MeanRegressor().fit(y_reg_train)
    reg_models = {
        "mean_regression": mean_reg,
        "ridge_tfidf": train_ridge_tfidf(X_text_train, y_reg_train),
        "elasticnet_tabular": train_elasticnet_tabular(X_tab_train, y_reg_train, random_state=random_state),
    }

    for name, model in reg_models.items():
        if name == "mean_regression":
            y_val_pred = model.predict(len(idx_val))
            y_test_pred = model.predict(len(idx_test))
        elif name == "ridge_tfidf":
            y_val_pred = model.predict(X_text_val)
            y_test_pred = model.predict(X_text_test)
        else:
            y_val_pred = model.predict(X_tab_val)
            y_test_pred = model.predict(X_tab_test)

        m_val = regression_metrics(y_reg_val, y_val_pred)
        m_test = regression_metrics(y_reg_test, y_test_pred)
        mae_lo, mae_hi = bootstrap_ci(
            y_true=y_reg_test,
            y_pred=y_test_pred,
            metric_fn=lambda yt, yp: float(np.mean(np.abs(yt - yp))),
            n_iter=bootstrap_iterations,
            random_state=random_state,
        )
        r2_lo, r2_hi = bootstrap_ci(
            y_true=y_reg_test,
            y_pred=y_test_pred,
            metric_fn=lambda yt, yp: regression_metrics(yt, yp)["r2"],
            n_iter=bootstrap_iterations,
            random_state=random_state,
        )
        sp_lo, sp_hi = bootstrap_ci(
            y_true=y_reg_test,
            y_pred=y_test_pred,
            metric_fn=lambda yt, yp: regression_metrics(yt, yp)["spearman"],
            n_iter=bootstrap_iterations,
            random_state=random_state,
        )
        metrics_rows.extend(
            [
                {
                    "task": "regression",
                    "model": name,
                    "split": "val",
                    **m_val,
                    "mae_ci_low": np.nan,
                    "mae_ci_high": np.nan,
                    "r2_ci_low": np.nan,
                    "r2_ci_high": np.nan,
                    "spearman_ci_low": np.nan,
                    "spearman_ci_high": np.nan,
                },
                {
                    "task": "regression",
                    "model": name,
                    "split": "test",
                    **m_test,
                    "mae_ci_low": mae_lo,
                    "mae_ci_high": mae_hi,
                    "r2_ci_low": r2_lo,
                    "r2_ci_high": r2_hi,
                    "spearman_ci_low": sp_lo,
                    "spearman_ci_high": sp_hi,
                },
            ]
        )
        pred_frames.append(_pred_rows(tab, split_labels, idx_val, "regression", name, y_reg_val, y_val_pred))
        pred_frames.append(_pred_rows(tab, split_labels, idx_test, "regression", name, y_reg_test, y_test_pred))
        _save_model(model, models_dir / f"{name}.joblib")

    metrics_df = pd.DataFrame(metrics_rows)
    preds_df = pd.concat(pred_frames, ignore_index=True)

    ensure_parent(out["predictions_path"])
    preds_df.to_parquet(out["predictions_path"], index=False)
    LOGGER.info("Saved predictions: %s (rows=%s)", out["predictions_path"], len(preds_df))

    cls_test = metrics_df[(metrics_df["task"] == "classification") & (metrics_df["split"] == "test")].copy()
    reg_test = metrics_df[(metrics_df["task"] == "regression") & (metrics_df["split"] == "test")].copy()
    cls_test = cls_test.sort_values("auc", ascending=False)
    reg_test = reg_test.sort_values("mae", ascending=True)

    ensure_parent(out["model_card_path"])
    with Path(out["model_card_path"]).open("w", encoding="utf-8") as f:
        f.write("# Model Card\n\n")
        f.write("## Data and split\n\n")
        f.write(f"- samples: {len(tab)}\n")
        f.write(f"- tabular feature count: {len(feature_cols)}\n")
        f.write(f"- text feature shape: {tuple(X_text.shape)}\n")
        f.write(
            f"- split sizes: train={len(idx_train)}, val={len(idx_val)}, test={len(idx_test)}\n"
        )
        f.write("\n## Classification baselines (test)\n\n")
        f.write(
            cls_test[
                [
                    "model",
                    "auc",
                    "auc_ci_low",
                    "auc_ci_high",
                    "accuracy",
                    "accuracy_ci_low",
                    "accuracy_ci_high",
                    "brier",
                    "brier_ci_low",
                    "brier_ci_high",
                ]
            ].to_markdown(index=False)
        )
        f.write("\n\n## Regression baselines (test)\n\n")
        f.write(
            reg_test[
                [
                    "model",
                    "mae",
                    "mae_ci_low",
                    "mae_ci_high",
                    "r2",
                    "r2_ci_low",
                    "r2_ci_high",
                    "spearman",
                    "spearman_ci_low",
                    "spearman_ci_high",
                ]
            ].to_markdown(index=False)
        )
        f.write("\n\n## Notes\n\n")
        f.write("- Labels are event-study style abnormal returns and are not causal estimates.\n")
        f.write("- Time split is chronological to reduce leakage.\n")
        f.write("- Confidence intervals use bootstrap on the test split.\n")

    LOGGER.info("Saved model card: %s", out["model_card_path"])


def main() -> None:
    parser = argparse.ArgumentParser(description="Run modeling baselines.")
    parser.add_argument("--config", default="configs/model.yaml", help="Path to model config.")
    args = parser.parse_args()
    run(args.config)


if __name__ == "__main__":
    main()
