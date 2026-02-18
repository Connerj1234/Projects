from __future__ import annotations

import numpy as np
import pandas as pd


def align_events_to_t0(events: pd.DataFrame, prices: pd.DataFrame) -> pd.DataFrame:
    if events.empty:
        return events.copy()

    px = prices.sort_values(["ticker", "date"]).copy()
    grouped = {k: g["date"].to_numpy() for k, g in px.groupby("ticker")}

    t0_dates: list[pd.Timestamp | pd.NaT] = []
    has_price: list[bool] = []

    for ticker, event_date in zip(events["ticker"], events["event_date"]):
        dates = grouped.get(ticker)
        if dates is None or len(dates) == 0 or pd.isna(event_date):
            t0_dates.append(pd.NaT)
            has_price.append(False)
            continue
        idx = int(np.searchsorted(dates, np.datetime64(event_date), side="left"))
        if idx >= len(dates):
            t0_dates.append(pd.NaT)
            has_price.append(False)
            continue
        t0 = pd.Timestamp(dates[idx]).normalize()
        t0_dates.append(t0)
        has_price.append(True)

    out = events.copy()
    out["t0_date"] = t0_dates
    out["has_t0"] = has_price
    return out
