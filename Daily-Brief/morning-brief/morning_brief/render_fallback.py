from __future__ import annotations

from typing import Any


def render_fallback(facts: dict[str, Any]) -> str:
    lines = [f"# Morning Brief for {facts.get('date')}", ""]

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

    lines.extend(["", "## Market News"])
    for item in facts.get("market_news", [])[:5]:
        if item.get("error"):
            lines.append(f"- Source error: {item.get('source_url')} - {item.get('error')}")
        else:
            lines.append(f"- {item.get('title')} ({item.get('source')})")

    lines.extend(["", "## Top News"])
    for item in facts.get("general_news", [])[:5]:
        if item.get("error"):
            lines.append(f"- Source error: {item.get('source_url')} - {item.get('error')}")
        else:
            lines.append(f"- {item.get('title')} ({item.get('source')})")

    return "\n".join(lines)


def format_temp(period: dict[str, Any]) -> str:
    if period.get("temperature") is None:
        return ""
    return f"{period.get('temperature')} {period.get('temperature_unit', '')}".strip()
