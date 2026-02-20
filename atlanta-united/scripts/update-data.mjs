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

const FORMATION_TEMPLATES = [
  {
    id: "4-3-3",
    label: "4-3-3",
    slots: [
      { role: "GK", x: 50, y: 88 },
      { role: "LB", x: 18, y: 72 },
      { role: "LCB", x: 38, y: 74 },
      { role: "RCB", x: 62, y: 74 },
      { role: "RB", x: 82, y: 72 },
      { role: "LCM", x: 30, y: 52 },
      { role: "CM", x: 50, y: 48 },
      { role: "RCM", x: 70, y: 52 },
      { role: "LW", x: 20, y: 28 },
      { role: "ST", x: 50, y: 20 },
      { role: "RW", x: 80, y: 28 },
    ],
  },
  {
    id: "4-2-3-1",
    label: "4-2-3-1",
    slots: [
      { role: "GK", x: 50, y: 88 },
      { role: "LB", x: 18, y: 72 },
      { role: "LCB", x: 38, y: 74 },
      { role: "RCB", x: 62, y: 74 },
      { role: "RB", x: 82, y: 72 },
      { role: "LDM", x: 40, y: 57 },
      { role: "RDM", x: 60, y: 57 },
      { role: "LAM", x: 22, y: 38 },
      { role: "CAM", x: 50, y: 38 },
      { role: "RAM", x: 78, y: 38 },
      { role: "ST", x: 50, y: 20 },
    ],
  },
  {
    id: "4-4-2",
    label: "4-4-2",
    slots: [
      { role: "GK", x: 50, y: 88 },
      { role: "LB", x: 18, y: 72 },
      { role: "LCB", x: 38, y: 74 },
      { role: "RCB", x: 62, y: 74 },
      { role: "RB", x: 82, y: 72 },
      { role: "LM", x: 18, y: 48 },
      { role: "LCM", x: 38, y: 48 },
      { role: "RCM", x: 62, y: 48 },
      { role: "RM", x: 82, y: 48 },
      { role: "LST", x: 40, y: 27 },
      { role: "RST", x: 60, y: 27 },
    ],
  },
  {
    id: "4-3-1-2",
    label: "4-3-1-2",
    slots: [
      { role: "GK", x: 50, y: 88 },
      { role: "LB", x: 18, y: 72 },
      { role: "LCB", x: 38, y: 74 },
      { role: "RCB", x: 62, y: 74 },
      { role: "RB", x: 82, y: 72 },
      { role: "LCM", x: 30, y: 55 },
      { role: "CM", x: 50, y: 55 },
      { role: "RCM", x: 70, y: 55 },
      { role: "CAM", x: 50, y: 40 },
      { role: "LST", x: 40, y: 24 },
      { role: "RST", x: 60, y: 24 },
    ],
  },
  {
    id: "3-5-2",
    label: "3-5-2",
    slots: [
      { role: "GK", x: 50, y: 88 },
      { role: "LCB", x: 28, y: 74 },
      { role: "CB", x: 50, y: 76 },
      { role: "RCB", x: 72, y: 74 },
      { role: "LWB", x: 15, y: 54 },
      { role: "LCM", x: 35, y: 50 },
      { role: "CM", x: 50, y: 52 },
      { role: "RCM", x: 65, y: 50 },
      { role: "RWB", x: 85, y: 54 },
      { role: "LST", x: 40, y: 26 },
      { role: "RST", x: 60, y: 26 },
    ],
  },
  {
    id: "3-4-2-1",
    label: "3-4-2-1",
    slots: [
      { role: "GK", x: 50, y: 88 },
      { role: "LCB", x: 28, y: 74 },
      { role: "CB", x: 50, y: 76 },
      { role: "RCB", x: 72, y: 74 },
      { role: "LM", x: 17, y: 54 },
      { role: "LCM", x: 43, y: 55 },
      { role: "RCM", x: 57, y: 55 },
      { role: "RM", x: 83, y: 54 },
      { role: "LAM", x: 40, y: 36 },
      { role: "RAM", x: 60, y: 36 },
      { role: "ST", x: 50, y: 20 },
    ],
  },
  {
    id: "5-3-2",
    label: "5-3-2",
    slots: [
      { role: "GK", x: 50, y: 88 },
      { role: "LWB", x: 12, y: 68 },
      { role: "LCB", x: 32, y: 74 },
      { role: "CB", x: 50, y: 76 },
      { role: "RCB", x: 68, y: 74 },
      { role: "RWB", x: 88, y: 68 },
      { role: "LCM", x: 35, y: 50 },
      { role: "CM", x: 50, y: 52 },
      { role: "RCM", x: 65, y: 50 },
      { role: "LST", x: 40, y: 25 },
      { role: "RST", x: 60, y: 25 },
    ],
  },
];

