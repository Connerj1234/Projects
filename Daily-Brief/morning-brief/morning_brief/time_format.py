from __future__ import annotations

from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo


EASTERN = ZoneInfo("America/New_York")


def parse_datetime(value: Any) -> datetime | None:
    text = str(value or "").strip()
    if not text:
        return None
    if text.endswith("Z"):
        text = f"{text[:-1]}+00:00"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=EASTERN)
    return parsed


def eastern_datetime(value: Any) -> datetime | None:
    parsed = parse_datetime(value)
    return parsed.astimezone(EASTERN) if parsed else None


def eastern_date(value: Any) -> str:
    parsed = eastern_datetime(value)
    return parsed.date().isoformat() if parsed else ""


def format_eastern(value: Any) -> str:
    parsed = eastern_datetime(value)
    if not parsed:
        return str(value or "")
    hour = parsed.strftime("%I").lstrip("0") or "12"
    return f"{parsed.strftime('%b')} {parsed.day}, {parsed.year} · {hour}:{parsed.strftime('%M %p')} ET"
