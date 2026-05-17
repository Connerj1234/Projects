from __future__ import annotations

from datetime import datetime
from typing import Any

from morning_brief.settings import BriefConfig
from morning_brief.sources.holidays import collect_holidays
from morning_brief.sources.news import collect_rss_group
from morning_brief.sources.sports import collect_sports
from morning_brief.sources.weather import collect_weather


def collect_all(config: BriefConfig, now: datetime) -> dict[str, Any]:
    general_news = collect_rss_group(
        config.rss_feeds.get("general_news", []),
        per_feed=config.limits.get("news_items_per_feed", 5),
        max_items=config.limits.get("max_general_news", 12),
    )
    market_news = collect_rss_group(
        config.rss_feeds.get("market_news", []),
        per_feed=config.limits.get("news_items_per_feed", 5),
        max_items=config.limits.get("max_market_news", 10),
    )

    return {
        "generated_at": now.isoformat(),
        "date": now.date().isoformat(),
        "timezone": config.timezone,
        "weather": collect_weather(config.locations),
        "sports": collect_sports(config.sports, now.date(), config.lookahead_days),
        "holidays": collect_holidays(now.date(), config.lookahead_days),
        "general_news": general_news,
        "market_news": market_news,
        "notes": [
            "The brief is generated from fetched facts only.",
            "Personal integrations such as Gmail, calendar, reminders, and portfolio are not enabled yet."
        ],
    }

