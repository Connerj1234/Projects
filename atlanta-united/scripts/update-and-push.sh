#!/usr/bin/env bash
set -euo pipefail

# Daily updater for server cron:
# - pull latest main
# - run data refresh
# - commit/push only when tracked data files changed

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BRANCH="${BRANCH:-main}"
LOCK_FILE="${LOCK_FILE:-/tmp/atlanta-united-update.lock}"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  log "Another update process is running; exiting."
  exit 0
fi

cd "${REPO_DIR}"

log "Pulling latest ${BRANCH}..."
git pull --ff-only origin "${BRANCH}"

log "Running data update..."
npm run update-data

if git diff --quiet -- data.js historical-data.json; then
  log "No data changes detected; nothing to commit."
  exit 0
fi

log "Data changes detected. Committing..."
git add data.js historical-data.json
git commit -m "chore(data): automated daily refresh ($(date '+%Y-%m-%d'))"

log "Pushing ${BRANCH}..."
git push origin "${BRANCH}"
log "Done."
