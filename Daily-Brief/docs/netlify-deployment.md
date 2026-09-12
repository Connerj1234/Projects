# Deploy Daily Brief to Netlify

Daily Brief follows the same Git-connected Netlify pattern as the other projects in the `Connerj1234/Projects` monorepo. The home server generates a tracked static `site/` directory, commits only that directory, and pushes `main`. Netlify deploys the push automatically; no Netlify token is required on the server.

## Test locally

From `morning-brief`:

```bash
python3 run_brief.py --dry-run --no-ai
python3 -m http.server 8787 --directory out
```

Open <http://127.0.0.1:8787/> and stop the preview with `Ctrl+C`.

## Create the Netlify project

In Netlify, choose **Add new project → Import an existing project**, then select the existing GitHub repository:

```text
Connerj1234/Projects
```

Use these settings for the new project:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Base directory | `Daily-Brief` |
| Build command | leave blank |
| Publish directory | `site` |

The checked-in `Daily-Brief/netlify.toml` also declares `site` as the publish directory and supplies privacy-oriented response headers.

The first deployment will contain only the placeholder until the server runs the publisher once.

## Add the subdomain

In the new Daily Brief Netlify project:

1. Open **Domain management → Production domains**.
2. Add `dailybrief.connerjamison.com`.
3. If `connerjamison.com` uses Netlify DNS, assign the subdomain to this project there.
4. If DNS is hosted elsewhere, create a `CNAME` record named `dailybrief` pointing to the new project's `PROJECT-NAME.netlify.app` address.
5. Wait for Netlify to verify DNS and provision HTTPS.

Set the final address in the home server's `morning-brief/.env`:

```env
BRIEF_BASE_URL=https://dailybrief.connerjamison.com
```

## Publish every morning

The repository includes `morning-brief/scripts/update-and-push.sh`. It mirrors the existing Atlanta United updater:

1. Acquires a lock so two runs cannot overlap.
2. Pulls the latest `main` with `--ff-only`.
3. Loads the existing private `.env`.
4. Generates the site into `Daily-Brief/site` and sends the email.
5. Stages only `Daily-Brief/site`.
6. Commits and pushes only when the published files changed.

On the server:

```bash
cd /home/conner/repos/Projects/Daily-Brief
chmod +x morning-brief/scripts/update-and-push.sh
morning-brief/scripts/update-and-push.sh
```

After that succeeds, point the existing 7:30 AM Eastern cron entry at the updater script instead of calling `run_brief.py` directly. Keep cron logging enabled so a failed pull, collection, email, or push remains visible.

## Public-site considerations

The generated site contains the Atlanta-area facts already selected for the brief. It includes `robots.txt` plus `X-Robots-Tag: noindex, nofollow, noarchive`, but those directives discourage indexing rather than restricting access. Do not add private calendar, inbox, precise-address, account, or portfolio information later without revisiting access control.
