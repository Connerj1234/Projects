import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const HISTORICAL_PATH = new URL("../historical-data.json", import.meta.url);

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
  const map = new Map();
  for (const row of rows) {
    const key = `${String(row.name ?? "").toLowerCase()}|${row.position ?? ""}`;
    if (!key) continue;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
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

      return { rows, score: (hasCoreColumns ? 2 : 0) + (looksLikeStandard ? 1 : 0) };
    })
    .filter((c) => c.rows.length > 0)
    .sort((a, b) => b.score - a.score || b.rows.length - a.rows.length);

  if (candidates.length === 0) return [];
  return dedupeRoster(candidates[0].rows);
}

async function main() {
  const raw = await readFile(HISTORICAL_PATH, "utf8");
  const parsed = JSON.parse(raw);
  const seasons = Array.isArray(parsed?.seasons) ? parsed.seasons : [];
  if (seasons.length === 0) throw new Error("No seasons in historical-data.json");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  let imported = 0;
  let failed = 0;
  const updated = [];

  for (const season of seasons) {
    const year = Number(season?.season);
    if (!Number.isFinite(year)) {
      updated.push(season);
      continue;
    }

    const url = `https://fbref.com/en/squads/1ebc1a5b/${year}/Atlanta-United-Stats`;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      const html = await page.content();
      const rows = parseFbrefStandardRows(html, year);
      if (rows.length === 0) {
        console.log(`${year}: parsed 0 roster rows`);
        failed += 1;
        updated.push(season);
        continue;
      }

      console.log(`${year}: imported ${rows.length} roster rows`);
      imported += 1;
      updated.push({
        ...season,
        rosterStats: rows,
        notes: `${season.notes ?? ""} FBref roster scraped (${rows.length} players).`.trim(),
      });
    } catch (error) {
      console.log(`${year}: scrape failed (${error.message})`);
      failed += 1;
      updated.push(season);
    }
  }

  await browser.close();

  const output = {
    ...parsed,
    fbrefScrapedAt: new Date().toISOString(),
    seasons: updated,
  };
  await writeFile(HISTORICAL_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`FBref scrape complete. Seasons imported: ${imported}, failed/empty: ${failed}.`);
}

main().catch((error) => {
  console.error(`Scrape failed: ${error.message}`);
  process.exitCode = 1;
});
