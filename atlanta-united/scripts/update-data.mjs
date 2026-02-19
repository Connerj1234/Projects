import { writeFile } from "node:fs/promises";

const TEAM_NAME = "Atlanta United";
const TEAM_ID = "18418";
const LEAGUE = "usa.1";
const ESPN_API_BASE = `https://site.api.espn.com/apis/site/v2/sports/soccer/${LEAGUE}`;

const STATIC_TIMELINE = [
  { year: "2014", text: "MLS awards Atlanta expansion franchise." },
  { year: "2017", text: "Debut MLS season and instant fan-energy identity." },
  { year: "2018", text: "MLS Cup champions at Mercedes-Benz Stadium." },
  { year: "2019", text: "U.S. Open Cup and Campeones Cup trophies." },
  { year: "Today", text: "New era focused on consistency and playoff pushes." },
];

const STATIC_SEASON_HISTORY = [
  { season: 2017, record: "15-9-10", points: 55, finish: "4th East", playoffs: "Lost Knockout Round" },
  { season: 2018, record: "21-7-6", points: 69, finish: "2nd East", playoffs: "MLS Cup Champions" },
  { season: 2019, record: "18-12-4", points: 58, finish: "2nd East", playoffs: "Lost Conference Final" },
  { season: 2020, record: "6-13-4", points: 22, finish: "12th East", playoffs: "Did Not Qualify" },
  { season: 2021, record: "13-9-12", points: 51, finish: "5th East", playoffs: "Lost Round One" },
  { season: 2022, record: "10-14-10", points: 40, finish: "11th East", playoffs: "Did Not Qualify" },
  { season: 2023, record: "13-9-12", points: 51, finish: "6th East", playoffs: "Lost Round One" },
  { season: 2024, record: "10-14-10", points: 40, finish: "9th East", playoffs: "Lost Conference Semifinal" },
  { season: 2025, record: "5-16-13", points: 28, finish: "14th East", playoffs: "Did Not Qualify" },
];

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      accept: "application/json",
      "accept-language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.json();
}

function getCompetitors(event) {
  return event?.competitions?.[0]?.competitors ?? [];
}

function parseTeamId(competitor) {
  return String(competitor?.id ?? competitor?.team?.id ?? "");
}

function isAtlantaCompetitor(competitor) {
  const idMatch = parseTeamId(competitor) === TEAM_ID;
  const name = `${competitor?.team?.displayName ?? competitor?.team?.name ?? ""}`;
  const nameMatch = /atlanta united/i.test(name);
  return idMatch || nameMatch;
}

function parseScore(value) {
  const score = Number.parseInt(value ?? "", 10);
  return Number.isFinite(score) ? score : null;
}

function parseFixture(event) {
  const competitors = getCompetitors(event);
  const atl = competitors.find(isAtlantaCompetitor);
  if (!atl) return null;

  const opp = competitors.find((c) => c !== atl);
  if (!opp) return null;

  const dateISO = event?.date;
  const parsed = Date.parse(dateISO ?? "");
  if (!Number.isFinite(parsed)) return null;

  const atlScore = parseScore(atl?.score);
  const oppScore = parseScore(opp?.score);
  const hasScore = Number.isFinite(atlScore) && Number.isFinite(oppScore);

  const completed = Boolean(event?.status?.type?.completed);
  let outcome = null;
  if (hasScore && completed) {
    if (atlScore > oppScore) outcome = "Win";
    if (atlScore === oppScore) outcome = "Draw";
    if (atlScore < oppScore) outcome = "Loss";
  }

  const competition = event?.league?.name || event?.competitions?.[0]?.type?.text || "MLS";
  const broadcasts = event?.competitions?.[0]?.broadcasts ?? [];
  const broadcast = broadcasts
    .flatMap((b) => b?.names ?? [])
    .filter(Boolean)
    .join(", ");
  const attendanceRaw = event?.competitions?.[0]?.attendance;
  const attendance = Number.isFinite(Number(attendanceRaw)) ? Number(attendanceRaw) : null;

  return {
    dateISO,
    date: dateISO.slice(0, 10),
    opponent: opp?.team?.displayName || "Unknown",
    venue: atl?.homeAway === "home" ? "Home" : "Away",
    venueFull: event?.competitions?.[0]?.venue?.fullName || (atl?.homeAway === "home" ? "Home" : "Away"),
    competition,
    broadcast: broadcast || "MLS Season Pass",
    completed,
    outcome,
    atlScore,
    oppScore,
    score: hasScore ? `${atlScore}-${oppScore}` : "-",
    attendance,
  };
}

function dedupeFixtures(fixtures) {
  const map = new Map();
  for (const fixture of fixtures) {
    const key = `${fixture.dateISO}|${fixture.opponent}|${fixture.venue}`;
    map.set(key, fixture);
  }
  return [...map.values()].sort((a, b) => Date.parse(a.dateISO) - Date.parse(b.dateISO));
}

