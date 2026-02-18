from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

from earnings_intel.utils.io import read_yaml
from earnings_intel.utils.logging import get_logger

LOGGER = get_logger(__name__)


def _write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")


def run(config_path: str) -> None:
    cfg = read_yaml(config_path)
    inp = cfg["input"]
    out_dir = Path(cfg["output"]["web_data_dir"])
    max_chunks = int(cfg.get("retrieval", {}).get("max_chunks_for_browser_search", 5000))

    transcripts = pd.read_parquet(inp["transcripts_path"])
    events = pd.read_parquet(inp["event_returns_path"])
    feats = pd.read_parquet(inp["features_tabular_path"])
    preds = pd.read_parquet(inp["predictions_path"])
    chunks = pd.read_parquet(inp["chunks_path"])

    transcripts["event_date"] = pd.to_datetime(transcripts["event_date"], errors="coerce")
    events["event_date"] = pd.to_datetime(events["event_date"], errors="coerce")

    summary = {
        "transcript_rows": int(len(transcripts)),
        "unique_tickers": int(transcripts["ticker"].nunique()),
        "event_date_min": str(transcripts["event_date"].min()),
        "event_date_max": str(transcripts["event_date"].max()),
        "label_coverage": float(events["has_label"].mean()),
        "labeled_events": int(events["has_label"].sum()),
        "feature_rows": int(len(feats)),
        "prediction_rows": int(len(preds)),
        "chunk_rows": int(len(chunks)),
    }
    _write_json(out_dir / "summary.json", summary)

    yq = (
        transcripts.assign(
            year=transcripts["event_date"].dt.year,
            quarter=transcripts["event_date"].dt.quarter,
        )
        .groupby(["year", "quarter"], dropna=False)
        .size()
        .reset_index(name="events")
        .dropna()
    )
    yq["period"] = yq["year"].astype(int).astype(str) + "-Q" + yq["quarter"].astype(int).astype(str)
    _write_json(out_dir / "events_by_period.json", yq[["period", "events"]].to_dict(orient="records"))

    top_tickers = (
        transcripts["ticker"].value_counts().head(20).rename_axis("ticker").reset_index(name="events")
    )
    _write_json(out_dir / "top_tickers.json", top_tickers.to_dict(orient="records"))

    feat_cols = [
        c
        for c in feats.columns
        if c
        not in {"doc_id", "ticker", "event_date", "target_car", "target_up", "has_label"}
    ]
    corr = []
    for c in feat_cols:
        s = pd.to_numeric(feats[c], errors="coerce")
        t = pd.to_numeric(feats["target_car"], errors="coerce")
        val = s.corr(t)
        corr.append({"feature": c, "corr_target_car": 0.0 if pd.isna(val) else float(val)})
    corr_df = pd.DataFrame(corr).sort_values("corr_target_car", ascending=False)
    _write_json(
        out_dir / "feature_correlations.json",
        corr_df.head(12).to_dict(orient="records") + corr_df.tail(12).to_dict(orient="records"),
    )

    # Model metrics from predictions.
    pred = preds.copy()
    cls = pred[(pred["task"] == "classification") & (pred["split"] == "test")]
    reg = pred[(pred["task"] == "regression") & (pred["split"] == "test")]
    cls_rows = []
    for model, g in cls.groupby("model"):
        y_true = g["y_true"].astype(float)
        y_pred = g["y_pred"].astype(float)
        acc = float((y_true == y_pred).mean())
        cls_rows.append({"model": model, "accuracy": acc})
    reg_rows = []
    for model, g in reg.groupby("model"):
        y_true = g["y_true"].astype(float)
        y_pred = g["y_pred"].astype(float)
        mae = float((y_true - y_pred).abs().mean())
        reg_rows.append({"model": model, "mae": mae})
    _write_json(out_dir / "model_metrics.json", {"classification": cls_rows, "regression": reg_rows})

    chunks_small = (
        chunks.sort_values("event_date", ascending=False)
        .head(max_chunks)[["chunk_id", "ticker", "event_date", "section", "chunk_text"]]
        .copy()
    )
    chunks_small["chunk_text"] = chunks_small["chunk_text"].astype(str).str.slice(0, 420)
    _write_json(out_dir / "retrieval_chunks.json", chunks_small.to_dict(orient="records"))

    LOGGER.info("Web assets written to %s", out_dir)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build JSON assets for web dashboard.")
    parser.add_argument("--config", default="configs/web.yaml", help="Path to web config")
    args = parser.parse_args()
    run(args.config)


if __name__ == "__main__":
    main()
