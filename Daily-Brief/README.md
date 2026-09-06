# Daily Brief

Daily Brief is a personal morning briefing system that turns weather, sports, markets, traffic, and news into one concise email each morning.

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
4. The facts are sent to the OpenAI Responses API with instructions to use no outside information.
5. The resulting Markdown brief is saved locally and converted into email-safe HTML.
6. A multipart HTML and plain-text email is delivered over authenticated SMTP.

The model does not browse the web or collect its own facts. Keeping collection and writing separate makes the output easier to inspect and reduces unsupported claims. If the OpenAI step is not configured, the application can still produce a deterministic fallback brief.

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
OPENAI_MODEL=gpt-5.4-mini

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
EMAIL_FROM=
EMAIL_TO=

BRIEF_TIMEZONE=America/New_York
BRIEF_LOOKAHEAD_DAYS=7
BRIEF_OUTPUT_DIR=./out
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
│   │   ├── openai_renderer.py # Responses API integration and grounding prompt
│   │   ├── render_fallback.py # Deterministic non-AI renderer
│   │   └── settings.py        # JSON and environment configuration
│   ├── config.json
│   └── run_brief.py           # Command-line entry point
└── README.md
```

## Design Decisions

### Deterministic collection before AI

The system fetches and normalizes source data before making a model request. The model receives a bounded JSON document and is instructed to write only from that document. This makes the AI step a presentation layer rather than an unbounded research agent.

### Useful without the model

The fallback renderer turns the same facts into a readable brief when no API key is configured. Collection can also run independently with `--collect-only`, which helps diagnose upstream sources without involving generation or email delivery.

### Simple deployment

The runtime uses only Python’s standard library, so the server does not need a virtual environment or dependency installation. Cron and systemd examples keep delivery tied to Eastern time even when the host uses a different system time zone.

## Scope

Daily Brief is a personal automation, not a hosted web application or public service. It does not currently integrate with private email, calendars, reminders, brokerage accounts, or personal portfolios. Those systems are intentionally outside the finished project’s current scope.

## Documentation

- [Setup, operation, and deployment](morning-brief/README.md)
- [Model selection and API strategy](docs/model-strategy.md)
