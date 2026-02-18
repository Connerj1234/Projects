#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

import pandas as pd
import statsmodels.api as sm

from earnings_intel.event_study import compute_event_return

ROOT = Path(__file__).resolve().parents[1]
FEATURES_PATH = ROOT / "data" / "processed" / "transcript_features.parquet"
PRICES_PATH = ROOT / "data" / "raw" / "prices" / "daily_prices.parquet"
EVENTS_OUT = ROOT / "data" / "processed" / "event_level_dataset.parquet"
RESULTS_OUT = ROOT / "models" / "backtest_summary.txt"


def main() -> None:
    feats = pd.read_parquet(FEATURES_PATH)
    prices = pd.read_parquet(PRICES_PATH)
    prices["date"] = pd.to_datetime(prices["date"]).dt.normalize()

    mkt = prices[prices["ticker"] == "SPY"].copy()

    rows: list[dict] = []
    for row in feats.itertuples(index=False):
        ticker_px = prices[prices["ticker"] == row.ticker]
        if ticker_px.empty or mkt.empty:
            continue

        event_ret = compute_event_return(ticker_px, mkt, pd.Timestamp(row.date))

        r = row._asdict()
        r.update(
            {
                "ret_1d": event_ret.ret_1d,
                "ret_5d": event_ret.ret_5d,
                "mkt_1d": event_ret.mkt_1d,
                "mkt_5d": event_ret.mkt_5d,
                "abnormal_1d": event_ret.abnormal_1d,
                "abnormal_5d": event_ret.abnormal_5d,
            }
        )
        rows.append(r)

    ds = pd.DataFrame(rows).dropna(subset=["abnormal_1d", "abnormal_5d"])
    if ds.empty:
        raise RuntimeError("No valid event rows after joining features and prices.")

    EVENTS_OUT.parent.mkdir(parents=True, exist_ok=True)
    ds.to_parquet(EVENTS_OUT, index=False)

    numeric_features = [
        "risk_ratio",
        "opportunity_ratio",
        "sentiment_neg",
        "sentiment_pos",
        "sentiment_compound",
        "log_word_count",
    ] + [c for c in ds.columns if c.startswith("topic_")]

    X = sm.add_constant(ds[numeric_features].fillna(0.0))

    model_1d = sm.OLS(ds["abnormal_1d"], X).fit(cov_type="HC3")
    model_5d = sm.OLS(ds["abnormal_5d"], X).fit(cov_type="HC3")

    lines = []
    lines.append("Earnings Call NLP Signal Backtest")
    lines.append("=" * 40)
    lines.append(f"Observations: {len(ds)}")
    lines.append("")
    lines.append("Abnormal Return +1d (HC3 robust SE)")
    lines.append(model_1d.summary().as_text())
    lines.append("")
    lines.append("Abnormal Return +5d (HC3 robust SE)")
    lines.append(model_5d.summary().as_text())

    RESULTS_OUT.parent.mkdir(parents=True, exist_ok=True)
    RESULTS_OUT.write_text("\n".join(lines))

    print(f"Saved event dataset: {EVENTS_OUT}")
    print(f"Saved regression summary: {RESULTS_OUT}")


if __name__ == "__main__":
    main()