async function loadSeasonFixtures(seasonYear) {
  const url = `${ESPN_API_BASE}/teams/${TEAM_ID}/schedule?season=${seasonYear}`;
  const payload = await fetchJson(url);
  const events = payload?.events ?? payload?.team?.nextEvent ?? [];
  return events.map(parseFixture).filter(Boolean);
}

async function loadGeneralFixtures() {
  const url = `${ESPN_API_BASE}/teams/${TEAM_ID}/schedule`;
  const payload = await fetchJson(url);
  const events = payload?.events ?? payload?.team?.nextEvent ?? [];
  return events.map(parseFixture).filter(Boolean);
}

async function loadTeamOverviewNextEvents() {
  const url = `${ESPN_API_BASE}/teams/${TEAM_ID}`;
  const payload = await fetchJson(url);
  const events = payload?.team?.nextEvent ?? payload?.nextEvent ?? [];
  return events.map(parseFixture).filter(Boolean);
}

function pickActiveSeason(fixtures, nowYear) {
  if (fixtures.length === 0) {
    throw new Error("No fixtures returned by ESPN endpoints.");
  }

  const byYear = new Map();
  for (const fixture of fixtures) {
    const year = Number.parseInt(fixture.date.slice(0, 4), 10);
    if (!Number.isFinite(year)) continue;
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(fixture);
  }

  const now = Date.now();
  const upcoming = fixtures
    .filter((f) => !f.completed && Date.parse(f.dateISO) >= now - 12 * 60 * 60 * 1000)
    .sort((a, b) => Date.parse(a.dateISO) - Date.parse(b.dateISO));

  if (upcoming.length > 0) {
    const year = Number.parseInt(upcoming[0].date.slice(0, 4), 10);
    const seasonFixtures = byYear.get(year) ?? [];
    return {
      year,
      label: `${year} MLS Regular Season${seasonFixtures.some((f) => f.completed) ? "" : " (Upcoming)"}`,
      fixtures: seasonFixtures,
    };
  }

  const current = byYear.get(nowYear) ?? [];
  if (current.length > 0) {
    return {
      year: nowYear,
      label: `${nowYear} MLS Regular Season`,
      fixtures: current,
    };
  }

  const years = [...byYear.keys()].sort((a, b) => b - a);
  const latest = years[0];
  return {
    year: latest,
    label: `${latest} MLS Regular Season (Latest Completed)`,
    fixtures: byYear.get(latest) ?? [],
  };
}

function deriveSeasonSnapshot(fixtures) {
  const completed = fixtures.filter((f) => f.completed && f.outcome);

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let cleanSheets = 0;
  let homeWins = 0;
  let homeDraws = 0;
  let homeLosses = 0;
  let awayWins = 0;
  let awayDraws = 0;
  let awayLosses = 0;
  let homeAttendanceTotal = 0;
  let homeAttendanceMatches = 0;

  for (const match of completed) {
    if (match.outcome === "Win") wins += 1;
    if (match.outcome === "Draw") draws += 1;
    if (match.outcome === "Loss") losses += 1;

    goalsFor += match.atlScore ?? 0;
    goalsAgainst += match.oppScore ?? 0;
    if ((match.oppScore ?? 1) === 0) cleanSheets += 1;

    if (match.venue === "Home") {
      if (match.outcome === "Win") homeWins += 1;
      if (match.outcome === "Draw") homeDraws += 1;
      if (match.outcome === "Loss") homeLosses += 1;
      if (Number.isFinite(match.attendance)) {
        homeAttendanceTotal += match.attendance;
        homeAttendanceMatches += 1;
      }
    } else {
      if (match.outcome === "Win") awayWins += 1;
      if (match.outcome === "Draw") awayDraws += 1;
      if (match.outcome === "Loss") awayLosses += 1;
    }
  }

  return {
    record: { wins, draws, losses },
    stats: {
      points: wins * 3 + draws,
      goalsFor,
      goalsAgainst,
      homeRecord: `${homeWins}-${homeDraws}-${homeLosses}`,
      awayRecord: `${awayWins}-${awayDraws}-${awayLosses}`,
      cleanSheets,
      avgAttendance: homeAttendanceMatches > 0 ? Math.round(homeAttendanceTotal / homeAttendanceMatches) : null,
    },
    formLastFive: completed
      .slice(-5)
      .reverse()
      .map((m) => m.outcome.charAt(0).toUpperCase()),
    results: completed
      .slice(-5)
      .reverse()
      .map((m) => ({
        date: m.date,
        opponent: m.opponent,
        venue: m.venue,
        score: m.score,
        outcome: m.outcome,
      })),
  };
}

function pickNextMatch(fixtures) {
  const now = Date.now();
  const upcoming = fixtures
    .filter((f) => !f.completed && Date.parse(f.dateISO) >= now - 12 * 60 * 60 * 1000)
    .sort((a, b) => Date.parse(a.dateISO) - Date.parse(b.dateISO));

  if (upcoming.length === 0) return null;
  const next = upcoming[0];

  return {
    opponent: next.opponent,
    dateISO: next.dateISO,
    competition: next.competition,
    venue: next.venueFull,
    broadcast: next.broadcast,
  };
}