const NOTABLE_LINEUPS = [
  {
    id: "2018-mls-cup-final",
    label: "2018 MLS Cup Final vs Portland",
    date: "2018-12-08",
    competition: "MLS Cup Final",
    formation: "4-3-3",
    players: {
      GK: "Brad Guzan",
      LB: "Greg Garza",
      LCB: "Leandro Gonzalez Pirez",
      RCB: "Michael Parkhurst",
      RB: "Franco Escobar",
      LCM: "Eric Remedi",
      CM: "Darlington Nagbe",
      RCM: "Jeff Larentowicz",
      LW: "Miguel Almiron",
      ST: "Josef Martinez",
      RW: "Julian Gressel",
    },
  },
  {
    id: "2019-us-open-cup-final",
    label: "2019 U.S. Open Cup Final vs Minnesota",
    date: "2019-08-27",
    competition: "U.S. Open Cup Final",
    formation: "3-5-2",
    players: {
      GK: "Brad Guzan",
      LCB: "Florentin Pogba",
      CB: "Miles Robinson",
      RCB: "Leandro Gonzalez Pirez",
      LWB: "Justin Meram",
      LCM: "Eric Remedi",
      CM: "Darlington Nagbe",
      RCM: "Ezequiel Barco",
      RWB: "Julian Gressel",
      LST: "Pity Martinez",
      RST: "Josef Martinez",
    },
  },
  {
    id: "2019-campeones-cup",
    label: "2019 Campeones Cup vs Club America",
    date: "2019-08-14",
    competition: "Campeones Cup",
    formation: "4-3-3",
    players: {
      GK: "Alec Kann",
      LB: "Franco Escobar",
      LCB: "Florentin Pogba",
      RCB: "Leandro Gonzalez Pirez",
      RB: "Julian Gressel",
      LCM: "Darlington Nagbe",
      CM: "Emerson Hyndman",
      RCM: "Jeff Larentowicz",
      LW: "Josef Martinez",
      ST: "Gonzalo Martinez",
      RW: "Dion Pereira",
    },
  },
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

async function fetchJsonSafe(url, fallback = {}) {
  try {
    return await fetchJson(url);
  } catch {
    return fallback;
  }
}

function collectEventLikeNodes(root) {
  const seen = new Set();
  const out = [];

  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }

    if (typeof node.date === "string" && (Array.isArray(node.competitions) || node.status)) {
      out.push(node);
    }

    for (const value of Object.values(node)) {
      walk(value);
    }
  }

  walk(root);
  return out;
}

function extractFixturesFromPayload(payload) {
  const explicit = [
    ...(Array.isArray(payload?.events) ? payload.events : []),
    ...(Array.isArray(payload?.team?.nextEvent) ? payload.team.nextEvent : []),
    ...(Array.isArray(payload?.nextEvent) ? payload.nextEvent : []),
  ];
  const discovered = collectEventLikeNodes(payload);
  return dedupeFixtures([...explicit, ...discovered].map(parseFixture).filter(Boolean));
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
  const urls = [
    `${ESPN_API_BASE}/teams/${TEAM_ID}/schedule?season=${seasonYear}`,
    `${ESPN_API_BASE}/teams/${TEAM_ID}/schedule?season=${seasonYear}&seasontype=2`,
    `${ESPN_API_BASE}/teams/${TEAM_ID}/schedule?season=${seasonYear}&seasontype=1`,
    `https://site.web.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/teams/${TEAM_ID}/schedule?season=${seasonYear}`,
    `https://site.web.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/teams/${TEAM_ID}/schedule?season=${seasonYear}&seasontype=2`,
  ];

  const all = [];
  for (const url of urls) {
    try {
      const payload = await fetchJson(url);
      all.push(...extractFixturesFromPayload(payload));
    } catch {
      // keep going; some variants may not exist for this sport/season
    }
  }

  return dedupeFixtures(all);
}

