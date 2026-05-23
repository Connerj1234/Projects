# Morning Brief

Daily email brief for weather, sports, market news, holidays/events, and broad news.

The first version is intentionally simple:

- Python standard library only.
- Public data sources where possible.
- OpenAI Responses API for final writing.
- Multipart SMTP email delivery with a styled HTML version and plain-text fallback.
- Cron or systemd timer for daily scheduling.

Important: a ChatGPT subscription does not automatically include API usage. This script needs an `OPENAI_API_KEY` from the OpenAI API platform with billing enabled.

## Quick Start

```bash
cd morning-brief
cp .env.example .env
```

Edit `.env` with your API key and email settings.

Run a local dry run:

```bash
python3 run_brief.py --dry-run
```

Send a real email:

```bash
python3 run_brief.py --send
```

## Server Schedule

Cron example for 8:30 AM Eastern every day:

```cron
CRON_TZ=America/New_York
30 8 * * * cd /home/conner/repos/Projects/Daily-Brief/morning-brief && /usr/bin/env bash -lc 'set -a; source .env; set +a; python3 run_brief.py --send >> logs/cron.log 2>&1'
```

Use `CRON_TZ` so the send time stays at 8:30 AM Eastern even if the server itself is configured for UTC. Systemd examples are in `deploy/systemd` and also pin the timer to `America/New_York`.

## Deploying Changes To The Server

The normal workflow is:

1. Make and test changes locally.
2. Commit and push to GitHub from this Mac.
3. SSH into the home server.
4. Pull `main` in the server checkout.
5. Update cron only when the schedule command itself changes.

The most recent known SSH target from this Mac's shell history is:

```bash
ssh conner@server
```

Once connected, pull the server checkout:

```bash
cd /home/conner/repos/Projects/Daily-Brief
git pull origin main
```

If that directory ever changes, locate the checkout:

```bash
find ~ -maxdepth 5 -type d -name Daily-Brief 2>/dev/null
```

Then `cd` into the path that command prints and pull:

```bash
cd /path/printed/by/find
git pull origin main
```

After pulling code changes, run a dry run from the app directory:

```bash
cd morning-brief
python3 run_brief.py --dry-run
```

To inspect or change the live schedule:

```bash
crontab -l
crontab -e
```

The schedule should be:

```cron
CRON_TZ=America/New_York
30 8 * * * cd /home/conner/repos/Projects/Daily-Brief/morning-brief && /usr/bin/env bash -lc 'set -a; source .env; set +a; python3 run_brief.py --send >> logs/cron.log 2>&1'
```

To update only the morning-brief cron time from 6:30 AM Eastern to 8:30 AM Eastern without opening an editor:

```bash
crontab -l | perl -pe 's{^30 6 \* \* \* cd /home/conner/repos/Projects/Daily-Brief/morning-brief}{30 8 * * * cd /home/conner/repos/Projects/Daily-Brief/morning-brief}' | crontab -
crontab -l
```

From inside the server's `morning-brief` directory, `pwd` should print `/home/conner/repos/Projects/Daily-Brief/morning-brief`.

On Ubuntu/Debian, make sure Python can verify HTTPS certificates:

```bash
sudo apt update
sudo apt install -y ca-certificates python3
sudo update-ca-certificates
```

If you test this on macOS with a python.org Python and see certificate verification errors, run the bundled `Install Certificates.command` for that Python install.

## Current Sources

| Section | Source |
| --- | --- |
| Weather | weather.gov / National Weather Service |
| Sports | ESPN public scoreboard feeds for Atlanta teams and configured major events |
| Local Atlanta/Georgia news | RSS feeds configured in `config.json` |
| Traffic/commute | RSS feeds configured in `config.json`, plus weather.gov alerts in the weather facts |
| Market watchlist | Yahoo Finance chart endpoint for configured symbols |
| Market news | RSS feeds configured in `config.json` |
| Tech/AI news | RSS feeds configured in `config.json` |
| General news | RSS feeds configured in `config.json` |
| Holidays | Nager.Date public holiday API |

The model does not browse the web. The script fetches structured facts, then asks OpenAI to write from those facts only.

Sports coverage is configured in `config.json`. Followed teams are always checked across the lookahead window. Major events use deterministic active windows so seasonal tournaments such as Champions League, March Madness, The Masters, World Cup, Grand Slams, Formula 1, Super Bowl, NBA Playoffs, MLS Playoffs, and the College Football Playoff are only queried around relevant months.

Holiday coverage uses the configured `BRIEF_LOOKAHEAD_DAYS` window, which defaults to 7 days.

## Environment Variables

Required for OpenAI rendering:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.4-mini
```

Required for email sending:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=you@gmail.com
SMTP_PASSWORD=app-password-or-smtp-password
EMAIL_FROM=you@gmail.com
EMAIL_TO=you@gmail.com
```

Optional:

```bash
BRIEF_TIMEZONE=America/New_York
BRIEF_LOOKAHEAD_DAYS=7
BRIEF_OUTPUT_DIR=./out
```

For Gmail SMTP, use a Google app password, not your normal account password.

## Next Iterations

Good next additions:

- Google Calendar or iCloud `.ics` events.
- Gmail digest for important unread/action-needed mail.
- Portfolio watchlist and earnings calendar.
- More major-event sports windows, such as World Cup, Olympics, Grand Slams, and major boxing/UFC cards.
- Delivery to Discord or Pushover in addition to email.
