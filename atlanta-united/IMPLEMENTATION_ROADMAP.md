# Atlanta United Fan Hub - Implementation Roadmap

## Direction Locked
- Home page: current season only.
- History page: everything non-current season.

## Completed
- Starting XI infrastructure (pitch renderer + formation templates).
- Notable lineup filter on History page.
- Notable lineups added:
  - 2018 MLS Cup Final (4-3-3)
  - 2019 U.S. Open Cup Final (3-5-2)
  - 2019 Campeones Cup (4-3-3)
- History page Season Explorer is live:
  - historical season pulse
  - full schedule table
  - table snapshot
- Season Explorer UI updates shipped:
  - removed old Season History card
  - full schedule limited to 15 rows with expand/collapse toggle
  - table snapshot sorted by highest points
  - `#` column now reflects displayed (points-sorted) order
  - season pulse expanded to 10 cards in a 2x5 layout
  - added Top Scorer and Attendance cards
  - cleaned season meta text to remove noisy import suffixes
- Historical data architecture split shipped:
  - `historical-data.json` added as historical cache
  - `npm run backfill-historical` added for one-time/occasional historical refresh
  - `npm run update-data` now uses live feeds for current season and local historical cache for history page
- Historical data quality tooling shipped:
  - `npm run normalize-historical` to normalize cached season pulse/stats from stored schedules
  - `npm run audit-historical` to generate `HISTORICAL_DATA_QUALITY_REPORT.md`
  - current audit reports no blocking issues across 2017-2025 cached seasons
- Club timeline overhaul shipped:
  - season-by-season timeline expanded across club lifecycle
  - includes manager changes, major signings/transfers, and trophy milestones
- Season Explorer note added:
  - explicit callout that domestic/international cup results are excluded from this view
- Historical roster stats shipped and populated:
  - imported/persisted 2017-2025 historical roster stats into `historical-data.json`
  - history roster table has season selector
  - history roster table sorted by clicking column headers
  - history roster limited to 10 rows with expand/collapse toggle
- In-season historical sync workflow shipped:
  - `npm run update-data` now upserts the active season into `historical-data.json`
  - write to `historical-data.json` happens only when active-season data actually changes (insert/update diff check)
  - no-write path is explicit when nothing changed to avoid noisy churn
  - active-season historical row is built from live fixtures/standings/roster snapshots
  - this keeps history current during the season while preserving end-of-season finalize pass
  - history page receives non-current seasons only (active season is excluded from `data.js` history payload)
  - offseason handoff logic promotes home page season to next year once current-season fixtures are fully completed
- Home roster quality-of-life updates shipped:
  - home roster table sorted by clicking column headers
  - status/starts UI columns removed for cleaner presentation

## Now
### 1. Deepen Starting XI Module
- Add lineup metadata chips (formation, competition, date, score).
- Add optional bench/subs section under the pitch.
- Add lineup grouping by season/trophy.

### 2. Expand Player Stats (Current + Historical)
- Target columns to add/standardize across home + history roster tables:
  - `xG`
  - `xA`
  - `Pass%`
  - optional follow-ons after source validation: key passes, progressive passes/carries, duel win%
- Data shape policy:
  - current season (`data.js`) and `historical-data.json` should share the same roster stat keys so table rendering stays schema-compatible
  - missing values should remain `null` (not coerced to `0`) to avoid false precision in early-season snapshots
- Source/merge policy:
  - keep current multi-source ingest order (ESPN -> MLS Stats API -> FBref fallback)
  - map advanced columns by source and merge per-player with de-dupe rules already used for core stats
  - do not treat rows as "usable" when advanced stats are entirely null/empty
- Historical backfill plan:
  1. define per-column source mapping and unit normalization (`Pass%` scale/rounding, `xG/xA` numeric precision)
  2. run one-time backfill for past seasons into `historical-data.json`
  3. normalize + audit, then keep daily in-season upsert for the active season
  4. confirm home/history tables sort correctly for each new numeric column
