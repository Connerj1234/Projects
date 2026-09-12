from __future__ import annotations

import re
from datetime import datetime, timedelta
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
        ranked.sort(
            key=lambda value: (value["score"], str(value.get("published_at", ""))),
            reverse=True,
        )
        news[section] = ranked
        all_news.extend(ranked)

    actions = build_actions(facts, today, market_move_threshold)
    new_items = balanced_new_items(news, limit=8)
    repeated_items = sum(1 for item in all_news if item["repeated"])
    one_thing = choose_one_thing(actions, new_items)

    return {
        "date": today,
        "generated_at": facts.get("generated_at"),
        "one_thing": one_thing,
        "actions": actions,
        "news": news,
        "new_items": new_items,
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
            event = str(game.get("event", "Game"))
            major_terms = ("championship", "final", "masters", "playoff", "super bowl", "world cup")
            score = 82 if any(term in event.casefold() for term in major_terms) else 55
            actions.append(
                {
                    "kind": "sports",
                    "title": f"{game.get('followed_team', 'A followed team')} play today",
                    "detail": f"{event} · {format_eastern(starts_at)}",
                    "link": game.get("source_url"),
                    "score": score,
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
        if not is_recent(item.get("published_at"), facts.get("generated_at"), hours=30):
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
        resolved_terms = ("cleared", "lifted", "reopened", "resolved", "restored")
        active_terms = ("closure", "closed", "crash", "delay", "warning")
        if any(term in lowered for term in resolved_terms) and not any(
            term in lowered for term in active_terms
        ):
            continue
        actions.append(
                {
                    "kind": "traffic",
                    "title": concise_headline(title),
                "detail": item.get("summary") or f"Reported by {item.get('source', 'a configured source')}.",
                "link": item.get("link"),
                "score": 78,
            }
        )

    actions.sort(key=lambda value: -value["score"])
    return actions[:6]


def balanced_new_items(
    news: dict[str, list[dict[str, Any]]], limit: int
) -> list[dict[str, Any]]:
    """Choose the strongest item per section before filling remaining slots."""
    selected: list[dict[str, Any]] = []
    used: set[str] = set()
    for section in NEWS_SECTIONS:
        item = next(
            (
                candidate
                for candidate in news.get(section, [])
                if not candidate["repeated"] and candidate["fingerprint"] not in used
            ),
            None,
        )
        if item is not None:
            selected.append(item)
            used.add(item["fingerprint"])
    selected.sort(key=lambda value: -value["score"])
    remaining = sorted(
        (
            item
            for section in NEWS_SECTIONS
            for item in news.get(section, [])
            if not item["repeated"] and item["fingerprint"] not in used
        ),
        key=lambda value: -value["score"],
    )
    return (selected + remaining)[:limit]


def choose_one_thing(
    actions: list[dict[str, Any]], new_items: list[dict[str, Any]]
) -> dict[str, Any]:
    """Reserve the lead position for genuinely high-signal items."""
    for item in actions:
        if float(item.get("score", 0)) >= 75:
            return item
    if new_items and float(new_items[0].get("score", 0)) >= 75:
        item = new_items[0]
        return {
            **item,
            "kind": item.get("section", "news"),
            "detail": item.get("summary") or f"Reported by {item.get('source', 'a configured source')}.",
        }
    return {
        "title": "A quiet start",
        "detail": "No urgent alerts or unusually high-signal items were collected.",
        "score": 0,
        "kind": "status",
    }


def is_recent(published_at: Any, generated_at: Any, hours: int) -> bool:
    if not published_at or not generated_at:
        return True
    try:
        published = datetime.fromisoformat(str(published_at).replace("Z", "+00:00"))
        generated = datetime.fromisoformat(str(generated_at).replace("Z", "+00:00"))
        age = generated - published
        return timedelta(0) <= age <= timedelta(hours=hours)
    except (TypeError, ValueError):
        return True


def concise_headline(title: str) -> str:
    headline, separator, source = title.rpartition(" - ")
    if separator and headline and 2 <= len(source) <= 40:
        return headline
    return title


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
    if section == "traffic_commute" and "traffic stop" in haystack and not any(
        term in haystack for term in ("closure", "closed", "crash", "delay", "lane", "road")
    ):
        score -= 50
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
