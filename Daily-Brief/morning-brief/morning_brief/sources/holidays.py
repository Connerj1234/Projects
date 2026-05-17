from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any

from morning_brief.http_client import safe_get_json


def collect_holidays(start_date: date, lookahead_days: int) -> list[dict[str, Any]]:
    year = start_date.year
    url = f"https://date.nager.at/api/v3/PublicHolidays/{year}/US"
    data, error = safe_get_json(url)
    if error or not isinstance(data, list):
        return [{"error": error or "Invalid holiday response", "source": "Nager.Date"}]

    end_date = start_date + timedelta(days=lookahead_days)
    results = []
    for item in data:
        raw_date = item.get("date")
        if not raw_date:
            continue
        holiday_date = datetime.strptime(raw_date, "%Y-%m-%d").date()
        if start_date <= holiday_date <= end_date:
            results.append(
                {
                    "date": raw_date,
                    "name": item.get("localName") or item.get("name"),
                    "global": item.get("global"),
                    "counties": item.get("counties"),
                    "source": "Nager.Date",
                }
            )
    return results

