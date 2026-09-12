from __future__ import annotations

from typing import Any

from morning_brief.prioritization import NEWS_SECTIONS, SECTION_LABELS, build_briefing


def render_fallback(
    facts: dict[str, Any],
    briefing: dict[str, Any] | None = None,
    dashboard_url: str = "",
    ai_summary: str | None = None,
) -> str:
    """Render a concise email locally; the dashboard holds the complete detail."""
    briefing = briefing or build_briefing(facts)
    lines = [f"# Morning Brief · {facts.get('date')}", ""]

    one = briefing.get("one_thing", {})
    lines.extend(
        [
            "## One Thing To Know",
            f"**{one.get('title', 'A quiet start')}** — {one.get('detail') or one.get('summary') or ''}",
            "",
        ]
    )

    if ai_summary:
        lines.extend(["## Editor’s Note", ai_summary.strip(), ""])

    lines.append("## Right Now")
    actions = briefing.get("actions", [])[:4]
    if actions:
        for item in actions:
            lines.append(f"- **{item.get('title')}** — {item.get('detail', '')}")
    else:
        lines.append("- Nothing urgent was detected this morning.")

    lines.extend(["", "## Weather"])
    append_weather(lines, facts.get("weather", []))

    lines.extend(["", "## Sports & Events"])
    append_sports(lines, facts.get("sports", {}))

    lines.extend(["", "## Market Watchlist"])
    append_markets(lines, facts.get("market_watchlist", []))

    lines.extend(["", "## New Since Yesterday"])
    for item in briefing.get("new_items", [])[:5]:
        source = f" · {item.get('source')}" if item.get("source") else ""
        lines.append(f"- {markdown_link(item.get('title'), item.get('link'))}{source}")
    if not briefing.get("new_items"):
        lines.append("- No new high-priority headlines were collected.")

    if dashboard_url:
        lines.extend(["", f"[Open the full dashboard]({dashboard_url}) for every section, source link, and previous brief."])
    return "\n".join(lines)


def render_full_brief(
    facts: dict[str, Any], briefing: dict[str, Any] | None = None
) -> str:
    """Render a complete Markdown edition for archives and non-web clients."""
    briefing = briefing or build_briefing(facts)
    lines = [render_fallback(facts, briefing), ""]
    for section in NEWS_SECTIONS:
        lines.extend([f"## {SECTION_LABELS[section]}"])
        items = briefing.get("news", {}).get(section, [])
        if not items:
            lines.append("- No items collected.")
        for item in items[:6]:
            repeat = " · seen yesterday" if item.get("repeated") else ""
            lines.append(
                f"- {markdown_link(item.get('title'), item.get('link'))}"
                f" · {item.get('source', 'Unknown source')}{repeat}"
            )
        lines.append("")
    return "\n".join(lines).strip()


def append_weather(lines: list[str], weather: list[dict[str, Any]]) -> None:
    if not weather:
        lines.append("- Weather unavailable.")
    for item in weather:
        if item.get("error"):
            lines.append(f"- **{item.get('location')}**: unavailable")
            continue
        periods = item.get("forecast_periods", [])[:2]
        details = []
        for period in periods:
            temp = period.get("temperature")
            temp_text = f"{temp}°{period.get('temperature_unit', '')}" if temp is not None else ""
            details.append(
                " · ".join(
                    str(value)
                    for value in (period.get("name"), temp_text, period.get("short_forecast"))
                    if value
                )
            )
        lines.append(f"- **{item.get('location')}**: {'; '.join(details)}")


def append_sports(lines: list[str], sports: Any) -> None:
    followed = sports.get("followed_teams", []) if isinstance(sports, dict) else sports
    major = sports.get("major_events", []) if isinstance(sports, dict) else []
    games = (followed + major)[:6]
    if not games:
        lines.append("- No followed games or major events in the lookahead window.")
    for game in games:
        lines.append(
            f"- **{game.get('followed_team') or 'Major event'}**: "
            f"{game.get('event')} · {game.get('starts_at')}"
        )


def append_markets(lines: list[str], watchlist: list[dict[str, Any]]) -> None:
    available = [item for item in watchlist if not item.get("error")]
    if not available:
        lines.append("- Market data unavailable.")
    for item in available:
        change = item.get("change_percent")
        movement = f"{change:+.2f}%" if isinstance(change, (int, float)) else "—"
        lines.append(
            f"- **{item.get('symbol')}** {item.get('price')} {item.get('currency') or ''} · {movement}"
        )


def markdown_link(label: Any, url: Any) -> str:
    text = str(label or "Untitled")
    value = str(url or "")
    if value.startswith(("https://", "http://")):
        return f"[{text}]({value})"
    return text
