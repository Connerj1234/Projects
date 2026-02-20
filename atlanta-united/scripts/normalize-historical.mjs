import { readFile, writeFile } from "node:fs/promises";

const HISTORICAL_PATH = new URL("../historical-data.json", import.meta.url);

function parseResult(result) {
  const m = String(result ?? "").match(/(\d+)\s*-\s*(\d+)\s*\((Win|Draw|Loss)\)/i);
  if (!m) return null;
  return {
    gf: Number(m[1]),
    ga: Number(m[2]),
    outcome: m[3][0].toUpperCase() + m[3].slice(1).toLowerCase(),
  };
}

function normalizeSeason(season) {
  const schedule = Array.isArray(season?.fullSchedule) ? season.fullSchedule : [];
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let gf = 0;
  let ga = 0;
  let homeW = 0;
  let homeD = 0;
  let homeL = 0;
  let awayW = 0;
  let awayD = 0;
  let awayL = 0;
  let cleanSheets = 0;
  let parsedCount = 0;

  for (const match of schedule) {
    const parsed = parseResult(match?.result);
    if (!parsed) continue;
    parsedCount += 1;
    gf += parsed.gf;
    ga += parsed.ga;
    if (parsed.ga === 0) cleanSheets += 1;

    if (parsed.outcome === "Win") wins += 1;
    if (parsed.outcome === "Draw") draws += 1;
    if (parsed.outcome === "Loss") losses += 1;

    const venue = String(match?.venue ?? "");
    if (/home/i.test(venue)) {
      if (parsed.outcome === "Win") homeW += 1;
      if (parsed.outcome === "Draw") homeD += 1;
      if (parsed.outcome === "Loss") homeL += 1;
    } else if (/away/i.test(venue)) {
      if (parsed.outcome === "Win") awayW += 1;
      if (parsed.outcome === "Draw") awayD += 1;
      if (parsed.outcome === "Loss") awayL += 1;
    }
  }

  if (parsedCount === 0) return season;

  return {
    ...season,
    seasonPulse: {
      ...(season?.seasonPulse ?? {}),
      wins,
      draws,
      losses,
      points: wins * 3 + draws,
    },
    seasonLongStats: {
      ...(season?.seasonLongStats ?? {}),
      goalsFor: gf,
      goalsAgainst: ga,
      homeRecord: `${homeW}-${homeD}-${homeL}`,
      awayRecord: `${awayW}-${awayD}-${awayL}`,
      cleanSheets,
    },
  };
}

async function main() {
  const raw = await readFile(HISTORICAL_PATH, "utf8");
  const parsed = JSON.parse(raw);
  const seasons = Array.isArray(parsed?.seasons) ? parsed.seasons : [];
  const normalized = seasons.map(normalizeSeason);
  const output = {
    ...parsed,
    normalizedAt: new Date().toISOString(),
    seasons: normalized,
  };
  await writeFile(HISTORICAL_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Normalized ${normalized.length} historical seasons.`);
}

main().catch((error) => {
  console.error(`Normalize failed: ${error.message}`);
  process.exitCode = 1;
});