function parseStatValue(raw) {
  if (raw == null) return null;
  const str = String(raw).trim();
  if (!str) return null;
  const asNumber = Number(str.replace(/,/g, ""));
  return Number.isFinite(asNumber) ? asNumber : str;
}

function parseStandingsRows(rows, conferenceName) {
  return rows.map((row, idx) => {
    const team = row?.team ?? {};
    const stats = row?.stats ?? [];

    const findStat = (...keys) => {
      const hit = stats.find((s) => keys.includes(s?.name) || keys.includes(s?.abbreviation));
      return hit ? parseStatValue(hit.displayValue ?? hit.value) : null;
    };

    const wins = findStat("wins", "W");
    const draws = findStat("ties", "draws", "D");
    const losses = findStat("losses", "L");
    const points = findStat("points", "P", "PTS");
    const gamesPlayed = findStat("gamesPlayed", "GP");
    const goalDiff = findStat("pointDifferential", "GD", "DIFF");

    return {
      rank: idx + 1,
      teamId: String(team?.id ?? ""),
      team: team?.displayName || team?.shortDisplayName || "Unknown",
      played: gamesPlayed,
      wins,
      draws,
      losses,
      points,
      goalDiff,
      conference: conferenceName,
      isAtlanta: String(team?.id ?? "") === TEAM_ID,
    };
  });
}

function flattenStandingsGroups(standingsPayload) {
  const normalized = [];

  function visit(node, fallbackName = "Conference") {
    if (!node || typeof node !== "object") return;

    const name = node?.name || node?.abbreviation || fallbackName;
    const entries = node?.standings?.entries ?? node?.entries ?? [];
    if (Array.isArray(entries) && entries.length > 0) {
      normalized.push({
        conference: name,
        rows: parseStandingsRows(entries, name),
      });
    }

    const children = [
      ...(Array.isArray(node?.children) ? node.children : []),
      ...(Array.isArray(node?.groups) ? node.groups : []),
      ...(Array.isArray(node?.standings?.groups) ? node.standings.groups : []),
    ];

    for (const child of children) {
      visit(child, name);
    }
  }

  visit(standingsPayload, "League");

  const byName = new Map();
  for (const item of normalized) {
    const key = item.conference.toLowerCase();
    const existing = byName.get(key);
    if (!existing || item.rows.length > existing.rows.length) {
      byName.set(key, item);
    }
  }

  return [...byName.values()];
}

async function loadStandingsSnapshot() {
  const url = `${ESPN_API_BASE}/standings`;
  const payload = await fetchJson(url);
  const conferences = flattenStandingsGroups(payload);

  const east = conferences.find((c) => /east/i.test(c.conference));
  const west = conferences.find((c) => /west/i.test(c.conference));

  const atlantaRow = [...(east?.rows ?? []), ...(west?.rows ?? [])].find((r) => r.isAtlanta) ?? null;

  return {
    east: east?.rows ?? [],
    west: west?.rows ?? [],
    atlanta: atlantaRow,
    generatedAt: new Date().toISOString(),
  };
}

async function buildLiveData() {
  const nowYear = new Date().getUTCFullYear();

  const [prevSeason, currentSeason, nextSeason, generalFixtures, overviewNextEvents, standings] = await Promise.all([
    loadSeasonFixtures(nowYear - 1),
    loadSeasonFixtures(nowYear),
    loadSeasonFixtures(nowYear + 1),
    loadGeneralFixtures(),
    loadTeamOverviewNextEvents(),
    loadStandingsSnapshot(),
  ]);

  const allFixtures = dedupeFixtures([
    ...generalFixtures,
    ...overviewNextEvents,
    ...prevSeason,
    ...currentSeason,
    ...nextSeason,
  ]);
  const selected = pickActiveSeason(allFixtures, nowYear);
  const seasonFixtures = dedupeFixtures(selected.fixtures);
  const snapshot = deriveSeasonSnapshot(seasonFixtures);
  const nextMatch = pickNextMatch(allFixtures);
  const atlantaStanding = standings?.atlanta ?? null;
  const position =
    atlantaStanding && Number.isFinite(Number(atlantaStanding.rank))
      ? { rank: Number(atlantaStanding.rank), conference: atlantaStanding.conference ?? "Conference" }
      : null;

  return {
    season: selected.label,
    clubName: TEAM_NAME,
    record: snapshot.record,
    stats: snapshot.stats,
    position,
    formLastFive: snapshot.formLastFive,
    nextMatch,
    results: snapshot.results,
    standings,
    seasonHistory: STATIC_SEASON_HISTORY,
    timeline: STATIC_TIMELINE,
  };
}

async function writeDataFile(data) {
  const output = `window.ATL_DATA = ${JSON.stringify(data, null, 2)};\n`;
  await writeFile(new URL("../data.js", import.meta.url), output, "utf8");
}

async function main() {
  try {
    const liveData = await buildLiveData();
    await writeDataFile(liveData);
    console.log("Updated data.js from ESPN fixtures and standings.");
  } catch (error) {
    console.error(`Live update failed: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
