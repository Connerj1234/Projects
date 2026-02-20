import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const HISTORICAL_PATH = new URL("../historical-data.json", import.meta.url);
const CACHE_DIR = new URL("../atlutd-stats-cache", import.meta.url);

const STATS_API_BASE = "https://stats-api.mlssoccer.com";
const COMPETITION_ID = "MLS-COM-000001";
const ATLANTA_CLUB_ID = "MLS-CLU-00000A";

function toNumber(value) {
  const cleaned = String(value ?? "").replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizePosition(raw) {
  const pos = String(raw ?? "").trim().toLowerCase();
  if (!pos) return "-";
  if (pos.includes("goal")) return "GK";
  if (pos.includes("def")) return "DF";
  if (pos.includes("mid")) return "MF";
  if (pos.includes("forw") || pos.includes("strik") || pos.includes("wing")) return "FW";
  return pos.slice(0, 3).toUpperCase();
}

function dedupeRows(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = `${String(r.name ?? "").toLowerCase()}|${r.position ?? ""}`;
    if (!key) continue;
    map.set(key, r);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "atlanta-united-fan-hub-data-script/1.0",
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }
  return response.json();
}

async function getSeasonId(seasonYear) {
  const seasonsUrl = `${STATS_API_BASE}/competitions/${COMPETITION_ID}/seasons`;
  const payload = await fetchJson(seasonsUrl);
  const seasons = Array.isArray(payload?.seasons) ? payload.seasons : [];
  const match = seasons.find((s) => Number(s?.season) === Number(seasonYear));
  if (!match?.season_id) {
    throw new Error(`Could not find season_id for ${seasonYear} from ${seasonsUrl}`);
  }
  return String(match.season_id);
}

async function getClubRosterMetadata(seasonSportecId) {
  const rosterUrl = `${STATS_API_BASE}/players/seasons/${seasonSportecId}/clubs/${ATLANTA_CLUB_ID}?per_page=1000&page=1`;
  const payload = await fetchJson(rosterUrl);
  const players = Array.isArray(payload?.players) ? payload.players : [];
  const byPlayerId = new Map();
  for (const p of players) {
    const id = String(p?.player_id ?? "").trim();
    if (!id) continue;
    byPlayerId.set(id, {
      playerId: id,
      name: String(p?.name ?? "").trim(),
      shirtNumber: p?.shirt_number,
      position: normalizePosition(p?.playing_position_english),
    });
  }
  return { players, byPlayerId, source: rosterUrl };
}

async function getClubPlayerStats(seasonSportecId) {
  const statsUrl = `${STATS_API_BASE}/statistics/players/competitions/${COMPETITION_ID}/seasons/${seasonSportecId}?club_id=${ATLANTA_CLUB_ID}&per_page=1000&page=1`;
  const payload = await fetchJson(statsUrl);
  const rows = Array.isArray(payload?.player_statistics) ? payload.player_statistics : [];
  return { rows, source: statsUrl };
}

function mapRowsToRoster(rows, metaByPlayerId, seasonYear) {
  const mapped = rows
    .map((row, n) => {
      const playerId = String(row?.player_id ?? "").trim();
      const meta = playerId ? metaByPlayerId.get(playerId) : null;
      const name =
        String(meta?.name ?? "").trim() ||
        `${String(row?.player_first_name ?? "").trim()} ${String(row?.player_last_name ?? "").trim()}`.trim();
      if (!name) return null;

      return {
        id: `atlutd-${seasonYear}-${n}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name,
        number: meta?.shirtNumber != null ? String(meta.shirtNumber) : "",
        position: meta?.position ?? "-",
        appearances: toNumber(row?.matches_played),
        starts: toNumber(
          row?.starts ??
            row?.gs ??
            row?.games_started ??
            row?.games_starts ??
            row?.matches_started ??
            row?.starts_played,
        ),
        goals: toNumber(row?.goals),
        assists: toNumber(row?.assists),
        minutes: toNumber(row?.normalized_player_minutes),
      };
    })
    .filter(Boolean);

  return dedupeRows(mapped);
}

async function mergeIntoHistorical(seasonYear, rosterStats) {
  const raw = await readFile(HISTORICAL_PATH, "utf8");
  const parsed = JSON.parse(raw);
  const seasons = Array.isArray(parsed?.seasons) ? parsed.seasons : [];
  const target = seasons.find((s) => Number(s?.season) === Number(seasonYear));
  if (!target) throw new Error(`Season ${seasonYear} not found in historical-data.json`);

  target.rosterStats = rosterStats;
  target.notes = `${target.notes ?? ""} ATLUTD stats import (${rosterStats.length} players).`.trim();
  parsed.atlutdImportedAt = new Date().toISOString();
  await writeFile(HISTORICAL_PATH, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
}

async function main() {
  const seasonYear = Number(process.argv[2] || "2025");
  if (!Number.isFinite(seasonYear)) {
    throw new Error("Usage: node scripts/scrape-atlutd-stats.mjs <seasonYear> [--merge-history] [--debug]");
  }
  const mergeHistory = process.argv.includes("--merge-history");
  const debug = process.argv.includes("--debug");

  const seasonSportecId = await getSeasonId(seasonYear);
  const [metaBundle, statsBundle] = await Promise.all([
    getClubRosterMetadata(seasonSportecId),
    getClubPlayerStats(seasonSportecId),
  ]);

  const rosterStats = mapRowsToRoster(statsBundle.rows, metaBundle.byPlayerId, seasonYear);

  await mkdir(path.resolve(CACHE_DIR.pathname), { recursive: true });
  const outPath = path.resolve(CACHE_DIR.pathname, `${seasonYear}.json`);
  await writeFile(
    outPath,
    `${JSON.stringify(
      {
        season: seasonYear,
        seasonSportecId,
        sources: {
          seasons: `${STATS_API_BASE}/competitions/${COMPETITION_ID}/seasons`,
          roster: metaBundle.source,
          stats: statsBundle.source,
        },
        extractedAt: new Date().toISOString(),
        rows: rosterStats,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(`ATLUTD import ${seasonYear}: extracted ${rosterStats.length} roster rows.`);
  if (debug) {
    console.log(`seasonSportecId=${seasonSportecId}`);
    console.log(`metaRows=${metaBundle.players.length}, statsRows=${statsBundle.rows.length}`);
  }
  console.log(`Saved: ${outPath}`);

  if (mergeHistory) {
    await mergeIntoHistorical(seasonYear, rosterStats);
    console.log(`Merged ${rosterStats.length} rows into historical-data.json season ${seasonYear}.`);
  }
}

main().catch((error) => {
  console.error(`ATLUTD import failed: ${error.message}`);
  process.exitCode = 1;
});
