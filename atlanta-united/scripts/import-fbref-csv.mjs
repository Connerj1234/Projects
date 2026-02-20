import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const HISTORICAL_PATH = new URL("../historical-data.json", import.meta.url);
const DEFAULT_INPUT_DIR = new URL("../fbref-csv", import.meta.url);

function parseCsvLine(line) {
  const out = [];
  let curr = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        curr += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(curr);
      curr = "";
    } else {
      curr += ch;
    }
  }
  out.push(curr);
  return out;
}

function toNumber(value) {
  const cleaned = String(value ?? "").replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function pickIndex(headers, names) {
  const lowered = headers.map((h) => String(h).trim().toLowerCase());
  for (const name of names) {
    const idx = lowered.findIndex((h) => h === name || h.includes(name));
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseFbrefCsv(csvText, seasonYear) {
  const lines = String(csvText ?? "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const idxPlayer = pickIndex(headers, ["player"]);
  const idxPos = pickIndex(headers, ["pos", "position"]);
  const idxApps = pickIndex(headers, ["games", "matches", "mp"]);
  const idxStarts = pickIndex(headers, ["starts", "games_starts"]);
  const idxGls = pickIndex(headers, ["goals", "gls"]);
  const idxAst = pickIndex(headers, ["assists", "ast"]);
  const idxMin = pickIndex(headers, ["minutes", "min"]);

  if (idxPlayer < 0) return [];

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = parseCsvLine(lines[i]);
    const name = String(cells[idxPlayer] ?? "").trim();
    if (!name || /^squad total$/i.test(name)) continue;
    rows.push({
      id: `fbref-csv-${seasonYear}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name,
      number: "",
      position: idxPos >= 0 ? String(cells[idxPos] ?? "").trim() || "-" : "-",
      appearances: idxApps >= 0 ? toNumber(cells[idxApps]) : null,
      starts: idxStarts >= 0 ? toNumber(cells[idxStarts]) : null,
      goals: idxGls >= 0 ? toNumber(cells[idxGls]) : null,
      assists: idxAst >= 0 ? toNumber(cells[idxAst]) : null,
      minutes: idxMin >= 0 ? toNumber(cells[idxMin]) : null,
    });
  }

  const dedupe = new Map();
  for (const r of rows) dedupe.set(`${r.name.toLowerCase()}|${r.position}`, r);
  return [...dedupe.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function main() {
  const inputDirArg = process.argv[2];
  const inputDir = inputDirArg ? path.resolve(inputDirArg) : path.resolve(DEFAULT_INPUT_DIR.pathname);
  const files = await readdir(inputDir);
  const csvFiles = files.filter((f) => /\.csv$/i.test(f));

  const raw = await readFile(HISTORICAL_PATH, "utf8");
  const parsed = JSON.parse(raw);
  const seasons = Array.isArray(parsed?.seasons) ? parsed.seasons : [];

  let imported = 0;
  for (const season of seasons) {
    const year = Number(season?.season);
    if (!Number.isFinite(year)) continue;
    const file = csvFiles.find((f) => new RegExp(`\\b${year}\\b`).test(f));
    if (!file) {
      console.log(`${year}: csv not found`);
      continue;
    }
    const csvText = await readFile(path.join(inputDir, file), "utf8");
    const rosterStats = parseFbrefCsv(csvText, year);
    if (rosterStats.length === 0) {
      console.log(`${year}: parsed 0 roster rows from ${file}`);
      continue;
    }
    season.rosterStats = rosterStats;
    season.notes = `${season.notes ?? ""} FBref CSV imported (${rosterStats.length} players).`.trim();
    imported += 1;
    console.log(`${year}: imported ${rosterStats.length} roster rows from ${file}`);
  }

  parsed.fbrefCsvImportedAt = new Date().toISOString();
  await writeFile(HISTORICAL_PATH, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  console.log(`FBref CSV import complete. Seasons imported: ${imported}.`);
}

main().catch((error) => {
  console.error(`CSV import failed: ${error.message}`);
  process.exitCode = 1;
});
