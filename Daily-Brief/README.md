# Daily Brief

Daily Brief is a personal morning briefing system that turns weather, sports, markets, traffic, and news into a concise email and mobile-friendly static dashboard each morning.

It is scheduled to run unattended on a home server at 7:30 AM Eastern, with daylight-saving changes handled automatically. A deterministic Python pipeline collects facts from configured public sources, then the OpenAI Responses API organizes and summarizes only those facts. The finished brief is delivered as a styled HTML email with a plain-text alternative.

**Status:** Complete and deployed for personal use.

## What It Covers

- Weather forecasts and active alerts for configured locations
- Schedules and results for the Braves, Hawks, Falcons, and Atlanta United
- Seasonal major events including Formula 1, Grand Slams, the World Cup, Champions League, March Madness, The Masters, and major U.S. playoffs
- A configurable market watchlist with daily price movement
- Atlanta and Georgia news
- Traffic, transit, weather, and road-closure headlines
- Technology and AI news
- General U.S. and world news
- Upcoming U.S. public holidays

## How It Works

1. The server starts the script on a time-zone-aware daily schedule.
2. Python collectors fetch structured facts from public APIs and RSS feeds.
3. The complete fact set is saved locally as JSON for traceability.
4. Local rules rank urgent and new items, while stories repeated from the previous brief are deprioritized.
5. A static HTML dashboard, dated archive, source JSON, and concise email are generated without requiring an API.
6. Optionally, the OpenAI Responses API writes a short editorial note from a compact set of top-ranked facts.
7. A multipart HTML and plain-text email is delivered over authenticated SMTP.

The model does not browse the web or collect its own facts. It is an optional editorial layer rather than the renderer, so disabling AI still produces the complete dashboard and email.

## Data Sources

| Brief section | Source |
| --- | --- |
| Weather and alerts | National Weather Service / weather.gov |
| Atlanta teams and major sports | ESPN public scoreboard feeds |
| Market watchlist | Yahoo Finance chart endpoint |
| Local, traffic, market, tech, and general news | Configurable RSS feeds |
| U.S. holidays | Nager.Date public holiday API |

Source selection, followed teams, major-event windows, locations, watchlist symbols, item limits, and lookahead periods are all configurable in [`morning-brief/config.json`](morning-brief/config.json).

## Technical Highlights

- Python standard library only; no third-party runtime packages
- OpenAI Responses API for grounded summarization and prioritization
- Explicit per-source error handling so one unavailable feed does not stop all collection
- RSS parsing, deduplication, and configurable per-section limits
- Time-zone-aware cron and systemd deployment examples
- Local fact and brief artifacts for inspection and troubleshooting
- SMTP delivery with TLS, HTML formatting, and a plain-text alternative
- Secrets stored in environment variables and excluded from version control
- Dry-run and collect-only modes for safe testing

## Quick Start

Requirements:

- Python 3.10 or newer
- An OpenAI API key for AI-written briefs
- SMTP credentials only when sending email

From this directory:

```bash
cd morning-brief
cp .env.example .env
```

Add the required credentials to `.env`, then preview a brief without sending email:

```bash
python3 run_brief.py --dry-run
```

Collect and inspect the source facts without calling OpenAI:

```bash
python3 run_brief.py --collect-only
```

Send the finished brief:

```bash
python3 run_brief.py --send
```

See the [setup and deployment guide](morning-brief/README.md) for all environment variables, Gmail SMTP guidance, cron configuration, systemd examples, and the home-server deployment workflow.

## Configuration

Application behavior is split between two configuration layers:

- [`morning-brief/config.json`](morning-brief/config.json) defines public, non-secret preferences such as locations, teams, event windows, feeds, watchlist symbols, and content limits.
- `morning-brief/.env` contains credentials and deployment-specific overrides. It is intentionally excluded from Git. Use [`.env.example`](morning-brief/.env.example) as the template.

The primary environment variables are:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-nano
BRIEF_AI_MODE=daily
BRIEF_AI_WEEKDAY=6
BRIEF_COMPARE_MODELS=gpt-5.4-nano

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
EMAIL_FROM=
EMAIL_TO=

BRIEF_TIMEZONE=America/New_York
BRIEF_LOOKAHEAD_DAYS=7
BRIEF_OUTPUT_DIR=./out
BRIEF_BASE_URL=https://brief.example.com
```

A ChatGPT subscription does not include API usage. The unattended server workflow requires an OpenAI API key with API billing enabled.

## Project Structure

```text
Daily-Brief/
├── docs/
│   ├── model-strategy.md
│   └── portfolio-handoff.md
├── morning-brief/
│   ├── deploy/systemd/        # Service and timer examples
│   ├── morning_brief/
│   │   ├── sources/           # Weather, sports, market, news, and holiday collectors
│   │   ├── collectors.py      # Collection orchestration
│   │   ├── emailer.py         # SMTP delivery
│   │   ├── markdown_email.py  # Markdown-to-HTML email rendering
│   │   ├── dashboard.py       # Static dashboard, archive, and comparison UI
│   │   ├── prioritization.py  # Ranking, deduplication, and compact AI input
│   │   ├── openai_renderer.py # Optional short AI editorial note
│   │   ├── render_fallback.py # Deterministic email and Markdown renderer
│   │   └── settings.py        # JSON and environment configuration
│   ├── config.json
│   └── run_brief.py           # Command-line entry point
└── README.md
```

## Design Decisions

### Deterministic collection before AI

The system fetches and normalizes source data before making a model request. The model receives a bounded JSON document and is instructed to write only from that document. This makes the AI step a presentation layer rather than an unbounded research agent.

### Useful without the model

The deterministic renderer is the primary output path. It turns the same facts into a readable email and static dashboard whether or not an API key is configured. Collection can also run independently with `--collect-only`.

### Simple deployment

The runtime uses only Python’s standard library, so the server does not need a virtual environment or dependency installation. Cron and systemd examples keep delivery tied to Eastern time even when the host uses a different system time zone.

## Scope

Daily Brief is a personal automation with a static read-only dashboard. It does not currently integrate with private email, calendars, reminders, brokerage accounts, or personal portfolios. Those systems remain outside the current scope.

## Documentation

- [Setup, operation, and deployment](morning-brief/README.md)
- [Model selection and API strategy](docs/model-strategy.md)
- [Netlify dashboard deployment](docs/netlify-deployment.md)
