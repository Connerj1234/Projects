# Daily Brief

Daily Brief is a personal morning briefing system that turns weather, sports, markets, traffic, and news into a concise email and mobile-friendly static dashboard each morning.

The current architecture is deterministic and local-first. Python collects facts from configured public sources, ranks and deduplicates them, renders the email and dashboard, and preserves the source JSON for inspection. OpenAI is no longer required to produce the brief: it is an optional, narrowly scoped editorial layer that can be disabled entirely.

The intended production workflow runs unattended on a home server at 7:30 AM Eastern. The server sends the email, writes the static dashboard, commits the generated site to GitHub, and Netlify publishes it at [dailybrief.connerjamison.com](https://dailybrief.connerjamison.com).

**Status:** Dashboard deployed. The one-time home-server cron migration is documented and ready to apply.

## How the Project Evolved

Daily Brief began as an API-centered experiment. Python retrieved information from selected sources and normalized it into JSON, then the OpenAI API turned that material into the finished prose briefing. The cost was already small, but the model sat in the critical output path: a paid request was needed every day for work that was largely predictable formatting, grouping, and prioritization.

The project now treats those responsibilities as application logic:

| Area | Original approach | Current approach |
| --- | --- | --- |
| Fact collection | Python collectors | Python collectors |
| Prioritization | Primarily delegated to the model | Explicit local scoring and urgency rules |
| Repeated stories | Included in the model input | Fingerprinted and deprioritized locally |
| Formatting | OpenAI-generated prose | Deterministic Python email and HTML renderers |
| Main interface | Daily email | Concise email plus a responsive static dashboard and dated archive |
| OpenAI dependency | Part of the normal daily path | Optional short editor's note only |
| Default API cost | Small recurring charge | Zero when `BRIEF_AI_MODE=off` |
| Publishing | Email delivery | Email plus Git-connected Netlify deployment |

This keeps the useful part of the original premise—one personalized brief assembled from a controlled set of sources—while making the routine path free, auditable, predictable, and resilient. The API remains available for comparison or occasional synthesis when its writing quality adds enough value to justify the cost.

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
8. The server publishing script commits only the generated `site` directory and pushes it to GitHub.
9. Netlify detects the push and deploys the static files; it performs no data collection or AI processing.

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
- Deterministic local ranking, deduplication, email rendering, and dashboard generation
- Optional OpenAI Responses API editor's note over a bounded set of top-ranked facts
- Explicit per-source error handling so one unavailable feed does not stop all collection
- RSS parsing, deduplication, and configurable per-section limits
- Time-zone-aware cron and systemd deployment examples
- Git-connected static publishing to Netlify without a Netlify token on the server
- Local fact and brief artifacts for inspection and troubleshooting
- SMTP delivery with TLS, HTML formatting, and a plain-text alternative
- Secrets stored in environment variables and excluded from version control
- Dry-run and collect-only modes for safe testing

## Quick Start

Requirements:

- Python 3.10 or newer
- SMTP credentials only when sending email
- An OpenAI API key only if the optional editor's note is enabled

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
BRIEF_AI_MODE=off
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

`BRIEF_AI_MODE=off` is the free default and does not require `OPENAI_API_KEY`. If AI mode is `daily` or `weekly`, API billing is separate from a ChatGPT subscription.

## Project Structure

```text
Daily-Brief/
├── docs/
│   ├── model-strategy.md
│   ├── netlify-deployment.md
│   ├── portfolio-handoff.md
│   └── server-handoff.md
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
│   ├── scripts/
│   │   └── update-and-push.sh # Unattended email and static-site publisher
│   └── run_brief.py           # Command-line entry point
├── site/                      # Generated files published by Netlify
├── netlify.toml
└── README.md
```

## Design Decisions

### Deterministic collection before AI

The system fetches and normalizes source data before considering a model request. Local rules decide ordering, urgency, grouping, and repeated-story penalties. When enabled, the model receives a bounded JSON document and writes only the optional editor's note; it is not an unbounded research agent.

### Useful without the model

The deterministic renderer is the primary output path. It turns the same facts into a readable email and static dashboard whether or not an API key is configured. Use `BRIEF_AI_MODE=off` or `--no-ai` for zero OpenAI calls. Collection can also run independently with `--collect-only`.

### Simple deployment

The runtime uses only Python’s standard library, so the server does not need a virtual environment or dependency installation. Cron and systemd examples keep delivery tied to Eastern time even when the host uses a different system time zone. Netlify serves files already generated by the home server rather than rebuilding the application or receiving private server credentials.

## Scope

Daily Brief is a personal automation with a static read-only dashboard. It does not currently integrate with private email, calendars, reminders, brokerage accounts, or personal portfolios. Those systems remain outside the current scope.

## Documentation

- [Setup, operation, and deployment](morning-brief/README.md)
- [Model selection and API strategy](docs/model-strategy.md)
- [Netlify dashboard deployment](docs/netlify-deployment.md)
- [Home-server handoff checklist](docs/server-handoff.md)
