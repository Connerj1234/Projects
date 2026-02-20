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

## Now
### 1. Deepen Starting XI Module
- Add lineup metadata chips (formation, competition, date, score).
- Add optional bench/subs section under the pitch.
- Add lineup grouping by season/trophy.

## Next
### 2. Historical Player + Roster Stats
- Add full roster list per season.
- Add per-player stats (apps, starts, minutes, goals, assists, cards).
- Add sorting/filtering.

## Data/Architecture
- Keep versioned model split between `currentSeason` and `historicalSeasons`.
- Add cache strategy for historical pulls.
- Add schema validation for generated `data.js`.

## Testing
- Regression checks for:
  - season label correctness
  - next match detection
  - next 3 fixtures generation
  - standings fallback behavior
- Snapshot shape test for generated `data.js` including `historicalSeasons`.
