# Atlanta United Fan Hub - Implementation Roadmap

## Planned Features

### 1. Starting 11 Snapshots
- Add visual lineup snapshots for key matches/eras.
- Support formations (4-3-3, 3-5-2, etc.) with position map layout.
- Add filters by season, competition, and match.
- Mark captain and notable substitutions.

### 2. Season Toggle On Home (Season Pulse)
- Add a season selector on the home page (2017 to current).
- Recompute Season Pulse cards based on selected season.
- Keep current season as default on initial load.
- Make selector state URL-friendly so links can open a specific season.

### 3. Deeper History Page Data
- Expand history page with year-by-year sections.
- Add richer season summaries (coach, trophies, playoff run, key moments).
- Include notable milestones and records by season.

### 4. Full Season Tables
- Add final Eastern Conference table snapshot per season.
- Show Atlanta row highlighted in each historical table.
- Include core columns: P, W, D, L, GF, GA, GD, Pts, Rank.

### 5. Historical Player + Roster Stats
- Add full roster list for each season.
- Add per-player season stats (apps, starts, minutes, goals, assists, cards).
- Add sorting/filtering (position, minutes, goals, etc.).
- Add links to player profile/history views.

## Data/Architecture Tasks
- Create versioned data model for `currentSeason` vs `historicalSeasons`.
- Add data pipeline support for pulling archived season-level data.
- Cache fetched season data to avoid slow page loads.
- Add schema validation for generated `data.js` output.

## UX Tasks
- Keep home focused on "quick glance" metrics only.
- Keep history page for deep exploration and long tables.
- Add loading and empty states for season toggle and historical tables.

## Testing Tasks
- Add regression checks for:
  - next match detection
  - next 3 fixtures generation
  - season label correctness
  - standings availability fallbacks
- Add snapshot test for `data.js` generation shape.
