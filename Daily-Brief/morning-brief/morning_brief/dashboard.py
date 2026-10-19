from __future__ import annotations

import calendar
import html
import json
import re
import shutil
from datetime import date as calendar_date
from collections import defaultdict
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from morning_brief.markdown_email import markdown_to_html
from morning_brief.prioritization import NEWS_SECTIONS, SECTION_LABELS
from morning_brief.time_format import format_eastern, eastern_datetime


def write_dashboard(
    output_dir: Path,
    facts: dict[str, Any],
    briefing: dict[str, Any],
    ai_summary: str | None = None,
) -> Path:
    date_slug = str(facts.get("date"))
    archive = sorted(
        (path.stem for path in output_dir.glob("????-??-??.html")), reverse=True
    )
    if date_slug not in archive:
        archive.insert(0, date_slug)
    refresh_archive_navigation(output_dir, date_slug)
    write_archive(output_dir, archive)
    page = render_dashboard(facts, briefing, archive[:30], ai_summary)
    dated_path = output_dir / f"{date_slug}.html"
    dated_path.write_text(page, encoding="utf-8")
    shutil.copyfile(dated_path, output_dir / "index.html")
    (output_dir / "latest.json").write_text(
        json.dumps(facts, indent=2, sort_keys=True), encoding="utf-8"
    )
    (output_dir / "robots.txt").write_text(
        "User-agent: *\nDisallow: /\n", encoding="utf-8"
    )
    (output_dir / "_headers").write_text(NETLIFY_HEADERS, encoding="utf-8")
    return dated_path


def dashboard_header(date: str, latest_date: str) -> str:
    latest_link = '<a class="latest-brief" href="index.html">← Latest brief</a>' if date != latest_date else ''
    try:
        label = calendar_date.fromisoformat(date).strftime("%b %d, %Y")
        if date != latest_date:
            label = "Archived brief · " + label
    except ValueError:
        label = date
    return f'''<header class="hero">
        <div><h1>Good morning.</h1><time class="brief-date" datetime="{escape(date)}">{escape(label)}</time></div>
        <div class="hero-meta">{latest_link}
          <a class="archive-button" href="archive.html"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 11h18"/></svg>Past briefs</a>
        </div>
      </header>'''