async function loadGeneralFixtures() {
  const urls = [
    `${ESPN_API_BASE}/teams/${TEAM_ID}/schedule`,
    `https://site.web.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/teams/${TEAM_ID}/schedule`,
  ];
  const all = [];
  for (const url of urls) {
    try {
      const payload = await fetchJson(url);
      all.push(...extractFixturesFromPayload(payload));
    } catch {
      // try next url variant
    }
  }
  return dedupeFixtures(all);
}

function formatDateYYYYMMDD(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

async function loadLeagueFixturesRange(fromDate, toDate) {
  const all = [];
  const startMs = Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate());
  const endMs = Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate());
  const dayMs = 24 * 60 * 60 * 1000;
  const windowDays = 21;

  for (let cursor = startMs; cursor <= endMs; cursor += windowDays * dayMs) {
    const windowStart = new Date(cursor);
    const windowEnd = new Date(Math.min(endMs, cursor + (windowDays - 1) * dayMs));
    const from = formatDateYYYYMMDD(windowStart);
    const to = formatDateYYYYMMDD(windowEnd);
    const url = `${ESPN_API_BASE}/scoreboard?dates=${from}-${to}&limit=1000`;
    const payload = await fetchJsonSafe(url, {});
    const events = payload?.events ?? [];
    all.push(...events.map(parseFixture).filter(Boolean));
  }

  return dedupeFixtures(all);
}

async function loadTeamOverviewNextEvents() {
  const urls = [
    `${ESPN_API_BASE}/teams/${TEAM_ID}`,
    `https://site.web.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/teams/${TEAM_ID}`,
  ];
  const all = [];
  for (const url of urls) {
    try {
      const payload = await fetchJson(url);
      all.push(...extractFixturesFromPayload(payload));
    } catch {
      // continue with fallback variant
    }
  }
  return dedupeFixtures(all);
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

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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

function buildQuickSnapshot(seasonFixtures, allFixtures, standings) {
  const completed = seasonFixtures.filter((m) => m.completed && m.outcome);
  const last5 = completed.slice(-5);
  const pointsLast5 = last5.reduce((sum, m) => sum + (m.outcome === "Win" ? 3 : m.outcome === "Draw" ? 1 : 0), 0);
  const goalDiffLast5 = last5.reduce((sum, m) => sum + ((m.atlScore ?? 0) - (m.oppScore ?? 0)), 0);
  const wdlLast5 = last5.reduce(
    (acc, m) => {
      if (m.outcome === "Win") acc.wins += 1;
      if (m.outcome === "Draw") acc.draws += 1;
      if (m.outcome === "Loss") acc.losses += 1;
      return acc;
    },
    { wins: 0, draws: 0, losses: 0 },
  );

  const now = Date.now();
  const seasonUpcoming = seasonFixtures
    .filter((f) => !f.completed && Number.isFinite(Date.parse(f.dateISO)) && Date.parse(f.dateISO) >= now - 12 * 60 * 60 * 1000)
    .sort((a, b) => Date.parse(a.dateISO) - Date.parse(b.dateISO));
  const allUpcoming = allFixtures
    .filter((f) => !f.completed && Number.isFinite(Date.parse(f.dateISO)) && Date.parse(f.dateISO) >= now - 12 * 60 * 60 * 1000)
    .sort((a, b) => Date.parse(a.dateISO) - Date.parse(b.dateISO));
  const upcoming = dedupeFixtures([...seasonUpcoming, ...allUpcoming])
    .slice(0, 3)
    .map((m) => ({
      opponent: m.opponent,
      dateISO: m.dateISO,
      venue: m.venue,
      competition: m.competition,
    }));

  const eastRows = standings?.east ?? [];
  const atlanta = standings?.atlanta;
  const playoffLineRank = 9;
  const playoffLineTeam = eastRows.find((r) => Number(r.rank) === playoffLineRank) ?? null;
  const atlPoints = toNumber(atlanta?.points);
  const linePoints = toNumber(playoffLineTeam?.points);
  const atlPlayed = toNumber(atlanta?.played);
  const linePlayed = toNumber(playoffLineTeam?.played);

  const playoffSnapshot =
    atlanta && /east/i.test(atlanta.conference || "")
      ? {
          conference: "East",
          rank: toNumber(atlanta.rank),
          points: atlPoints,
          lineRank: playoffLineRank,
          linePoints,
          pointsFromLine:
            atlPoints != null && linePoints != null ? atlPoints - linePoints : null,
          gamesInHand:
            atlPlayed != null && linePlayed != null ? linePlayed - atlPlayed : null,
        }
      : null;

  return {
    formTrend: {
      pointsLast5,
      goalDiffLast5,
      formRatingOutOf5: Number(((pointsLast5 / 15) * 5).toFixed(1)),
      goalDiffPerMatch: Number((goalDiffLast5 / 5).toFixed(2)),
      wdlLast5,
    },
    nextThree: upcoming,
    playoffLine: playoffSnapshot,
  };
}

function flattenRosterGroups(payload) {
  const groups = payload?.athletes ?? payload?.groups ?? [];
  const all = [];
  for (const group of groups) {
    const items = group?.items ?? group?.athletes ?? [];
    for (const athlete of items) all.push(athlete);
  }
  return all;
}

function collectAthleteStats(node, map) {
  if (!node || typeof node !== "object") return;

  if (Array.isArray(node)) {
    for (const item of node) collectAthleteStats(item, map);
    return;
  }

  const athlete = node?.athlete ?? node?.player ?? null;
  const stats = node?.stats ?? node?.statistics ?? null;
  if (athlete && stats) {
    const id = String(athlete?.id ?? "");
    if (id) {
      const curr = map.get(id) ?? {};
      const statArr = Array.isArray(stats) ? stats : [];
      for (const s of statArr) {
        const key = String(s?.name ?? s?.abbreviation ?? "").toLowerCase();
        const val = parseStatValue(s?.value ?? s?.displayValue);
        if (!key) continue;
        if (/(^appearances$|^gamesplayed$|^matches$|^apps$|^gp$)/.test(key) && curr.appearances == null) curr.appearances = val;
        if (/(^goals$|^goalsscored$)/.test(key) && curr.goals == null) curr.goals = val;
        if (/^assists$/.test(key) && curr.assists == null) curr.assists = val;
        if (/(^minutes$|^mins$|^timeplayed$)/.test(key) && curr.minutes == null) curr.minutes = val;
      }
      map.set(id, curr);
    }
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === "object") collectAthleteStats(value, map);
  }
}