- Quality gates for rollout:
  - keep last meaningful season snapshot if a new pull is zero-only
  - verify counts with the existing "liveMeaningful/histMeaningful" check after deploy
  - accept partial coverage early season, but block regressions where previously populated players lose stats unexpectedly

### 3. Season Explorer Conference Expansion (Planned, Not Implemented Yet)
- Goal:
  - add Western Conference standings back into Season Explorer (East remains primary/default context for Atlanta)
- Layout options to decide before implementation:
  1. full-width schedule first, then East + West standings split below (mirrors home page pattern)
  2. keep current two-column layout and add an East/West switcher in the standings panel (default East)
- Current lean:
  - prefer option 1 (full-width schedule + East/West below) for clarity and consistency with home page
  - concern to evaluate during build: avoid making the Season Explorer card feel too long/heavy on smaller screens
- Scope note:
  - roadmap/planning item only for now; no implementation in this phase

## Data/Architecture
- Keep versioned model split between `currentSeason` and `historicalSeasons`.
- Add cache strategy for historical pulls.
- Add schema validation for generated `data.js`.
- Season lifecycle policy:
  - In-season: append/merge active season into `historical-data.json` only when changed.
  - End-of-season: run `npm run normalize-historical` then `npm run audit-historical` and lock final season snapshot.

## Operations Workflow (Long-Term Reference)
### Daily automation (current production flow)
- The Ubuntu server runs `/home/claw/repos/Projects/atlanta-united/scripts/update-and-push.sh` on cron daily.
- The script:
  - pulls latest `main`
  - runs `npm run update-data`
  - commits/pushes only when tracked output files changed (currently centered on `data.js`)
- `npm run update-data` performs an in-season upsert into `historical-data.json`:
  - active season row is inserted/updated when changed
  - no-write path is used when nothing changed
  - this means current-season fixtures/standings/roster snapshots are continuously persisted and do not need a single big end-of-season re-pull
  - roster stats ingest includes multi-source fallback and quality gates so null/zero-only snapshots do not overwrite meaningful cached data

### Server automation notes
- Production updater location: `/home/claw/repos/Projects/atlanta-united/scripts/update-and-push.sh`
- Git auth on server uses SSH aliases (including `github-main`) tied to the Connerj1234 account.
- Operational expectation:
  - daily cron run should keep current-season `data.js` fresh
  - active-season history upsert should keep `historical-data.json` in sync as part of each update run
  - after stat column expansions, ensure automation includes commit detection for any newly changed tracked data files

### End-of-season behavior (as of now)
- Home page season selection is fixture-driven (active season is inferred from upcoming/current fixtures).
- Offseason handoff:
  - when current-season fixtures are complete and next-year fixtures exist, home season advances to next year
  - prior season remains in `historical-data.json` as the locked historical season record
- Recommended year-end/manual sanity pass:
  1. Run `npm run update-data`
  2. Run `npm run normalize-historical`
  3. Run `npm run audit-historical`
  4. Inspect `historical-data.json` for expected completed season row counts and final record

### Playoff handling
- The live fixture ingestion aggregates multiple sources (team schedule endpoints, team overview, and league scoreboard windows).
- Because the ingest is date-range + event based (not hardcoded to a fixed regular-season game count), postseason matches can flow in when they appear in the upstream feed.
- Current UI labels still say "MLS Regular Season"; postseason fixtures may still be included in aggregate results if present in the feed.
- If league calendar format changes (future MLS schedule shift), daily upsert should continue working as long as fixture feeds publish events; keep the year-end sanity pass above as guardrail.

### Recovery / re-sync procedures
- If active season data looks stale or malformed:
  1. Run `npm run update-data` once manually
  2. Verify `data.js` and active season entry in `historical-data.json`
  3. If historical cache drifted, run `npm run backfill-historical` then `npm run normalize-historical` and `npm run audit-historical`

## Testing
- Regression checks for:
  - season label correctness
  - next match detection
  - next 3 fixtures generation
  - standings fallback behavior
- Snapshot shape test for generated `data.js` including `historicalSeasons`.
