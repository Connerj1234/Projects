#!/usr/bin/env bash
set -euo pipefail

# Daily server workflow matching the other Git-connected Netlify projects:
# pull main, generate the tracked static site, email it, then commit and push.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(git -C "${APP_DIR}" rev-parse --show-toplevel)"
PROJECT_DIR="${REPO_ROOT}/Daily-Brief"
PUBLISH_DIR="${PROJECT_DIR}/site"
BRANCH="${BRANCH:-main}"
LOCK_FILE="${LOCK_FILE:-/tmp/daily-brief-update.lock}"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  log "Another Daily Brief update is running; exiting."
  exit 0
fi

cd "${REPO_ROOT}"
log "Pulling latest ${BRANCH}..."
git pull --ff-only origin "${BRANCH}"

cd "${APP_DIR}"
mkdir -p "${PUBLISH_DIR}"
export BRIEF_OUTPUT_DIR="${PUBLISH_DIR}"

log "Generating and emailing Daily Brief..."
python3 run_brief.py --send

cd "${REPO_ROOT}"
git add -- "Daily-Brief/site"
if git diff --cached --quiet -- "Daily-Brief/site"; then
  log "No published changes detected; nothing to commit."
  exit 0
fi

log "Publishing updated static brief through Git..."
git commit -m "chore(daily-brief): automated refresh ($(date '+%Y-%m-%d'))"
git push origin "${BRANCH}"
log "Done. Netlify will deploy the pushed site automatically."
