from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class BriefConfig:
    timezone: str
    lookahead_days: int
    locations: list[dict[str, Any]]
    sports: list[dict[str, Any]]
    rss_feeds: dict[str, list[str]]
    limits: dict[str, int]


def load_config(path: Path) -> BriefConfig:
    data = json.loads(path.read_text(encoding="utf-8"))
    return BriefConfig(
        timezone=os.environ.get("BRIEF_TIMEZONE", data.get("timezone", "America/New_York")),
        lookahead_days=int(os.environ.get("BRIEF_LOOKAHEAD_DAYS", data.get("lookahead_days", 7))),
        locations=data.get("locations", []),
        sports=data.get("sports", []),
        rss_feeds=data.get("rss_feeds", {}),
        limits=data.get("limits", {}),
    )

