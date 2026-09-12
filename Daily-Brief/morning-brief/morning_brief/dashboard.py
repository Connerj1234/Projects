from __future__ import annotations

import html
import json
import shutil
from collections import defaultdict
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from morning_brief.markdown_email import markdown_to_html
from morning_brief.prioritization import NEWS_SECTIONS, SECTION_LABELS
from morning_brief.time_format import format_eastern


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
    archive_options = "".join(
        f'<option value="{escape(day)}.html"{" selected" if day == date else ""}>{escape(compact_date(day))}</option>'
        for day in archive
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
    actions = "".join(action_card(item) for item in briefing.get("actions", []))
    if not actions:
        actions = '<p class="empty">Nothing urgent was detected this morning.</p>'
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
    sports_groups = render_sports_groups(followed + major)
    if not sports_groups:
        sports_groups = '<p class="empty">No followed games or major events in the window.</p>'
    markets = "".join(market_card(item) for item in facts.get("market_watchlist", []))

    body = f"""
      <header class="hero">
        <h1>Good morning.</h1>
        <div class="hero-meta">
          <p class="eyebrow">YOUR DAILY BRIEF</p>
          <label class="archive-picker"><span class="sr-only">Past briefs</span>
            <select aria-label="Past briefs" onchange="if(this.value) location.href=this.value">{archive_options}</select>
          </label>
        </div>
      </header>
      <main>
        <section class="signal">
          <p class="eyebrow">ONE THING TO KNOW</p>
          <h2>{escape(one.get('title', 'A quiet start'))}</h2>
          <p>{escape(one.get('detail') or one.get('summary') or '')}</p>
          {optional_link(one.get('link'), 'Open source')}
        </section>
        {ai_block}
        <section>
          <div class="section-heading"><div><p class="eyebrow">RIGHT NOW</p><h2>Today’s highlights</h2></div></div>
          <div class="card-grid actions">{actions}</div>
        </section>
        <section>
          <div class="section-heading"><div><p class="eyebrow">AT A GLANCE</p><h2>Weather</h2></div></div>
          <div class="card-grid">{weather or '<p class="empty">Weather unavailable.</p>'}</div>
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
    if item.get("error"):
        return f'<article class="card"><h3>{escape(item.get("location"))}</h3><p class="quiet">Weather unavailable.</p></article>'
    periods = item.get("forecast_periods", [])[:2]
    rows = []
    for period in periods:
        temp = period.get("temperature")
        unit = period.get("temperature_unit", "")
        rows.append(
            f"<div class='weather-row'><strong>{escape(period.get('name'))}</strong>"
            f"<span>{escape(f'{temp}°{unit}' if temp is not None else '')}</span>"
            f"<p>{escape(period.get('short_forecast'))}</p></div>"
        )
    return f'<article class="card"><p class="eyebrow">{escape(item.get("location"))}</p>{"".join(rows)}</article>'


def action_card(item: dict[str, Any]) -> str:
    return (
        f'<article class="card action {escape(item.get("kind", "status"))}">'
        f'<p class="eyebrow">{escape(str(item.get("kind", "notice")).upper())}</p>'
        f'<h3>{escape(item.get("title"))}</h3><p>{escape(item.get("detail"))}</p>'
        f'{safe_link(item.get("link"), "Details")}</article>'
    )


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


def render_sports_groups(items: list[dict[str, Any]], per_sport: int = 3) -> str:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in sorted(items, key=lambda value: str(value.get("starts_at") or "")):
        sport = str(item.get("sport_path") or "other").split("/", 1)[0]
        grouped[sport].append(item)

    groups = []
    for sport, events in grouped.items():
        visible = events[:per_sport]
        label = SPORT_LABELS.get(sport, sport.replace("_", " ").title())
        count_label = (
            f"Next {len(visible)} of {len(events)}" if len(events) > per_sport
            else f"{len(events)} upcoming"
        )
        groups.append(
            f'<section class="sport-group"><div class="sport-heading">'
            f'<h3>{escape(label)}</h3><span>{escape(count_label)}</span></div>'
            f'<div class="card-grid">{"".join(event_card(item) for item in visible)}</div></section>'
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


CSS = """
:root{--ink:#17201d;--muted:#66706b;--paper:#f3f0e8;--card:#fffdf8;--line:#d9d5ca;--green:#1c5b47;--lime:#dce9a8;--red:#a13f37;--shadow:0 14px 35px rgba(34,45,40,.08)}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.5}a{color:inherit}body>header,main,footer{width:min(1120px,calc(100% - 32px));margin-inline:auto}.hero{display:flex;justify-content:space-between;gap:40px;padding:64px 0 34px;border-bottom:1px solid var(--line)}.hero.compact{display:block}.hero h1{font-family:Georgia,serif;font-size:clamp(3rem,8vw,6.4rem);font-weight:500;letter-spacing:-.055em;line-height:.96;margin:.16em 0}.hero.compact h1{font-size:clamp(2.6rem,6vw,5rem)}.eyebrow{color:var(--green);font-size:.72rem;font-weight:800;letter-spacing:.14em;margin:0 0 8px}.lede{color:var(--muted);font-size:1.08rem;max-width:620px}.archive-picker{align-self:flex-end;color:var(--muted);font-size:.8rem}select{display:block;margin-top:6px;padding:10px 34px 10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--ink)}main>section{padding:42px 0;border-bottom:1px solid var(--line)}.signal{background:var(--green);color:white;margin-top:30px;padding:36px;border-radius:18px;border:0;box-shadow:var(--shadow)}.signal .eyebrow{color:var(--lime)}.signal h2{font-family:Georgia,serif;font-size:clamp(2rem,5vw,3.8rem);font-weight:500;line-height:1.05;max-width:800px;margin:10px 0}.signal p:not(.eyebrow){max-width:760px;color:#e7eee9}.editorial{padding:26px 30px;margin-top:18px;background:#e7eadb;border:1px solid #cdd3b4;border-radius:14px}.editorial p:last-child{margin-bottom:0}.section-heading{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:20px}.section-heading h2{font-family:Georgia,serif;font-size:2.25rem;font-weight:500;letter-spacing:-.03em;margin:0}.quiet,.empty{color:var(--muted)}.card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px;box-shadow:0 5px 18px rgba(34,45,40,.035)}.card h3{margin:4px 0 8px;font-size:1.05rem}.card p:last-child{margin-bottom:0}.action{border-top:4px solid var(--green)}.action.weather{border-top-color:var(--red)}.weather-row{display:grid;grid-template-columns:1fr auto;gap:2px 14px;padding:10px 0;border-top:1px solid var(--line)}.weather-row p{grid-column:1/-1;color:var(--muted);margin:0}.story-list{display:grid;gap:8px}.story{display:flex;justify-content:space-between;gap:18px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px}.story h4{font-size:1.05rem;line-height:1.35;margin:3px 0}.story p{color:var(--muted);font-size:.9rem;margin:7px 0 0}.story .source{font-size:.7rem;text-transform:uppercase;letter-spacing:.06em}.story-link{text-decoration:underline;text-decoration-color:#92aa9f;text-decoration-thickness:1px;text-underline-offset:3px}.story-link:hover{color:var(--green);text-decoration-thickness:2px}.story-link:focus-visible{outline:3px solid var(--lime);outline-offset:3px;border-radius:2px}.link-arrow{display:inline-block;color:var(--green);font-size:.82em;font-weight:800;text-decoration:none}.badge{display:inline-block;background:#eee9dd;border-radius:20px;padding:2px 7px;margin-left:5px;text-transform:none;letter-spacing:0}.badge.new{background:var(--lime);color:#334018}.save{align-self:start;border:0;background:transparent;color:var(--green);font-size:1.45rem;cursor:pointer}.save.saved{color:#bd7d16}.news-group{padding:20px 0}.news-group h3{font-family:Georgia,serif;font-size:1.55rem;font-weight:500}.filters{display:flex;gap:8px;overflow-x:auto;padding-bottom:8px}.filter{white-space:nowrap;border:1px solid var(--line);border-radius:30px;padding:8px 13px;background:transparent;color:var(--ink);cursor:pointer}.filter.active{background:var(--ink);color:white}.ticker-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px}.ticker{display:flex;justify-content:space-between;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:14px}.ticker span{display:block;color:var(--muted);font-size:.75rem}.ticker .price{text-align:right;font-weight:700}.ticker .up{color:var(--green)}.ticker .down{color:var(--red)}.text-link,.back{display:inline-block;margin-top:8px;font-weight:700;text-underline-offset:3px}.comparison{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:16px;padding:30px 0}.compare-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:26px}.compare-card h2{font-family:Georgia,serif;font-size:2rem;margin:0}.model-output{margin-top:24px}.meta{color:var(--muted);font-size:.8rem}footer{padding:30px 0 60px;color:var(--muted);font-size:.8rem}
.sport-groups{display:grid;gap:28px}.sport-heading{display:flex;align-items:baseline;justify-content:space-between;gap:16px;margin-bottom:12px}.sport-heading h3{font-family:Georgia,serif;font-size:1.55rem;font-weight:500;margin:0}.sport-heading span{color:var(--muted);font-size:.75rem}.news-group{padding:0;margin:12px 0;background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}.news-group summary{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:18px 20px;cursor:pointer;font-family:Georgia,serif;font-size:1.55rem;list-style:none}.news-group summary::-webkit-details-marker{display:none}.news-group summary:after{content:'+';font-family:Inter,sans-serif;color:var(--green);font-size:1.5rem}.news-group[open] summary:after{content:'−'}.news-group .story-list{padding:0 12px 12px}.story-count{margin-left:auto;color:var(--muted);font-family:Inter,sans-serif;font-size:.75rem}.filters{scrollbar-width:none;-ms-overflow-style:none;touch-action:pan-x;overscroll-behavior-inline:contain}.filters::-webkit-scrollbar{display:none}
.hero{display:block}.hero h1{margin:0 0 18px}.hero-meta{display:flex;align-items:center;justify-content:space-between;gap:16px}.hero-meta .eyebrow{margin:0}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.archive-picker{display:flex;align-items:center;color:var(--muted);font-size:.76rem;white-space:nowrap}.archive-picker select{display:inline-block;margin:0;padding:5px 25px 5px 8px;font-size:.76rem}.story-copy{width:100%}.ticker-grid{grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px}.ticker{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;padding:12px}.ticker-top{display:flex;justify-content:space-between;gap:12px}.sparkline{display:block;width:calc(100% + 12px);max-width:none;height:52px;margin-inline:-6px;color:var(--muted)}.sparkline polyline{fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}.sparkline.up{color:var(--green)}.sparkline.down{color:var(--red)}.empty-chart{height:52px;background:linear-gradient(180deg,transparent 49%,var(--line) 50%,transparent 51%)}.ticker .market-period{font-size:.68rem;font-weight:700;text-align:right}.ticker .market-period.up{color:var(--green)}.ticker .market-period.down{color:var(--red)}
@media(max-width:650px){.hero{padding-top:38px}.hero-meta{align-items:flex-start}.archive-picker span{display:none}.archive-picker select{padding:4px 23px 4px 7px;font-size:.72rem}.signal{padding:25px}.section-heading{display:block}.story{padding:15px}}
"""


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
