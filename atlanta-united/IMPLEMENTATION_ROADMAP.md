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

## Data/Architecture
- Keep versioned model split between `currentSeason` and `historicalSeasons`.
- Add cache strategy for historical pulls.
- Add schema validation for generated `data.js`.
- Season lifecycle policy:
  - In-season: append/merge active season into `historical-data.json` only when changed.
  - End-of-season: run `npm run normalize-historical` then `npm run audit-historical` and lock final season snapshot.

## Testing
- Regression checks for:
  - season label correctness
  - next match detection
  - next 3 fixtures generation
  - standings fallback behavior
- Snapshot shape test for generated `data.js` including `historicalSeasons`.
