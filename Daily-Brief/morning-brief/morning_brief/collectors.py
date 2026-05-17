from __future__ import annotations

from datetime import datetime
from typing import Any

from morning_brief.settings import BriefConfig
from morning_brief.sources.holidays import collect_holidays
from morning_brief.sources.markets import collect_market_watchlist
from morning_brief.sources.news import collect_rss_group
from morning_brief.sources.sports import collect_major_events, collect_sports
from morning_brief.sources.weather import collect_weather


def collect_all(config: BriefConfig, now: datetime) -> dict[str, Any]:
    rss_sections = collect_rss_sections(config)

    return {
        "generated_at": now.isoformat(),
        "date": now.date().isoformat(),
        "timezone": config.timezone,
        "weather": collect_weather(config.locations),
        "sports": {
            "followed_teams": collect_sports(config.sports, now.date(), config.lookahead_days),
            "major_events": collect_major_events(
                config.sports_major_events,
                now.date(),
                config.lookahead_days,
            ),
        },
        "holidays": collect_holidays(now.date(), config.lookahead_days),
        "market_watchlist": collect_market_watchlist(config.market_watchlist),
        "general_news": rss_sections.get("general_news", []),
        "market_news": rss_sections.get("market_news", []),
        "local_news": rss_sections.get("local_news", []),
        "traffic_commute": rss_sections.get("traffic_commute", []),
        "tech_ai": rss_sections.get("tech_ai", []),
        "notes": [
            "The brief is generated from fetched facts only.",
            "Personal integrations such as Gmail, calendar, reminders, and portfolio are not enabled yet."
        ],
    }


def collect_rss_sections(config: BriefConfig) -> dict[str, list[dict[str, Any]]]:
    sections = {}
    per_feed = config.limits.get("news_items_per_feed", 5)

    for section, urls in config.rss_feeds.items():
        max_items = config.limits.get(f"max_{section}", 8)
        sections[section] = collect_rss_group(urls, per_feed=per_feed, max_items=max_items)

    return sections
