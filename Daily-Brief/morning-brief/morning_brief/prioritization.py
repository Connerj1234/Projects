from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from morning_brief.time_format import eastern_date, format_eastern


NEWS_SECTIONS = (
    "traffic_commute",
    "local_news",
    "market_news",
    "tech_ai",
    "general_news",
)

SECTION_LABELS = {
    "traffic_commute": "Traffic & commute",
    "local_news": "Atlanta & Georgia",
    "market_news": "Market news",
    "tech_ai": "Technology & AI",
    "general_news": "Top news",
}

WORD_RE = re.compile(r"[a-z0-9]+")


def build_briefing(
    facts: dict[str, Any],
    previous_facts: dict[str, Any] | None = None,
    preferred_keywords: list[str] | None = None,
    market_move_threshold: float = 2.0,
) -> dict[str, Any]:
    """Create a deterministic, presentation-ready view of collected facts."""
    preferred = [value.casefold() for value in (preferred_keywords or []) if value.strip()]
    previous = collect_story_fingerprints(previous_facts or {})
    today = str(facts.get("date", ""))
    news: dict[str, list[dict[str, Any]]] = {}
    all_news: list[dict[str, Any]] = []

    for section in NEWS_SECTIONS:
        ranked: list[dict[str, Any]] = []
        seen: set[str] = set()
        for item in facts.get(section, []):
            if item.get("error") or not item.get("title"):
                continue
            fingerprint = story_fingerprint(str(item.get("title", "")))
            if not fingerprint or fingerprint in seen:
                continue
            seen.add(fingerprint)
            repeated = fingerprint in previous
            score = news_score(section, item, preferred, repeated)
            ranked_item = {
                **item,
                "section": section,
                "section_label": SECTION_LABELS[section],
                "score": score,
                "repeated": repeated,
                "fingerprint": fingerprint,
            }
            ranked.append(ranked_item)
        ranked.sort(key=lambda value: (-value["score"], str(value.get("title", ""))))
        news[section] = ranked
        all_news.extend(ranked)

    actions = build_actions(facts, today, market_move_threshold)
    new_items = sorted(
        (item for item in all_news if not item["repeated"]),
        key=lambda value: -value["score"],
    )
    repeated_items = sum(1 for item in all_news if item["repeated"])
    # An actionable item should not be displaced by a high-scoring general headline.
    one_thing = actions[0] if actions else (new_items[0] if new_items else {
        "title": "A quiet start",
        "detail": "No urgent alerts or unusually high-signal items were collected.",
        "score": 0,
        "kind": "status",
    })

    return {
        "date": today,
        "generated_at": facts.get("generated_at"),
        "one_thing": one_thing,
        "actions": actions,
        "news": news,
        "new_items": new_items[:8],
        "repeated_count": repeated_items,
        "market_moves": market_moves(facts, market_move_threshold),
    }


