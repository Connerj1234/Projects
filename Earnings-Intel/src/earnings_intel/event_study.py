from __future__ import annotations

from dataclasses import dataclass
import pandas as pd


@dataclass
class EventReturn:
    ret_1d: float
    ret_5d: float
    mkt_1d: float
    mkt_5d: float
    abnormal_1d: float
    abnormal_5d: float


def _window_return(prices: pd.Series, start_idx: int, horizon: int) -> float:
    if start_idx < 0 or start_idx + horizon >= len(prices):
        return float("nan")
    p0 = prices.iloc[start_idx]
    p1 = prices.iloc[start_idx + horizon]
    if p0 <= 0:
        return float("nan")
    return float(p1 / p0 - 1.0)


def compute_event_return(
    ticker_prices: pd.DataFrame,
    market_prices: pd.DataFrame,
    event_date: pd.Timestamp,
) -> EventReturn:
    tp = ticker_prices.sort_values("date").reset_index(drop=True)
    mp = market_prices.sort_values("date").reset_index(drop=True)

    event_idx = tp[tp["date"] >= event_date].index
    if len(event_idx) == 0:
        return EventReturn(*(float("nan") for _ in range(6)))

    idx = int(event_idx[0])
    ret_1d = _window_return(tp["close"], idx, 1)
    ret_5d = _window_return(tp["close"], idx, 5)

    m_event_idx = mp[mp["date"] >= event_date].index
    if len(m_event_idx) == 0:
        return EventReturn(ret_1d, ret_5d, float("nan"), float("nan"), float("nan"), float("nan"))

    m_idx = int(m_event_idx[0])
    mkt_1d = _window_return(mp["close"], m_idx, 1)
    mkt_5d = _window_return(mp["close"], m_idx, 5)

    return EventReturn(
        ret_1d=ret_1d,
        ret_5d=ret_5d,
        mkt_1d=mkt_1d,
        mkt_5d=mkt_5d,
        abnormal_1d=ret_1d - mkt_1d,
        abnormal_5d=ret_5d - mkt_5d,
    )