def refresh_archive_navigation(output_dir: Path, latest_date: str) -> int:
    """Refresh navigation and sports disclosure while preserving saved report data."""
    updated = 0
    for path in output_dir.glob("????-??-??.html"):
        page = path.read_text(encoding="utf-8")
        header = dashboard_header(path.stem, latest_date)
        revised = re.sub(r'<header class="hero">.*?</header>', lambda match: header, page, count=1, flags=re.DOTALL)
        facts_path = output_dir / f"{path.stem}-facts.json"
        if facts_path.exists():
            try:
                saved = json.loads(facts_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                saved = {}
            sports = saved.get("sports")
            if sports is not None:
                followed = sports.get("followed_teams", []) if isinstance(sports, dict) else sports
                major = sports.get("major_events", []) if isinstance(sports, dict) else []
                groups = render_sports_groups(followed + major, followed_teams={str(item.get("followed_team")) for item in followed})
                if not groups:
                    groups = '<p class="empty">No followed games or major events in the window.</p>'
                revised = replace_sports_groups(revised, groups)
        navigation_style = f'<style data-brief-navigation>{NAVIGATION_CSS}</style>'
        if '<style data-brief-navigation>' in revised:
            revised = re.sub(r'<style data-brief-navigation>.*?</style>', lambda match: navigation_style, revised, count=1, flags=re.DOTALL)
        else:
            revised = revised.replace('</head>', navigation_style + '</head>', 1)
        if revised != page:
            path.write_text(revised, encoding="utf-8")
            updated += 1
    return updated


def replace_sports_groups(page: str, groups: str) -> str:
    marker = '<div class="sport-groups">'
    start = page.find(marker)
    if start < 0:
        return page
    depth = 0
    for tag in re.finditer(r'<div\b[^>]*>|</div>', page[start:]):
        depth += -1 if tag.group().startswith('</') else 1
        if depth == 0:
            end = start + tag.end()
            return page[:start] + marker + groups + '</div>' + page[end:]
    return page


def write_archive(output_dir: Path, days: list[str]) -> None:
    available = set()
    for day in days:
        try:
            available.add(calendar_date.fromisoformat(day))
        except ValueError:
            continue
    months = sorted({(day.year, day.month) for day in available}, reverse=True)
    panels = []
    for index, (year, month) in enumerate(months):
        label = f"{calendar.month_name[month]} {year}"
        cells = []
        for week in calendar.Calendar(firstweekday=6).monthdayscalendar(year, month):
            for number in week:
                if not number:
                    cells.append('<span class="calendar-blank" aria-hidden="true"></span>')
                    continue
                day = calendar_date(year, month, number)
                if day in available:
                    cells.append(f'<a class="calendar-day available" href="{day.isoformat()}.html" aria-label="Open brief for {day.strftime("%B %d, %Y")}">{number}<span class="calendar-dot" aria-hidden="true"></span></a>')
                else:
                    cells.append(f'<span class="calendar-day unavailable" aria-label="{day.strftime("%B %d, %Y")}: no saved brief">{number}</span>')
        weekdays = ''.join(f'<span class="calendar-weekday">{name}</span>' for name in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
        panels.append(f'<section class="calendar-month" data-month="{index}" aria-label="{label}"{ " hidden" if index else ""}><h2>{label}</h2><div class="calendar-grid">{weekdays}{"".join(cells)}</div></section>')
    body = f'''<header class="hero compact"><h1>Past briefs</h1><a class="back" href="index.html">← Latest brief</a></header>
    <main><section class="archive-layout"><div class="calendar-card">
    <nav class="calendar-nav" aria-label="Browse months"><button id="older-month" type="button" aria-label="Previous month"{' disabled' if len(months) < 2 else ''}>←</button><button id="newer-month" type="button" aria-label="Next month" disabled>→</button></nav>
    <div id="calendar-months" aria-live="polite">{''.join(panels) or '<p class="empty">No saved briefs yet.</p>'}</div>
    </div></section></main>
    <script>const months=Array.from(document.querySelectorAll('.calendar-month'));let current=0;
    const older=document.getElementById('older-month'),newer=document.getElementById('newer-month');
    function showMonth(index){{current=index;months.forEach((month,i)=>month.hidden=i!==current);older.disabled=current>=months.length-1;newer.disabled=current===0;}}
    older.addEventListener('click',()=>showMonth(current+1));newer.addEventListener('click',()=>showMonth(current-1));</script>'''
    (output_dir / "archive.html").write_text(document("Past briefs", body), encoding="utf-8")


def write_comparison_page(
    output_dir: Path,
    date_slug: str,
    outputs: dict[str, dict[str, Any]],
) -> Path:
    columns = []
    for model, result in outputs.items():
        content = result.get("text") or result.get("error") or "No output returned."
        usage = result.get("usage", {})
        usage_line = ""
        if usage:
            usage_line = (
                f"<p class='meta'>Input: {escape(usage.get('input_tokens', '?'))} tokens · "
                f"Output: {escape(usage.get('output_tokens', '?'))} tokens</p>"
            )
        columns.append(
            f"<article class='compare-card'><p class='eyebrow'>MODEL</p>"
            f"<h2>{escape(model)}</h2>{usage_line}"
            f"<div class='model-output'>{markdown_fragment(str(content)) if result.get('format') == 'markdown' else paragraphs(str(content))}</div></article>"
        )
    body = f"""
      <header class="hero compact">
        <p class="eyebrow">DAILY BRIEF LAB</p>
        <h1>Is the API earning its place?</h1>
        <p class="lede">The complete free brief beside the same brief with its optional API-written editor’s note · {escape(date_slug)}</p>
        <a class="back" href="index.html">← Back to today’s brief</a>
      </header>
      <main class="comparison">{''.join(columns)}</main>
    """
    path = output_dir / f"{date_slug}-model-comparison.html"
    path.write_text(document("Model comparison", body), encoding="utf-8")
    return path


def render_dashboard(
    facts: dict[str, Any],
    briefing: dict[str, Any],
    archive: list[str],
    ai_summary: str | None,
) -> str:
    date = str(facts.get("date", "Today"))
    one = briefing.get("one_thing", {})
    filters = "".join(
        f'<button class="filter" data-filter="{escape(section)}">{escape(label)}</button>'
        for section, label in SECTION_LABELS.items()
    )
    ai_block = ""
    if ai_summary:
        ai_block = f"""
          <section class="editorial">
            <p class="eyebrow">AI EDITOR’S NOTE · OPTIONAL</p>
            {paragraphs(ai_summary)}
          </section>
        """

    weather = "".join(weather_card(item) for item in facts.get("weather", []))
    lead_identity = (one.get("title"), one.get("link"))
    highlights = [
        item for item in briefing.get("actions", [])
        if not one.get("title") or (item.get("title"), item.get("link")) != lead_identity
    ]
    actions = "".join(action_card(item) for item in highlights[:4])
    if not actions:
        actions = '<p class="empty">No additional highlights this morning.</p>'
    changes = "".join(news_card(item, compact=True) for item in briefing.get("new_items", [])[:6])
    if not changes:
        changes = '<p class="empty">No new high-priority headlines since the previous brief.</p>'
    news_sections = "".join(
        news_section(section, briefing.get("news", {}).get(section, []))
        for section in NEWS_SECTIONS
    )

    sports = facts.get("sports", {})
    followed = sports.get("followed_teams", []) if isinstance(sports, dict) else sports
    major = sports.get("major_events", []) if isinstance(sports, dict) else []
    sports_groups = render_sports_groups(followed + major, followed_teams={str(item.get("followed_team")) for item in followed})
    if not sports_groups:
        sports_groups = '<p class="empty">No followed games or major events in the window.</p>'
    markets = "".join(market_card(item) for item in facts.get("market_watchlist", []))

    body = f"""
      {dashboard_header(date, max(archive, default=date))}
      <main>
        <section class="signal">
          <p class="eyebrow">ONE THING TO KNOW</p>
          <h2>{escape(one.get('title', 'A quiet start'))}</h2>
          <p>{escape(one.get('detail') or one.get('summary') or '')}</p>
          {optional_link(one.get('link'), 'Details')}
          {alert_details(one)}
        </section>
        {ai_block}
        <section>
          <div class="section-heading"><div><p class="eyebrow">RIGHT NOW</p><h2>Today’s highlights</h2></div></div>
          <div class="card-grid actions">{actions}</div>
        </section>
        <section>
          <div class="section-heading"><div><p class="eyebrow">AT A GLANCE</p><h2>Weather</h2></div></div>
          <div class="card-grid weather-grid">{weather or '<p class="empty">Weather unavailable.</p>'}</div>
        </section>
        <section>
          <div class="section-heading"><div><p class="eyebrow">COMING UP</p><h2>Sports & events</h2></div></div>
          <div class="sport-groups">{sports_groups}</div>
        </section>
        <section>
          <div class="section-heading"><div><p class="eyebrow">WATCHLIST</p><h2>Markets</h2></div></div>
          <div class="ticker-grid">{markets or '<p class="empty">Market data unavailable.</p>'}</div>
        </section>
        <section>
          <div class="section-heading"><div><p class="eyebrow">SINCE YESTERDAY</p><h2>What changed</h2></div></div>
          <div class="story-list">{changes}</div>
        </section>
        <section>
          <div class="section-heading"><div><p class="eyebrow">EXPLORE</p><h2>News worth opening</h2></div></div>
          <div class="filters"><button class="filter active" data-filter="all">All</button>{filters}</div>
          <div id="news-sections">{news_sections}</div>
        </section>
      </main>
      <footer>Generated locally from your selected sources · <a href="latest.json">View source facts</a></footer>
      <script>{SCRIPT}</script>
    """
    return document(f"Daily Brief · {date}", body)


def weather_card(item: dict[str, Any]) -> str:
    location = escape(item.get("location"))
    if item.get("error"):
        return f'<article class="card weather-card"><h3>{location}</h3><p class="quiet">Weather unavailable.</p></article>'
    periods = [period for period in item.get("forecast_periods", [])[:14] if not period.get("error")]
    if not periods:
        return f'<article class="card weather-card"><h3>{location}</h3><p class="quiet">Forecast unavailable.</p></article>'
    def period_tile(period: dict[str, Any]) -> str:
        name = str(period.get("name") or "Forecast")
        daytime = period.get("is_daytime")
        if daytime is None:
            daytime = "night" not in name.lower()
        label = "High" if daytime else "Low"
        temp = period.get("temperature")
        temperature = f"{temp}°{period.get('temperature_unit') or ''}" if temp is not None else "—"
        extras = []
        if period.get("wind"):
            extras.append(f"Wind: {period['wind']}")
        rain = period.get("precipitation_probability")
        if isinstance(rain, (int, float)):
            extras.append(f"Precipitation: {rain:g}%")
        return (f'<div class="weather-period"><span class="weather-period-name">{escape(name)}</span>'
                f'<strong class="weather-temperature"><span>{label} </span>{escape(temperature)}</strong>'
                f'<p class="weather-condition">{escape(period.get("short_forecast"))}</p>'
                f'<p class="weather-meta">{escape(" · ".join(extras))}</p></div>')
    tiles = ''.join(period_tile(period) for period in periods[:2])
    outlook = daily_weather_rows(periods)
    details = f'<details class="weather-outlook"><summary>Daily forecast</summary>{outlook}</details>' if outlook else ''
    return f'<article class="card weather-card"><h3>{location}</h3><div class="weather-pair">{tiles}</div>{details}</article>'


def daily_weather_rows(periods: list[dict[str, Any]]) -> str:
    days: dict[str, dict[str, Any]] = {}
    for period in periods:
        name = str(period.get("name") or "Forecast")
        start = eastern_datetime(period.get("start_time"))
        key = start.date().isoformat() if start else name.lower().replace(" night", "").replace("tonight", "today")
        label = "Today" if name.lower() in {"today", "tonight", "this afternoon", "this morning", "this evening", "overnight"} else start.strftime("%a") if start else name.replace(" Night", "")
        day = days.setdefault(key, {"label": label, "periods": []})
        daytime = period.get("is_daytime")
        if daytime is None:
            daytime = "night" not in name.lower()
        day["high" if daytime else "low"] = period.get("temperature")
        day["unit"] = period.get("temperature_unit") or ""
        if daytime or not day.get("condition"):
            day["condition"] = period.get("short_forecast") or ""
        day["periods"].append(period)
    values = [value for day in days.values() for key in ("low", "high") if isinstance((value := day.get(key)), (int, float))]
    minimum = min(values) if values else 0
    maximum = max(values) if values else 1
    spread = maximum - minimum or 1
    rows = []
    for day in days.values():
        low, high = day.get("low"), day.get("high")
        def temperature(value: Any) -> str:
            return f"{value}°" if isinstance(value, (int, float)) else "—"
        bar = '<span class="range-track" aria-hidden="true"></span>'
        if isinstance(low, (int, float)) and isinstance(high, (int, float)) and low <= high:
            left = (low - minimum) / spread * 100
            width = (high - low) / spread * 100
            bar = f'<span class="range-track" aria-hidden="true"><span style="left:{left:.2f}%;width:{width:.2f}%"></span></span>'
        rain = [p.get("precipitation_probability") for p in day["periods"] if isinstance(p.get("precipitation_probability"), (int, float))]
        rain_text = f'<span class="daily-rain">Rain {max(rain):g}%</span>' if rain else ''
        condition = escape(day.get("condition"))
        unit = escape(day.get("unit"))
        rows.append(f'<div class="daily-row"><strong>{escape(day["label"])}</strong><span class="daily-condition">{condition}{rain_text}</span>'
                    f'<span class="daily-low" aria-label="Low {temperature(low)}{unit}">{temperature(low)}</span>{bar}'
                    f'<strong class="daily-high" aria-label="High {temperature(high)}{unit}">{temperature(high)}</strong></div>')
    return '<div class="daily-forecast"><div class="daily-labels"><span>Day / conditions</span><span>Low / high</span></div>' + ''.join(rows) + '</div>'


def action_card(item: dict[str, Any]) -> str:
    return (
        f'<article class="card action {escape(item.get("kind", "status"))}">'
        f'<p class="eyebrow">{escape(str(item.get("kind", "notice")).upper())}</p>'
        f'<h3>{escape(item.get("title"))}</h3><p>{escape(item.get("detail"))}</p>'
        f'{optional_link(item.get("link"), "Details")}{alert_details(item)}</article>'
    )


def alert_details(item: dict[str, Any]) -> str:
    if not item.get("alert_description") and not item.get("alert_instruction"):
        return ''
    description = paragraphs(str(item.get("alert_description") or ""))
    instruction = paragraphs(str(item.get("alert_instruction") or ""))
    expires = f'<p>Expires {escape(format_eastern(item["expires"]))}</p>' if item.get("expires") else ''
    return f'<details class="alert-details"><summary>Read saved bulletin</summary>{description}{instruction}{expires}</details>'


def news_section(section: str, items: list[dict[str, Any]]) -> str:
    stories = "".join(news_card(item) for item in items[:6])
    if not stories:
        stories = '<p class="empty">No items collected.</p>'
    return (
        f'<details class="news-group" data-section="{escape(section)}">'
        f'<summary><span>{escape(SECTION_LABELS[section])}</span>'
        f'<span class="story-count">{len(items[:6])} stories</span></summary>'
        f'<div class="story-list">{stories}</div></details>'
    )


def news_card(item: dict[str, Any], compact: bool = False) -> str:
    summary = str(item.get("summary", ""))
    if compact or len(summary) > 260:
        summary = summary[:257].rstrip() + ("…" if len(summary) > 257 else "")
    return f"""
      <article class="story">
        <div class="story-copy">
          <p class="source">{escape(item.get('source'))} · {escape(format_eastern(item.get('published_at')))}</p>
          <h4>{news_headline_link(item.get('link'), item.get('title'))}</h4>
          {f'<p>{escape(summary)}</p>' if summary else ''}
        </div>
      </article>
    """


def event_card(item: dict[str, Any]) -> str:
    return (
        f'<article class="card"><p class="eyebrow">{escape(item.get("followed_team") or "EVENT")}</p>'
        f'<h3>{safe_link(item.get("source_url"), item.get("event"), class_name="story-link")}</h3>'
        f'<p>{escape(format_eastern(item.get("starts_at")))}</p></article>'
    )


def render_sports_groups(
    items: list[dict[str, Any]],
    per_sport: int = 3,
    followed_teams: set[str] | None = None,
) -> str:
    if followed_teams is None:
        followed_teams = {str(item.get("followed_team")) for item in items if str(item.get("followed_team", "")).startswith("Atlanta ")}
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    seen = set()
    ordered = sorted(items, key=lambda item: (item.get("followed_team") not in followed_teams, str(item.get("starts_at") or "")))
    for item in ordered:
        sport = str(item.get("sport_path") or "other").split("/", 1)[0]
        identity = (sport, item.get("event_id") or item.get("source_url") or (item.get("event"), item.get("starts_at")))
        if identity in seen:
            continue
        seen.add(identity)
        grouped[sport].append(item)

    groups = []
    for sport, events in grouped.items():
        visible, remaining = events[:per_sport], events[per_sport:]
        label = SPORT_LABELS.get(sport, sport.replace("_", " ").title())
        more = ''
        if remaining:
            more = (f'<details class="sports-more"><summary>'
                    f'<span class="sports-show">Show all {len(events)} events</span><span class="sports-hide">Show fewer events</span></summary>'
                    f'<div class="card-grid">{"".join(event_card(item) for item in remaining)}</div></details>')
        groups.append(
            f'<section class="sport-group"><div class="sport-heading">'
            f'<h3>{escape(label)}</h3></div>'
            f'<div class="card-grid">{"".join(event_card(item) for item in visible)}</div>{more}</section>'
        )
    return "".join(groups)


def market_card(item: dict[str, Any]) -> str:
    if item.get("error"):
        return ""
    change = item.get("change_percent")
    css = "flat"
    change_text = "—"
    if isinstance(change, (int, float)):
        css = "up" if change >= 0 else "down"
        change_text = f"{change:+.2f}%"
    history_change = item.get("history_change_percent")
    history_css = "flat"
    history_text = "6M —"
    if isinstance(history_change, (int, float)):
        history_css = "up" if history_change >= 0 else "down"
        history_text = f"6M {history_change:+.1f}%"
    chart = market_sparkline(
        item.get("history_6m", []),
        str(item.get("symbol", "Market")),
        history_change,
    )
    return (
        f'<article class="ticker"><div class="ticker-top"><div><strong>{escape(item.get("symbol"))}</strong>'
        f'<span>{escape(item.get("name"))}</span></div><div class="price">{escape(item.get("price"))}'
        f'<span class="{css}">{escape(change_text)}</span></div></div>{chart}'
        f'<span class="market-period {history_css}">{escape(history_text)}</span></article>'
    )


def market_sparkline(history: list[dict[str, Any]], symbol: str, change: Any) -> str:
    values = [
        float(point["close"])
        for point in history
        if isinstance(point, dict) and isinstance(point.get("close"), (int, float))
    ]
    if len(values) < 2:
        return '<div class="sparkline empty-chart" aria-hidden="true"></div>'
    if len(values) > 64:
        values = [values[round(index * (len(values) - 1) / 63)] for index in range(64)]
    low, high = min(values), max(values)
    spread = high - low
    points = []
    for index, value in enumerate(values):
        x = index * 240 / (len(values) - 1)
        y = 26 if spread == 0 else 4 + ((high - value) / spread * 44)
        points.append(f"{x:.1f},{y:.1f}")
    direction = "up" if isinstance(change, (int, float)) and change >= 0 else "down"
    description = (
        f"{symbol} six-month trend, {change:+.1f} percent"
        if isinstance(change, (int, float))
        else f"{symbol} six-month trend"
    )
    return (
        f'<svg class="sparkline {direction}" viewBox="0 0 240 52" role="img" '
        f'aria-label="{escape(description)}" preserveAspectRatio="none">'
        f'<polyline points="{escape(" ".join(points))}"/></svg>'
    )


def document(title: str, body: str) -> str:
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,">
<title>{escape(title)}</title><style>{CSS}</style></head><body>{body}</body></html>"""


def escape(value: Any) -> str:
    return html.escape("" if value is None else str(value))


def compact_date(value: str) -> str:
    parts = value.split("-")
    if len(parts) == 3 and len(parts[0]) == 4 and all(part.isdigit() for part in parts):
        return f"{parts[0][2:]}-{parts[1]}-{parts[2]}"
    return value


def safe_link(url: Any, label: Any, class_name: str = "text-link") -> str:
    value = str(url or "")
    if urlparse(value).scheme not in {"http", "https"}:
        return escape(label)
    return f'<a class="{escape(class_name)}" href="{escape(value)}" target="_blank" rel="noopener noreferrer">{escape(label)}</a>'


def news_headline_link(url: Any, label: Any) -> str:
    value = str(url or "")
    if urlparse(value).scheme not in {"http", "https"}:
        return escape(label)
    return (
        f'<a class="story-link" href="{escape(value)}" target="_blank" '
        f'rel="noopener noreferrer">{escape(label)} '
        f'<span class="link-arrow" aria-hidden="true">↗</span>'
        f'<span class="sr-only"> (opens original story in a new tab)</span></a>'
    )


def optional_link(url: Any, label: Any, class_name: str = "text-link") -> str:
    value = str(url or "")
    if urlparse(value).scheme not in {"http", "https"}:
        return ""
    return safe_link(value, label, class_name)


def paragraphs(value: str) -> str:
    return "".join(f"<p>{escape(part.strip())}</p>" for part in value.split("\n\n") if part.strip())


def markdown_fragment(value: str) -> str:
    rendered = markdown_to_html(value)
    return rendered.partition("<body>")[2].partition("</body>")[0]


MOBILE_HEADER_CSS = """
@media(max-width:650px){
.hero:not(.compact){display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;column-gap:12px;row-gap:10px}
.hero:not(.compact)>div:first-child{display:contents}
.hero:not(.compact) h1{grid-column:1/-1}
.hero:not(.compact) .brief-date{grid-column:1;grid-row:2;margin:0}
.hero:not(.compact) .hero-meta{grid-column:2;grid-row:2;justify-content:flex-end;gap:8px;max-width:150px}
}
"""


NAVIGATION_CSS = """
.hero:not(.compact){display:flex;align-items:center;justify-content:space-between;gap:20px}.hero:not(.compact) h1{margin:0}.hero-meta{display:flex;align-items:center;flex-wrap:wrap;justify-content:flex-end;gap:16px;flex-shrink:0}.archive-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;border:1px solid var(--line);border-radius:9px;background:var(--card);font-size:.85rem;font-weight:700;text-decoration:none;white-space:nowrap}.archive-button:hover{border-color:var(--green);color:var(--green)}.brief-date{display:block;font-size:.75rem;color:var(--muted);margin-top:9px}.latest-brief{font-size:.8rem;font-weight:600;text-underline-offset:3px}
@media(max-width:650px){.hero:not(.compact){align-items:flex-start;flex-direction:column;gap:16px;padding:28px 0 22px}.hero:not(.compact) h1{font-size:clamp(2.8rem,11vw,4rem)}.hero-meta{justify-content:flex-start}.archive-button{padding:8px 12px;font-size:.8rem}}
.sports-more{margin-top:12px}.sports-more summary{color:var(--green);font-size:.8rem;font-weight:700;cursor:pointer;width:fit-content;padding:6px 0}.sports-more>.card-grid{margin-top:12px}.sports-hide,.sports-more[open] .sports-show{display:none}.sports-more[open] .sports-hide{display:inline}
""" + MOBILE_HEADER_CSS


CSS = """
:root{--ink:#17201d;--muted:#66706b;--paper:#f3f0e8;--card:#fffdf8;--line:#d9d5ca;--green:#1c5b47;--lime:#dce9a8;--red:#a13f37;--shadow:0 14px 35px rgba(34,45,40,.08)}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.5}a{color:inherit}body>header,main,footer{width:min(1120px,calc(100% - 32px));margin-inline:auto}.hero{display:flex;justify-content:space-between;gap:40px;padding:64px 0 34px;border-bottom:1px solid var(--line)}.hero.compact{display:block}.hero h1{font-family:Georgia,serif;font-size:clamp(3rem,8vw,6.4rem);font-weight:500;letter-spacing:-.055em;line-height:.96;margin:.16em 0}.hero.compact h1{font-size:clamp(2.6rem,6vw,5rem)}.eyebrow{color:var(--green);font-size:.72rem;font-weight:800;letter-spacing:.14em;margin:0 0 8px}.lede{color:var(--muted);font-size:1.08rem;max-width:620px}main>section{padding:42px 0;border-bottom:1px solid var(--line)}.signal{background:var(--green);color:white;margin-top:30px;padding:36px;border-radius:18px;border:0;box-shadow:var(--shadow)}.signal .eyebrow{color:var(--lime)}.signal h2{font-family:Georgia,serif;font-size:clamp(2rem,5vw,3.8rem);font-weight:500;line-height:1.05;max-width:800px;margin:10px 0}.signal p:not(.eyebrow){max-width:760px;color:#e7eee9}.editorial{padding:26px 30px;margin-top:18px;background:#e7eadb;border:1px solid #cdd3b4;border-radius:14px}.editorial p:last-child{margin-bottom:0}.section-heading{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:20px}.section-heading h2{font-family:Georgia,serif;font-size:2.25rem;font-weight:500;letter-spacing:-.03em;margin:0}.quiet,.empty{color:var(--muted)}.card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px;box-shadow:0 5px 18px rgba(34,45,40,.035)}.card h3{margin:4px 0 8px;font-size:1.05rem}.card p:last-child{margin-bottom:0}.action{border-top:4px solid var(--green)}.action.weather{border-top-color:var(--red)}.story-list{display:grid;gap:8px}.story{display:flex;justify-content:space-between;gap:18px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px}.story h4{font-size:1.05rem;line-height:1.35;margin:3px 0}.story p{color:var(--muted);font-size:.9rem;margin:7px 0 0}.story .source{font-size:.7rem;text-transform:uppercase;letter-spacing:.06em}.story-link{text-decoration:underline;text-decoration-color:#92aa9f;text-decoration-thickness:1px;text-underline-offset:3px}.story-link:hover{color:var(--green);text-decoration-thickness:2px}.story-link:focus-visible{outline:3px solid var(--lime);outline-offset:3px;border-radius:2px}.link-arrow{display:inline-block;color:var(--green);font-size:.82em;font-weight:800;text-decoration:none}.badge{display:inline-block;background:#eee9dd;border-radius:20px;padding:2px 7px;margin-left:5px;text-transform:none;letter-spacing:0}.badge.new{background:var(--lime);color:#334018}.save{align-self:start;border:0;background:transparent;color:var(--green);font-size:1.45rem;cursor:pointer}.save.saved{color:#bd7d16}.news-group{padding:20px 0}.news-group h3{font-family:Georgia,serif;font-size:1.55rem;font-weight:500}.filters{display:flex;gap:8px;overflow-x:auto;padding-bottom:8px}.filter{white-space:nowrap;border:1px solid var(--line);border-radius:30px;padding:8px 13px;background:transparent;color:var(--ink);cursor:pointer}.filter.active{background:var(--ink);color:white}.ticker-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px}.ticker{display:flex;justify-content:space-between;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px}.ticker span{display:block;color:var(--muted);font-size:.75rem}.ticker .price{text-align:right;font-weight:700}.ticker .up{color:var(--green)}.ticker .down{color:var(--red)}.text-link,.back{display:inline-block;margin-top:8px;font-weight:700;text-underline-offset:3px}.comparison{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:16px;padding:30px 0}.compare-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:26px}.compare-card h2{font-family:Georgia,serif;font-size:2rem;margin:0}.model-output{margin-top:24px}.meta{color:var(--muted);font-size:.8rem}footer{padding:30px 0 60px;color:var(--muted);font-size:.8rem}
.sport-groups{display:grid;gap:28px}.sport-heading{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:12px}.sport-heading h3{font-family:Georgia,serif;font-size:1.55rem;font-weight:500;margin:0}.sport-heading span{color:var(--muted);font-size:.75rem}.news-group{padding:0;margin:12px 0;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}.news-group summary{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 20px;cursor:pointer;font-family:Georgia,serif;font-size:1.55rem;list-style:none}.news-group summary::-webkit-details-marker{display:none}.news-group summary:after{content:'+';font-family:Inter,sans-serif;color:var(--green);font-size:1.5rem}.news-group[open] summary:after{content:'−'}.news-group .story-list{padding:0 12px 12px}.story-count{margin-left:auto;color:var(--muted);font-family:Inter,sans-serif;font-size:.75rem}.filters{scrollbar-width:none;-ms-overflow-style:none;touch-action:pan-x;overscroll-behavior-inline:contain}.filters::-webkit-scrollbar{display:none}
.hero{display:block}.hero h1{margin:0 0 18px}.hero-meta{display:flex;align-items:center;justify-content:space-between;gap:16px}.hero-meta .eyebrow{margin:0}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.story-copy{width:100%}.ticker-grid{grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px}.ticker{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;padding:12px}.ticker-top{display:flex;justify-content:space-between;gap:12px}.sparkline{display:block;width:calc(100% + 12px);max-width:none;height:52px;margin-inline:-6px;color:var(--muted)}.sparkline polyline{fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}.sparkline.up{color:var(--green)}.sparkline.down{color:var(--red)}.empty-chart{height:52px;background:linear-gradient(180deg,transparent 49%,var(--line) 50%,transparent 51%)}.ticker .market-period{font-size:.68rem;font-weight:700;text-align:right}.ticker .market-period.up{color:var(--green)}.ticker .market-period.down{color:var(--red)}
@media(min-width:651px){.hero{padding:34px 0 22px}.hero h1{font-size:clamp(4rem,6vw,4.8rem);margin:0 0 12px}.signal{margin-top:22px;padding:26px 32px}.signal h2{font-size:clamp(2.25rem,3.5vw,3rem);line-height:1.02;max-width:940px;margin:8px 0}.signal p:not(.eyebrow){margin:10px 0}.signal .text-link{margin-top:2px}main>section{padding:30px 0}.section-heading{margin-bottom:16px}}
@media(max-width:650px){.hero{padding-top:38px}.hero-meta{align-items:flex-start}.signal{padding:25px}.section-heading{display:block}.story{padding:15px}}
[hidden]{display:none!important}
.hero:not(.compact){display:flex;align-items:center;justify-content:space-between;gap:20px}.hero:not(.compact) h1{margin:0}.hero-meta{flex-shrink:0}
.archive-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 14px;border:1px solid var(--line);border-radius:9px;background:var(--card);font-size:.85rem;font-weight:700;text-decoration:none;white-space:nowrap}.archive-button:hover{border-color:var(--green);color:var(--green)}
.actions{grid-template-columns:repeat(4,minmax(0,1fr))}.action{display:flex;flex-direction:column;min-width:0}.action .text-link{align-self:flex-start;margin-top:auto}.action h3{line-height:1.4}.action>p:not(.eyebrow){font-size:.92rem}
.weather-grid{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start}.weather-card h3{font-size:.8rem;letter-spacing:.12em;color:var(--green);margin:0 0 14px}.weather-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.weather-period{min-width:0}.weather-period+.weather-period{border-left:1px solid var(--line);padding-left:14px}.weather-period-name{font-size:.8rem;font-weight:700}.weather-temperature{display:block;font-size:1.8rem;line-height:1.25;margin:5px 0}.weather-temperature span{font-size:.7rem;color:var(--muted);font-weight:500}.weather-condition{font-size:.87rem;margin:5px 0}.weather-meta{font-size:.72rem;color:var(--muted);margin:5px 0 0}.weather-outlook{border-top:1px solid var(--line);margin-top:15px;padding-top:10px}.weather-outlook summary{font-size:.77rem;font-weight:600;color:var(--green);cursor:pointer}.weather-outlook .weather-pair{margin-top:14px}
.archive-layout{border:0;display:flex;justify-content:center}.calendar-card{width:min(100%,640px);padding:26px;background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow)}.calendar-nav{display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--muted);font-size:.8rem}.calendar-nav button{width:42px;height:42px;border:1px solid var(--line);background:transparent;border-radius:9px;font-size:1.2rem;color:var(--green);cursor:pointer}.calendar-nav button:disabled{opacity:.3;cursor:default}.calendar-month h2{font-family:Georgia,serif;font-size:2rem;font-weight:500;text-align:center;margin:18px 0 24px}.calendar-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px}.calendar-weekday{text-align:center;font-size:.7rem;color:var(--muted);padding-bottom:8px}.calendar-day{min-height:56px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border-radius:9px;font-size:.9rem;text-decoration:none}.calendar-day.available{background:#e7eee6;color:var(--green);font-weight:700}.calendar-day.available:hover{background:var(--green);color:white}.calendar-day.unavailable{color:#999d96}.calendar-dot{display:inline-block;width:4px;height:4px;border-radius:50%;background:currentColor}a:focus-visible,button:focus-visible,summary:focus-visible{outline:3px solid var(--green);outline-offset:3px}
@media(max-width:900px){.actions{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:650px){.hero:not(.compact){align-items:flex-start;flex-direction:column;gap:16px;padding:28px 0 22px}.hero:not(.compact) h1{font-size:clamp(2.8rem,11vw,4rem)}.archive-button{padding:8px 12px;font-size:.8rem}.weather-grid{grid-template-columns:minmax(0,1fr);gap:12px}.weather-card{padding:16px}.weather-temperature{font-size:1.6rem}.weather-card h3{margin-bottom:10px}.weather-outlook{margin-top:12px;padding-top:9px}.actions{gap:10px}.action{padding:14px}.action h3{font-size:.94rem}.action>p:not(.eyebrow){font-size:.82rem}.action .eyebrow{font-size:.65rem}.calendar-card{padding:16px}.calendar-grid{gap:4px}.calendar-day{min-height:44px}.calendar-month h2{font-size:1.7rem}}

.daily-forecast{margin-top:12px}.daily-labels{display:flex;justify-content:space-between;color:var(--muted);font-size:.65rem;padding-bottom:6px}.daily-row{display:grid;grid-template-columns:40px minmax(0,1fr) 28px minmax(35px,70px) 28px;gap:8px;align-items:center;padding:12px 0;border-top:1px solid var(--line);font-size:.8rem}.daily-condition{font-size:.72rem;line-height:1.3}.daily-rain{display:block;color:var(--green);font-size:.65rem;margin-top:3px}.daily-low{color:var(--muted);text-align:right}.daily-high{text-align:right}.range-track{position:relative;height:5px;border-radius:5px;background:#e9e7df;overflow:hidden}.range-track>span{position:absolute;height:100%;border-radius:5px;background:linear-gradient(90deg,#72b7af,#cbba5a);min-width:3px}.alert-details{margin-top:12px;font-size:.8rem}.alert-details summary{cursor:pointer;color:var(--green);font-weight:600}.alert-details p{white-space:pre-line}.action .text-link{margin-top:8px}.signal .text-link{color:white}
@media(max-width:400px){.daily-row{gap:6px;grid-template-columns:35px minmax(0,1fr) 26px minmax(28px,45px) 26px;font-size:.75rem}.daily-condition{font-size:.67rem}}

.brief-date{display:block;font-size:.75rem;color:var(--muted);margin-top:9px}.latest-brief{font-size:.8rem;font-weight:600;text-underline-offset:3px}.hero-meta{flex-wrap:wrap;justify-content:flex-end}
@media(max-width:650px){.hero-meta{justify-content:flex-start;gap:16px}}

.sports-more{margin-top:12px}.sports-more summary{color:var(--green);font-size:.8rem;font-weight:700;cursor:pointer;width:fit-content;padding:6px 0}.sports-more>.card-grid{margin-top:12px}.sports-hide,.sports-more[open] .sports-show{display:none}.sports-more[open] .sports-hide{display:inline}

""" + MOBILE_HEADER_CSS


SCRIPT = """
const filters=document.querySelectorAll('.filter');filters.forEach(button=>button.addEventListener('click',()=>{filters.forEach(b=>b.classList.remove('active'));button.classList.add('active');const wanted=button.dataset.filter;document.querySelectorAll('.news-group').forEach(group=>{const matches=wanted==='all'||group.dataset.section===wanted;group.hidden=!matches;if(wanted!=='all')group.open=matches})}));
"""


NETLIFY_HEADERS = """/*
  Cache-Control: private, no-store
  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'
  Referrer-Policy: no-referrer
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-Robots-Tag: noindex, nofollow, noarchive
"""


SPORT_LABELS = {
    "baseball": "Baseball",
    "basketball": "Basketball",
    "football": "Football",
    "hockey": "Hockey",
    "soccer": "Soccer",
    "golf": "Golf",
    "racing": "Racing",
    "tennis": "Tennis",
}
