from __future__ import annotations

import numpy as np
import pandas as pd

from earnings_intel.labeling.event_windows import align_events_to_t0


def _winsorize(series: pd.Series, lower_q: float, upper_q: float) -> pd.Series:
    if series.dropna().empty:
        return series
    lo = float(series.quantile(lower_q))
    hi = float(series.quantile(upper_q))
    return series.clip(lower=lo, upper=hi)


def compute_event_returns(
    transcripts: pd.DataFrame,
    prices: pd.DataFrame,
    benchmark_ticker: str = "SPY",
    winsor_lower: float = 0.01,
    winsor_upper: float = 0.99,
) -> pd.DataFrame:
    if transcripts.empty:
        return pd.DataFrame()

    px = prices.copy()
    if px.empty:
        out = transcripts[["doc_id", "ticker", "event_date"]].copy()
        out["t0_date"] = pd.NaT
        out["ar_0"] = np.nan
        out["ar_1"] = np.nan
        out["car_0_1"] = np.nan
        out["target_car"] = np.nan
        out["target_up"] = np.nan
        out["has_label"] = False
        return out

    px["date"] = pd.to_datetime(px["date"], errors="coerce").dt.normalize()
    px = px[px["date"].notna()].copy()
    px = px.sort_values(["ticker", "date"])
    px["ret"] = px.groupby("ticker")["close"].pct_change()

    bench = px[px["ticker"] == benchmark_ticker.upper()][["date", "ret"]].rename(
        columns={"ret": "bench_ret"}
    )
    bench = bench.drop_duplicates(subset=["date"]).sort_values("date")

    stock = px.merge(bench, on="date", how="left")
    stock["abret"] = stock["ret"] - stock["bench_ret"]

    abret_by_ticker = {
        t: g[["date", "abret"]].reset_index(drop=True) for t, g in stock.groupby("ticker")
    }

    base = transcripts[["doc_id", "ticker", "event_date"]].copy()
    base["ticker"] = base["ticker"].astype(str).str.upper()
    base = align_events_to_t0(base, px)

    ar0_vals: list[float] = []
    ar1_vals: list[float] = []

    for ticker, t0 in zip(base["ticker"], base["t0_date"]):
        g = abret_by_ticker.get(ticker)
        if g is None or pd.isna(t0):
            ar0_vals.append(np.nan)
            ar1_vals.append(np.nan)
            continue
        match_idx = g.index[g["date"] == t0]
        if len(match_idx) == 0:
            ar0_vals.append(np.nan)
            ar1_vals.append(np.nan)
            continue
        idx0 = int(match_idx[0])
        idx1 = idx0 + 1
        ar0 = g.loc[idx0, "abret"] if idx0 < len(g) else np.nan
        ar1 = g.loc[idx1, "abret"] if idx1 < len(g) else np.nan
        ar0_vals.append(ar0)
        ar1_vals.append(ar1)

    out = base.copy()
    out["ar_0"] = ar0_vals
    out["ar_1"] = ar1_vals
    out["car_0_1"] = out["ar_0"] + out["ar_1"]
    out["target_car"] = _winsorize(out["car_0_1"], winsor_lower, winsor_upper)
    out["target_up"] = (out["target_car"] > 0).astype("Int64")
    out.loc[out["target_car"].isna(), "target_up"] = pd.NA
    out["has_label"] = out["target_car"].notna()
    return out
