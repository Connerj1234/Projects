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
- History page season explorer scaffolding added:
  - historical season pulse
  - placeholders for full schedule and table snapshot

## Now
### 1. Historical Season Data Pass
- Populate `historicalSeasons.fullSchedule` for each season (2017+).
- Populate `historicalSeasons.tableSnapshot` for each season.
- Populate season-long stats per season (GF, GA, home/away split, clean sheets, attendance).
- Keep data generation deterministic in `scripts/update-data.mjs`.

### 2. History Page UI Iteration
- Refine season explorer layout once full data is loaded.
- Add row highlighting and compact filters for schedule (home/away, competition).
- Add season context chips for quick reading (finish, points, playoff outcome).

### 3. Club Timeline Overhaul (Explicit Requirement)
- Replace lightweight timeline with season-by-season narrative.
- Include every season from 2017 onward.
- Capture highs and lows each season.
- Track manager hires/fires and major coaching changes.
- Include notable club news/events (trophies, transfers, milestones, slumps, turning points).

## Next
### 4. Deepen Starting XI Module
- Add lineup metadata chips (formation, competition, date, score).
- Add optional bench/subs section under the pitch.
- Add lineup grouping by season/trophy.

### 5. Historical Player + Roster Stats
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
