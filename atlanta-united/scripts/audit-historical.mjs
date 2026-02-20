import { readFile, writeFile } from "node:fs/promises";

const HISTORICAL_PATH = new URL("../historical-data.json", import.meta.url);
const REPORT_PATH = new URL("../HISTORICAL_DATA_QUALITY_REPORT.md", import.meta.url);

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseRecord(recordLike) {
  if (!recordLike) return null;
  if (typeof recordLike === "string") {
    const m = recordLike.match(/(\d+)-(\d+)-(\d+)/);
    if (!m) return null;
    return { wins: Number(m[1]), draws: Number(m[2]), losses: Number(m[3]) };
  }
  const wins = asNumber(recordLike.wins);
  const draws = asNumber(recordLike.draws);
  const losses = asNumber(recordLike.losses);
  if (wins == null || draws == null || losses == null) return null;
  return { wins, draws, losses };
}

function pointsFromRecord(record) {
  if (!record) return null;
  return record.wins * 3 + record.draws;
}

function detectSeasonIssues(season) {
  const issues = [];
  const info = [];
  const schedule = Array.isArray(season.fullSchedule) ? season.fullSchedule : [];
  const table = Array.isArray(season.tableSnapshot) ? season.tableSnapshot : [];
  const pulse = season.seasonPulse ?? {};
  const long = season.seasonLongStats ?? {};

  if (schedule.length < 20) issues.push(`Low schedule count (${schedule.length})`);
  if (table.length < 10) issues.push(`Low table rows (${table.length})`);

  const hasLongStats = [long.goalsFor, long.goalsAgainst, long.homeRecord, long.awayRecord].every((v) => v != null && v !== "");
  if (!hasLongStats) issues.push("Missing season-long stats");

  const scheduleDates = schedule
    .map((m) => m?.date)
    .filter((d) => typeof d === "string")
    .map((d) => Date.parse(d));
  if (scheduleDates.some((d) => !Number.isFinite(d))) issues.push("Invalid schedule date(s)");

  const pulseRecord = parseRecord(pulse);
  const pulsePoints = asNumber(pulse.points);
  const expectedPoints = pointsFromRecord(pulseRecord);
  if (pulsePoints != null && expectedPoints != null && pulsePoints !== expectedPoints) {
    issues.push(`Points mismatch (pulse ${pulsePoints} vs record ${expectedPoints})`);
  }

  if (table.length > 0) {
    const topByPoints = table
      .slice()
      .sort((a, b) => {
        const pA = asNumber(a?.points) ?? Number.NEGATIVE_INFINITY;
        const pB = asNumber(b?.points) ?? Number.NEGATIVE_INFINITY;
        if (pB !== pA) return pB - pA;
        const gdA = asNumber(a?.goalDiff) ?? Number.NEGATIVE_INFINITY;
        const gdB = asNumber(b?.goalDiff) ?? Number.NEGATIVE_INFINITY;
        return gdB - gdA;
      })[0];

    const rankOne = table.find((r) => asNumber(r?.rank) === 1);
    const topPoints = asNumber(topByPoints?.points);
    const rankOnePoints = asNumber(rankOne?.points);
    if (topPoints != null && rankOnePoints != null && topPoints > rankOnePoints) {
      info.push("Source rank order inconsistent with points (UI sorts by points)");
    }
  }

  return { issues, info };
}

function buildReport(parsed) {
  const seasons = Array.isArray(parsed?.seasons) ? parsed.seasons : [];
  const sorted = seasons.slice().sort((a, b) => Number(b.season) - Number(a.season));
  const rows = [];
  const detailLines = [];
  const infoLines = [];

  for (const season of sorted) {
    const year = season?.season;
    const scheduleCount = Array.isArray(season?.fullSchedule) ? season.fullSchedule.length : 0;
    const tableCount = Array.isArray(season?.tableSnapshot) ? season.tableSnapshot.length : 0;
    const long = season?.seasonLongStats ?? {};
    const longStatsFilled = [long.goalsFor, long.goalsAgainst, long.homeRecord, long.awayRecord].every((v) => v != null && v !== "");
    const { issues, info } = detectSeasonIssues(season);

    rows.push(`| ${year} | ${scheduleCount} | ${tableCount} | ${longStatsFilled ? "Yes" : "No"} | ${issues.length === 0 ? "OK" : "Needs Review"} |`);

    if (issues.length > 0) {
      detailLines.push(`- ${year}: ${issues.join("; ")}`);
    }
    if (info.length > 0) {
      infoLines.push(`- ${year}: ${info.join("; ")}`);
    }
  }

  const header = [
    "# Historical Data Quality Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Historical generatedAt: ${parsed?.generatedAt ?? "unknown"}`,
    "",
    "## Season Summary",
    "",
    "| Season | Schedule Rows | Table Rows | Long Stats Filled | Status |",
    "|---|---:|---:|:---:|---|",
    ...rows,
    "",
    "## Issues",
    "",
    ...(detailLines.length > 0 ? detailLines : ["- None detected."]),
    "",
    "## Informational",
    "",
    ...(infoLines.length > 0 ? infoLines : ["- None."]),
    "",
    "## Notes",
    "",
    "- Table rows from source may not be ordered by points. UI currently sorts by points/GD/wins.",
    "- Use this report to decide which seasons need manual overrides in historical-data.json.",
  ];

  return header.join("\n");
}

async function main() {
  const raw = await readFile(HISTORICAL_PATH, "utf8");
  const parsed = JSON.parse(raw);
  const report = buildReport(parsed);
  await writeFile(REPORT_PATH, `${report}\n`, "utf8");
  console.log("Wrote HISTORICAL_DATA_QUALITY_REPORT.md");
}

main().catch((error) => {
  console.error(`Audit failed: ${error.message}`);
  process.exitCode = 1;
});
