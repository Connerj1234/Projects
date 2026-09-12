# Daily Brief server handoff

Use this checklist from the laptop when you can reach the home server. The end state is one 7:30 AM Eastern job that generates the email and static dashboard, commits the new `Daily-Brief/site` files, and pushes `main`. Netlify deploys that push automatically.

## 1. Connect and update the checkout

SSH into the home server using the same connection method already used for the other projects, then run:

```bash
cd /home/conner/repos/Projects
git status --short
git pull --ff-only origin main
```

Stop if `git status --short` shows unexpected local edits that would be overwritten or conflict with the pull. The Daily Brief's private `.env` file should remain untracked.

## 2. Check the private environment file

Open `/home/conner/repos/Projects/Daily-Brief/morning-brief/.env` and preserve the existing Gmail SMTP credentials. Ensure these values are present:

```dotenv
BRIEF_TIMEZONE=America/New_York
BRIEF_BASE_URL=https://dailybrief.connerjamison.com
BRIEF_AI_MODE=off
```

`BRIEF_AI_MODE=off` makes the daily job completely independent of the OpenAI API. Change it to `daily` if the short AI editor's note proves useful enough to keep, or `weekly` to generate that note only on `BRIEF_AI_WEEKDAY`.

The publishing script overrides `BRIEF_OUTPUT_DIR`, so an older `BRIEF_OUTPUT_DIR=./out` entry can remain in `.env` without affecting the website.

## 3. Prepare Git publishing

The server must be able to push to `Connerj1234/Projects` non-interactively. Verify the configured identity and remote:

```bash
cd /home/conner/repos/Projects
git remote -v
git config user.name
git config user.email
```

If the existing Atlanta United publisher already pushes successfully from this checkout, no additional Git authentication should be necessary.

## 4. Run one complete manual test

```bash
cd /home/conner/repos/Projects/Daily-Brief/morning-brief
chmod +x scripts/update-and-push.sh
./scripts/update-and-push.sh
```

This intentionally sends the email, regenerates `Daily-Brief/site`, commits only that publish directory, and pushes `main`. Confirm all three results:

1. The email arrives.
2. `https://dailybrief.connerjamison.com` shows the new date.
3. Netlify reports a successful production deploy for the automated commit.

## 5. Replace the old Daily Brief cron entry

Create the log directory before installing the cron command:

```bash
mkdir -p /home/conner/repos/Projects/Daily-Brief/morning-brief/logs
crontab -e
```

Remove the old Daily Brief line that directly calls `python3 run_brief.py --send`. Add this single replacement:

```cron
*/30 * * * * cd /home/conner/repos/Projects/Daily-Brief/morning-brief && /usr/bin/env bash -lc 'if [ "$(TZ=America/New_York date +\%H:\%M)" = "07:30" ]; then ./scripts/update-and-push.sh >> logs/cron.log 2>&1; fi'
```

The job checks Eastern time explicitly, so daylight-saving changes do not shift delivery. The escaped percent signs are required by cron.

Verify that only one Daily Brief job remains:

```bash
crontab -l
```

## 6. Check the first unattended run

After the next scheduled run:

```bash
tail -n 100 /home/conner/repos/Projects/Daily-Brief/morning-brief/logs/cron.log
cd /home/conner/repos/Projects
git log -3 --oneline -- Daily-Brief/site
```

The expected flow is: pull `main`, collect public data, optionally request the AI note, send the email, update the static site, push the generated files, and let Netlify deploy them.

## Recovery notes

- Email works but the website is stale: confirm cron calls `scripts/update-and-push.sh`, not `run_brief.py` directly.
- The site updates but no email arrives: inspect the SMTP values in `.env` and `logs/cron.log`.
- `git push` fails: restore the same GitHub authentication used by the other server publishers.
- The OpenAI API is called unexpectedly: set `BRIEF_AI_MODE=off` in the server `.env` and rerun.
- A source fails temporarily: the deterministic renderer continues with the sources that succeeded; check the saved facts JSON and cron log for the failed source.
