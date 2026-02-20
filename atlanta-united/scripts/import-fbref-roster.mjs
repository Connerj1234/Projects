import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const HISTORICAL_PATH = new URL("../historical-data.json", import.meta.url);
const DEFAULT_INPUT_DIR = new URL("../fbref-cache", import.meta.url);

function decodeHtmlEntities(text) {
  return String(text ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtml(text) {
  return decodeHtmlEntities(String(text ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
}

function toNumber(value) {
  const cleaned = String(value ?? "").replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function dedupeRoster(rows) {
  const byKey = new Map();
  for (const row of rows) {
    const key = `${String(row.name ?? "").toLowerCase()}|${row.position ?? ""}`;
    if (!key) continue;
    byKey.set(key, row);
  }
  return [...byKey.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

function extractTablesFromHtml(html) {
  const tables = [];
  const direct = html.match(/<table[\s\S]*?<\/table>/gi) ?? [];
  tables.push(...direct);

  const commentBlocks = html.match(/<!--[\s\S]*?-->/g) ?? [];
  for (const block of commentBlocks) {
    const unwrapped = block.replace(/^<!--/, "").replace(/-->$/, "");
    const nested = unwrapped.match(/<table[\s\S]*?<\/table>/gi) ?? [];
    tables.push(...nested);
  }
  return tables;
}

function parseRowCells(rowHtml) {
  const cells = {};
  const cellRegex = /<(td|th)[^>]*data-stat=["']([^"']+)["'][^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = cellRegex.exec(rowHtml)) !== null) {
    cells[m[2]] = stripHtml(m[3]);
  }
  return cells;
}

function parseFbrefStandardRows(html, seasonYear) {
  if (!html) return [];
  const tables = extractTablesFromHtml(html);
  if (tables.length === 0) return [];

  const candidates = tables
    .map((tableHtml) => {
      const rowMatches = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
      const rows = [];

      for (const rowHtml of rowMatches) {
        if (/class=["'][^"']*thead/.test(rowHtml)) continue;
        const cells = parseRowCells(rowHtml);
        const name = cells.player;
        if (!name || /^squad total$/i.test(name)) continue;

        rows.push({
          id: `fbref-${seasonYear}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          name,
          number: "",
          position: cells.position || "-",
          appearances: toNumber(cells.games) ?? toNumber(cells.games_starts),
          starts: toNumber(cells.games_starts),
          goals: toNumber(cells.goals),
          assists: toNumber(cells.assists),
          minutes: toNumber(cells.minutes),
        });
      }

      const hasCoreColumns =
        /data-stat=["']player["']/.test(tableHtml) &&
        /data-stat=["']goals["']/.test(tableHtml) &&
        /data-stat=["']assists["']/.test(tableHtml) &&
        /data-stat=["']minutes["']/.test(tableHtml);
      const looksLikeStandard = /stats_standard/i.test(tableHtml) || /standard stats/i.test(tableHtml);

      return {
        rows,
        score: (hasCoreColumns ? 2 : 0) + (looksLikeStandard ? 1 : 0),
      };
    })
    .filter((c) => c.rows.length > 0)
    .sort((a, b) => b.score - a.score || b.rows.length - a.rows.length);

  if (candidates.length === 0) return [];
  return dedupeRoster(candidates[0].rows);
}

async function walkFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkFiles(full)));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

async function findSeasonHtml(inputDir, seasonYear) {
  const files = await walkFiles(inputDir);
  const htmlFiles = files.filter((f) => /\.(html?|mhtml)$/i.test(f));
  const seasonPattern = new RegExp(`\\b${seasonYear}\\b`);

  const ranked = htmlFiles
    .map((file) => {
      const base = path.basename(file);
      let score = 0;
      if (seasonPattern.test(base)) score += 3;
      if (/atlanta|atl-utd|atlutd|united/i.test(base)) score += 2;
      if (/fbref|stats|squad/i.test(base)) score += 1;
      return { file, score };
    })
    .sort((a, b) => b.score - a.score);

  for (const item of ranked) {
    try {
      const html = await readFile(item.file, "utf8");
      if (seasonPattern.test(html) && /fbref|stats_standard|atlanta united/i.test(html)) {
        return html;
      }
    } catch {
      // skip unreadable file
    }
  }
  return "";
}

async function main() {
  const inputDirArg = process.argv[2];
  const inputDir = inputDirArg ? path.resolve(inputDirArg) : path.resolve(DEFAULT_INPUT_DIR.pathname);

  const raw = await readFile(HISTORICAL_PATH, "utf8");
  const parsed = JSON.parse(raw);
  const seasons = Array.isArray(parsed?.seasons) ? parsed.seasons : [];
  if (seasons.length === 0) {
    throw new Error("historical-data.json has no seasons array.");
  }

  let imported = 0;
  let missing = 0;
  const updated = [];

  for (const season of seasons) {
    const year = Number(season?.season);
    if (!Number.isFinite(year)) {
      updated.push(season);
      continue;
    }

    const html = await findSeasonHtml(inputDir, year);
    if (!html) {
      missing += 1;
      console.log(`${year}: file not found / unreadable`);
      updated.push(season);
      continue;
    }

    const rosterStats = parseFbrefStandardRows(html, year);
    if (rosterStats.length === 0) {
      missing += 1;
      console.log(`${year}: parsed 0 roster rows`);
      updated.push(season);
      continue;
    }

    imported += 1;
    console.log(`${year}: imported ${rosterStats.length} roster rows`);
    updated.push({
      ...season,
      rosterStats,
      notes: `${season.notes ?? ""} FBref roster imported (${rosterStats.length} players).`.trim(),
    });
  }

  const output = {
    ...parsed,
    fbrefImportedAt: new Date().toISOString(),
    seasons: updated,
  };
  await writeFile(HISTORICAL_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(`FBref roster import complete. Seasons imported: ${imported}, missing/empty: ${missing}.`);
  console.log(`Input dir: ${inputDir}`);
}

main().catch((error) => {
  console.error(`FBref import failed: ${error.message}`);
  process.exitCode = 1;
});
