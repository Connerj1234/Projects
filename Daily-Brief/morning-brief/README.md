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

The deployed delivery schedule is 7:30 AM Eastern every day. Its cron entry checks the current time in `America/New_York`, so delivery follows daylight-saving changes even though the server itself uses UTC. The systemd examples in `deploy/systemd` provide an alternative scheduler that also pins the timer to `America/New_York`.

If the server continues to use cron, do not assume its cron implementation supports `CRON_TZ`. A `30 7 * * *` entry interpreted in UTC runs at 3:30 AM Eastern during daylight saving time. This portable cron entry checks Eastern local time every 30 minutes and sends only at 7:30 AM:

```cron
*/30 * * * * cd /home/conner/repos/Projects/Daily-Brief/morning-brief && /usr/bin/env bash -lc 'if [ "$(TZ=America/New_York date +\%H:\%M)" = "07:30" ]; then set -a; source .env; set +a; python3 run_brief.py --send >> logs/cron.log 2>&1; fi'
```

The backslashes before `%` are required in a crontab. Cron treats unescaped percent signs specially before passing the command to the shell.

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

For a cron deployment, the active entry should be:

```cron
*/30 * * * * cd /home/conner/repos/Projects/Daily-Brief/morning-brief && /usr/bin/env bash -lc 'if [ "$(TZ=America/New_York date +\%H:\%M)" = "07:30" ]; then set -a; source .env; set +a; python3 run_brief.py --send >> logs/cron.log 2>&1; fi'
```

If the current job uses `30 7 * * *` and the server is set to UTC, that explains a 3:30 AM Eastern delivery during daylight saving time. Replace that job using:

```text
crontab -e
```

Remove the old Daily Brief entry, add the timezone-safe entry above, save, and then run `crontab -l` to verify that only one Daily Brief job remains.

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