async function loadPlayerStatsSnapshot() {
  const [rosterPayload, teamPayload, statsPayload] = await Promise.all([
    fetchJsonSafe(`${ESPN_API_BASE}/teams/${TEAM_ID}/roster`, {}),
    fetchJsonSafe(`${ESPN_API_BASE}/teams/${TEAM_ID}`, {}),
    fetchJsonSafe(`${ESPN_API_BASE}/teams/${TEAM_ID}/statistics`, {}),
  ]);

  const rosterAthletes = flattenRosterGroups(rosterPayload);
  const statsMap = new Map();
  collectAthleteStats(rosterPayload, statsMap);
  collectAthleteStats(teamPayload, statsMap);
  collectAthleteStats(statsPayload, statsMap);

  return rosterAthletes
    .map((a) => {
      const id = String(a?.id ?? "");
      const merged = statsMap.get(id) ?? {};
      const status = a?.status?.type?.shortDetail || a?.status?.type?.description || "Available";
      return {
        id,
        name: a?.displayName || a?.shortName || "Unknown",
        number: a?.jersey || "",
        position: a?.position?.abbreviation || a?.position?.name || "-",
        appearances: merged.appearances ?? null,
        goals: merged.goals ?? null,
        assists: merged.assists ?? null,
        minutes: merged.minutes ?? null,
        status,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function buildLiveData() {
  const nowYear = new Date().getUTCFullYear();
  const rangeStart = new Date(Date.UTC(nowYear - 1, 0, 1));
  const rangeEnd = new Date(Date.UTC(nowYear + 1, 11, 31));

  const [prevSeason, currentSeason, nextSeason, generalFixtures, leagueRangeFixtures, overviewNextEvents, standings, playerStats] = await Promise.all([
    loadSeasonFixtures(nowYear - 1),
    loadSeasonFixtures(nowYear),
    loadSeasonFixtures(nowYear + 1),
    loadGeneralFixtures(),
    loadLeagueFixturesRange(rangeStart, rangeEnd),
    loadTeamOverviewNextEvents(),
    loadStandingsSnapshot(),
    loadPlayerStatsSnapshot(),
  ]);

  const allFixtures = dedupeFixtures([
    ...leagueRangeFixtures,
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
  const quickSnapshot = buildQuickSnapshot(seasonFixtures, allFixtures, standings);
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
    quickSnapshot,
    playerStats,
    formationTemplates: FORMATION_TEMPLATES,
    notableLineups: NOTABLE_LINEUPS,
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
