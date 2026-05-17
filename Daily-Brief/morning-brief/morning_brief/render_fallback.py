from __future__ import annotations

from typing import Any


def render_fallback(facts: dict[str, Any]) -> str:
    lines = [f"# Morning Brief for {facts.get('date')}", ""]

    lines.extend(["## One Thing To Know Today", "- Review the top weather, market, and news items below.", ""])

    lines.extend(["## Local Atlanta/Georgia"])
    append_news_items(lines, facts.get("local_news", []), limit=5)

    lines.extend(["", "## Traffic/Commute/Weather Alerts"])
    append_news_items(lines, facts.get("traffic_commute", []), limit=4)

    lines.append("## Weather")
    for item in facts.get("weather", []):
        lines.append(f"- **{item.get('location')}**:")
        if item.get("error"):
            lines.append(f"  {item['error']}")
            continue
        for period in item.get("forecast_periods", [])[:2]:
            lines.append(
                "  "
                + " - ".join(
                    str(part)
                    for part in [
                        period.get("name"),
                        format_temp(period),
                        period.get("short_forecast"),
                    ]
                    if part
                )
            )
        for alert in item.get("alerts", []):
            if alert.get("event"):
                lines.append(f"  Alert: {alert['event']} - {alert.get('headline', '')}")

    lines.extend(["", "## Sports"])
    sports = facts.get("sports", {})
    followed_teams = sports.get("followed_teams", []) if isinstance(sports, dict) else sports
    major_events = sports.get("major_events", []) if isinstance(sports, dict) else []
    if followed_teams:
        lines.append("### Followed Teams")
        for game in followed_teams:
            lines.append(
                f"- **{game.get('followed_team')}**: {game.get('event')} at {game.get('starts_at')}"
            )
    else:
        lines.append("- No followed-team games found in the lookahead window.")
    if major_events:
        lines.append("### Major Events")
        for game in major_events:
            lines.append(
                f"- **{game.get('followed_team')}**: {game.get('event')} at {game.get('starts_at')}"
            )

    lines.extend(["", "## Holidays"])
    holidays = facts.get("holidays", [])
    if holidays:
        for holiday in holidays:
            if holiday.get("error"):
                lines.append(f"- Source error: {holiday.get('error')}")
            else:
                lines.append(f"- {holiday.get('date')}: {holiday.get('name')}")
    else:
        lines.append("- No US public holidays found in the lookahead window.")

    lines.extend(["", "## Market Watchlist"])
    watchlist = facts.get("market_watchlist", [])
    if watchlist:
        for item in watchlist:
            if item.get("error"):
                lines.append(f"- **{item.get('symbol')}**: {item.get('error')}")
                continue
            change = format_change(item)
            lines.append(
                f"- **{item.get('symbol')}** ({item.get('name')}): "
                f"{item.get('price')} {item.get('currency') or ''} {change}".strip()
            )
    else:
        lines.append("- No market watchlist data was collected.")

    lines.extend(["", "## Market News"])
    for item in facts.get("market_news", [])[:5]:
        if item.get("error"):
            lines.append(f"- Source error: {item.get('source_url')} - {item.get('error')}")
        else:
            lines.append(f"- {item.get('title')} ({item.get('source')})")

    lines.extend(["", "## Tech/AI"])
    append_news_items(lines, facts.get("tech_ai", []), limit=5)

    lines.extend(["", "## Top News"])
    append_news_items(lines, facts.get("general_news", []), limit=5)

    return "\n".join(lines)


def append_news_items(lines: list[str], items: list[dict[str, Any]], limit: int) -> None:
    if not items:
        lines.append("- No items collected.")
        return
    for item in items[:limit]:
        if item.get("error"):
            lines.append(f"- Source error: {item.get('source_url')} - {item.get('error')}")
        else:
            lines.append(f"- {item.get('title')} ({item.get('source')})")


def format_temp(period: dict[str, Any]) -> str:
    if period.get("temperature") is None:
        return ""
    return f"{period.get('temperature')} {period.get('temperature_unit', '')}".strip()


def format_change(item: dict[str, Any]) -> str:
    change = item.get("change")
    change_percent = item.get("change_percent")
    if not isinstance(change, (int, float)) or not isinstance(change_percent, (int, float)):
        return ""
    sign = "+" if change >= 0 else ""
    return f"({sign}{change:.2f}, {sign}{change_percent:.2f}%)"