def build_actions(
    facts: dict[str, Any], today: str, market_move_threshold: float
) -> list[dict[str, Any]]:
    actions: list[dict[str, Any]] = []

    for location in facts.get("weather", []):
        for alert in location.get("alerts", []):
            event = alert.get("event") or "Weather alert"
            actions.append(
                {
                    "kind": "weather",
                    "title": f"{event} for {location.get('location', 'your area')}",
                    "detail": alert.get("headline") or "Check the latest alert details.",
                    "score": 100,
                }
            )

    sports = facts.get("sports", {})
    games = sports.get("followed_teams", []) if isinstance(sports, dict) else sports
    for game in games:
        starts_at = str(game.get("starts_at", ""))
        if today and eastern_date(starts_at) == today:
            actions.append(
                {
                    "kind": "sports",
                    "title": f"{game.get('followed_team', 'A followed team')} play today",
                    "detail": f"{game.get('event', 'Game')} · {format_eastern(starts_at)}",
                    "link": game.get("source_url"),
                    "score": 80,
                }
            )

    for item in facts.get("market_watchlist", []):
        change = item.get("change_percent")
        if isinstance(change, (int, float)) and abs(change) >= market_move_threshold:
            direction = "up" if change >= 0 else "down"
            actions.append(
                {
                    "kind": "markets",
                    "title": f"{item.get('symbol')} is {direction} {abs(change):.2f}%",
                    "detail": f"{item.get('name', item.get('symbol'))} crossed your {market_move_threshold:.1f}% movement threshold.",
                    "score": 70 + min(abs(change), 20),
                }
            )

    for item in facts.get("traffic_commute", [])[:3]:
        if item.get("error") or not item.get("title"):
            continue
        title = str(item["title"])
        lowered = title.casefold()
        commute_terms = (
            "airport",
            "closure",
            "closed",
            "crash",
            "delay",
            "gdot",
            "ground stop",
            "lane",
            "marta",
            "road",
            "transit",
        )
        if "traffic stop" in lowered and not any(
            term in lowered for term in ("closure", "closed", "crash", "delay", "lane", "road")
        ):
            continue
        if not any(term in lowered for term in commute_terms):
            continue
        actions.append(
            {
                "kind": "traffic",
                "title": title,
                "detail": item.get("summary") or f"Reported by {item.get('source', 'a configured source')}.",
                "link": item.get("link"),
                "score": 65,
            }
        )

    actions.sort(key=lambda value: -value["score"])
    return actions[:6]


def market_moves(facts: dict[str, Any], threshold: float) -> list[dict[str, Any]]:
    items = []
    for item in facts.get("market_watchlist", []):
        change = item.get("change_percent")
        if isinstance(change, (int, float)) and abs(change) >= threshold:
            items.append(item)
    return sorted(items, key=lambda value: -abs(float(value.get("change_percent", 0))))


def news_score(
    section: str,
    item: dict[str, Any],
    preferred_keywords: list[str],
    repeated: bool,
) -> float:
    score = {
        "traffic_commute": 65,
        "local_news": 55,
        "market_news": 45,
        "tech_ai": 40,
        "general_news": 35,
    }.get(section, 30)
    haystack = f"{item.get('title', '')} {item.get('summary', '')}".casefold()
    score += 15 * sum(1 for keyword in preferred_keywords if keyword in haystack)
    if item.get("published_at"):
        score += 3
    if repeated:
        score -= 35
    return float(score)


def collect_story_fingerprints(facts: dict[str, Any]) -> set[str]:
    values: set[str] = set()
    for section in NEWS_SECTIONS:
        for item in facts.get(section, []):
            if item.get("title"):
                values.add(story_fingerprint(str(item["title"])))
    return values


def story_fingerprint(title: str) -> str:
    words = WORD_RE.findall(title.casefold())
    stop = {"a", "an", "and", "at", "for", "in", "of", "on", "the", "to", "with"}
    return " ".join(word for word in words if word not in stop)[:180]


def compact_for_ai(
    facts: dict[str, Any], briefing: dict[str, Any], limit: int = 10
) -> dict[str, Any]:
    """Keep model input small and focused on editorial judgment."""
    return {
        "date": facts.get("date"),
        "timezone": facts.get("timezone"),
        "top_item": briefing.get("one_thing"),
        "attention": briefing.get("actions", [])[:4],
        "new_headlines": [
            {
                "title": item.get("title"),
                "summary": item.get("summary", "")[:400],
                "source": item.get("source"),
                "section": item.get("section_label"),
            }
            for item in briefing.get("new_items", [])[:limit]
        ],
        "weather": [
            {
                "location": item.get("location"),
                "forecast_periods": item.get("forecast_periods", [])[:2],
                "alerts": item.get("alerts", [])[:2],
            }
            for item in facts.get("weather", [])
            if not item.get("error")
        ],
        "market_moves": briefing.get("market_moves", [])[:4],
    }
