from __future__ import annotations

from typing import Any
from urllib.parse import quote

from morning_brief.http_client import safe_get_json


def collect_market_watchlist(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []

    for item in items:
        symbol = item["symbol"]
        url = (
            "https://query1.finance.yahoo.com/v8/finance/chart/"
            f"{quote(symbol)}?range=1d&interval=1d"
        )
        data, error = safe_get_json(url)
        if error or not isinstance(data, dict):
            results.append(
                {
                    "symbol": symbol,
                    "name": item.get("name", symbol),
                    "error": error or "Invalid market response",
                    "source": "Yahoo Finance chart API",
                }
            )
            continue

        result = ((data.get("chart") or {}).get("result") or [{}])[0]
        meta = result.get("meta", {})
        price = meta.get("regularMarketPrice")
        previous_close = meta.get("chartPreviousClose") or meta.get("previousClose")
        change = None
        change_percent = None
        if isinstance(price, (int, float)) and isinstance(previous_close, (int, float)):
            change = price - previous_close
            if previous_close:
                change_percent = (change / previous_close) * 100

        results.append(
            {
                "symbol": symbol,
                "name": item.get("name", meta.get("shortName") or symbol),
                "price": price,
                "previous_close": previous_close,
                "change": change,
                "change_percent": change_percent,
                "currency": meta.get("currency"),
                "exchange": meta.get("exchangeName"),
                "market_state": meta.get("marketState"),
                "source": "Yahoo Finance chart API",
            }
        )

    return results
