import { readFile, writeFile } from "node:fs/promises";

const TEAM_NAME = "Atlanta United";
const TEAM_ID = "18418";
const LEAGUE = "usa.1";
const ESPN_API_BASE = `https://site.api.espn.com/apis/site/v2/sports/soccer/${LEAGUE}`;
const HISTORICAL_DATA_FILE = new URL("../historical-data.json", import.meta.url);
const UPCOMING_GRACE_MS = 12 * 60 * 60 * 1000;
const MLS_STATS_API_BASE = "https://stats-api.mlssoccer.com";
const MLS_COMPETITION_ID = "MLS-COM-000001";
const MLS_ATLANTA_CLUB_ID = "MLS-CLU-00000A";

const STATIC_TIMELINE = [
  { year: "2014", text: "MLS awards Atlanta an expansion franchise, setting the foundation for top-flight soccer in the city." },
  { year: "2016", text: "Gerardo 'Tata' Martino is hired as the club's first head coach before the inaugural season." },
  { year: "2017", text: "Inaugural MLS season: Miguel Almiron and Josef Martinez headline the launch, Atlanta reaches the playoffs, and the club establishes a major home-attendance culture." },
  { year: "2018", text: "Major signing: Ezequiel Barco arrives as a DP. On-field peak: Atlanta wins MLS Cup in just its second season under Martino." },
  { year: "2019", text: "Manager era shifts to Frank de Boer. Transfer cycle includes Almiron's move to Newcastle and Pity Martinez's arrival. Trophy haul: U.S. Open Cup and Campeones Cup." },
  { year: "2020", text: "Disrupted pandemic season. De Boer departs and Stephen Glass takes over as interim head coach during a reset year." },
  { year: "2021", text: "Gabriel Heinze is appointed, then relieved midseason. Gonzalo Pineda is hired in August and leads a late push back to the playoffs." },
  { year: "2022", text: "Thiago Almada joins from Velez Sarsfield and quickly becomes a centerpiece, later winning MLS Newcomer of the Year." },
  { year: "2023", text: "Key striker signing: Giorgos Giakoumakis. Almada delivers an elite attacking season and earns major league recognition." },
  { year: "2024", text: "Coaching transition year: Pineda exits, Rob Valentino serves interim duties, and Ronny Deila is hired in December. Major transfer activity includes Almada's MLS-record outgoing move and Alexey Miranchuk's arrival." },
  { year: "2025", text: "Big-market reset: Miguel Almiron returns and Emmanuel Latte Lath is signed. Deila is dismissed in October, then Tata Martino returns in November for a new cycle." },
  { year: "2026", text: "Current chapter: the club continues under returning Tata with a focus on restoring consistent playoff-level standards." },
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

function parseRecord(recordStr) {
  const match = String(recordStr ?? "").match(/(\d+)-(\d+)-(\d+)/);
  if (!match) return { wins: null, draws: null, losses: null };
  return {
    wins: Number.parseInt(match[1], 10),
    draws: Number.parseInt(match[2], 10),
    losses: Number.parseInt(match[3], 10),
  };
}

function formatHistoricalResult(match) {
  if (!match.completed || !match.outcome) return "-";
  return `${match.score} (${match.outcome})`;
}

function buildHistoricalSeasons(seasonRows, fixturesBySeason, standingsBySeason, rosterBySeason) {
  return seasonRows
    .slice()
    .sort((a, b) => b.season - a.season)
    .map((row) => {
      const season = Number(row.season);
      const record = parseRecord(row.record);
      const fixtures = dedupeFixtures(fixturesBySeason.get(season) ?? []);
      const snapshot = deriveSeasonSnapshot(fixtures);
      const completedCount = fixtures.filter((m) => m.completed && m.outcome).length;
      const pulseRecord =
        completedCount > 0
          ? {
              wins: snapshot.record.wins,
              draws: snapshot.record.draws,
              losses: snapshot.record.losses,
            }
          : record;
      const pulsePoints = completedCount > 0 ? snapshot.stats.points : row.points;
      const standings = standingsBySeason.get(season) ?? { east: [], west: [], atlanta: null };
      const tableSnapshot = standings.east.length > 0 ? standings.east : standings.west;
      const rosterStats = (rosterBySeason?.get(season) ?? []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));

      return {
        season,
        seasonLabel: `${season} MLS Regular Season`,
        seasonPulse: {
          wins: pulseRecord?.wins ?? null,
          draws: pulseRecord?.draws ?? null,
          losses: pulseRecord?.losses ?? null,
          points: pulsePoints ?? null,
          finish: row.finish,
          playoffs: row.playoffs,
        },
        seasonLongStats: {
          goalsFor: completedCount > 0 ? snapshot.stats.goalsFor : null,
          goalsAgainst: completedCount > 0 ? snapshot.stats.goalsAgainst : null,
          homeRecord: completedCount > 0 ? snapshot.stats.homeRecord : null,
          awayRecord: completedCount > 0 ? snapshot.stats.awayRecord : null,
          cleanSheets: completedCount > 0 ? snapshot.stats.cleanSheets : null,
          avgAttendance: completedCount > 0 ? snapshot.stats.avgAttendance : null,
        },
        fullSchedule: fixtures.map((match) => ({
          date: match.date,
          opponent: match.opponent,
          venue: match.venue,
          competition: match.competition,
          result: formatHistoricalResult(match),
        })),
        tableSnapshot,
        rosterStats,
        notes:
          fixtures.length > 0 || tableSnapshot.length > 0 || rosterStats.length > 0
            ? `Loaded ${fixtures.length} fixtures${tableSnapshot.length > 0 ? `, ${tableSnapshot.length} table rows` : ""}${rosterStats.length > 0 ? `, ${rosterStats.length} roster rows` : ""}.`
            : "Historical season feed returned no fixtures/table rows for this season.",
      };
    });
}

function buildHistoricalSeasonsFallback() {
  return STATIC_SEASON_HISTORY
    .slice()
    .sort((a, b) => b.season - a.season)
    .map((row) => {
      const record = parseRecord(row.record);
      return {
        season: Number(row.season),
        seasonLabel: `${row.season} MLS Regular Season`,
        seasonPulse: {
          wins: record.wins,
          draws: record.draws,
          losses: record.losses,
          points: row.points,
          finish: row.finish,
          playoffs: row.playoffs,
        },
        seasonLongStats: {
          goalsFor: null,
          goalsAgainst: null,
          homeRecord: null,
          awayRecord: null,
          cleanSheets: null,
          avgAttendance: null,
        },
        fullSchedule: [],
        tableSnapshot: [],
        rosterStats: [],
        notes: "Historical backfill pending. Run: npm run backfill-historical",
      };
    });
}

async function loadHistoricalDataFromFile() {
  try {
    const raw = await readFile(HISTORICAL_DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    const seasons = Array.isArray(parsed?.seasons) ? parsed.seasons : Array.isArray(parsed) ? parsed : null;
    if (seasons) {
      return seasons.map((season) => {
        const scheduleLen = Array.isArray(season?.fullSchedule) ? season.fullSchedule.length : 0;
        const stats = season?.seasonLongStats ?? {};
        const looksLikeEmptyStats =
          scheduleLen === 0 &&
          Number(stats.goalsFor) === 0 &&
          Number(stats.goalsAgainst) === 0 &&
          String(stats.homeRecord ?? "") === "0-0-0" &&
          String(stats.awayRecord ?? "") === "0-0-0";
        if (!looksLikeEmptyStats) return season;
        return {
          ...season,
          seasonLongStats: {
            ...stats,
            goalsFor: null,
            goalsAgainst: null,
            homeRecord: null,
            awayRecord: null,
            cleanSheets: null,
            avgAttendance: null,
          },
        };
      });
    }
    return buildHistoricalSeasonsFallback();
  } catch {
    return buildHistoricalSeasonsFallback();
  }
}

async function writeHistoricalDataFile(seasons) {
  const output = JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      seasons,
    },
    null,
    2,
  );
  await writeFile(HISTORICAL_DATA_FILE, `${output}\n`, "utf8");
}

function normalizeHistoricalSeasonForDiff(season) {
  const table = Array.isArray(season?.tableSnapshot)
    ? season.tableSnapshot
        .slice()
        .sort((a, b) => Number(a?.rank ?? 999) - Number(b?.rank ?? 999) || String(a?.team ?? "").localeCompare(String(b?.team ?? "")))
        .map((row) => ({
          rank: row?.rank ?? null,
          teamId: row?.teamId ?? "",
          team: row?.team ?? "",
          played: row?.played ?? null,
          wins: row?.wins ?? null,
          draws: row?.draws ?? null,
          losses: row?.losses ?? null,
          points: row?.points ?? null,
          goalDiff: row?.goalDiff ?? null,
          conference: row?.conference ?? "",
          isAtlanta: Boolean(row?.isAtlanta),
        }))
    : [];

  const roster = Array.isArray(season?.rosterStats)
    ? season.rosterStats
        .slice()
        .sort((a, b) => String(a?.name ?? "").localeCompare(String(b?.name ?? "")))
        .map((row) => ({
          id: row?.id ?? "",
          name: row?.name ?? "",
          number: row?.number ?? "",
          position: row?.position ?? "",
          appearances: row?.appearances ?? null,
          starts: row?.starts ?? null,
          goals: row?.goals ?? null,
          assists: row?.assists ?? null,
          minutes: row?.minutes ?? null,
        }))
    : [];

  const schedule = Array.isArray(season?.fullSchedule)
    ? season.fullSchedule.map((match) => ({
        date: match?.date ?? "",
        opponent: match?.opponent ?? "",
        venue: match?.venue ?? "",
        competition: match?.competition ?? "",
        result: match?.result ?? "",
      }))
    : [];

  return {
    season: Number(season?.season),
    seasonLabel: season?.seasonLabel ?? "",
    seasonPulse: season?.seasonPulse ?? {},
    seasonLongStats: season?.seasonLongStats ?? {},
    fullSchedule: schedule,
    tableSnapshot: table,
    rosterStats: roster,
  };
}

function mergeSeasonHistoryRow(year, existingSeason) {
  const seasonRow = STATIC_SEASON_HISTORY.find((row) => Number(row.season) === Number(year));
  const parsedStaticRecord = seasonRow ? parseRecord(seasonRow.record) : null;
  return {
    static: seasonRow ?? null,
    wins: parsedStaticRecord?.wins ?? existingSeason?.seasonPulse?.wins ?? null,
    draws: parsedStaticRecord?.draws ?? existingSeason?.seasonPulse?.draws ?? null,
    losses: parsedStaticRecord?.losses ?? existingSeason?.seasonPulse?.losses ?? null,
    points: seasonRow?.points ?? existingSeason?.seasonPulse?.points ?? null,
    finish: seasonRow?.finish ?? existingSeason?.seasonPulse?.finish ?? null,
    playoffs: seasonRow?.playoffs ?? existingSeason?.seasonPulse?.playoffs ?? null,
  };
}

function buildInSeasonHistoricalEntry({ year, fixtures, standings, rosterStats, existingSeason }) {
  const dedupedFixtures = dedupeFixtures(fixtures ?? []);
  const snapshot = deriveSeasonSnapshot(dedupedFixtures);
  const completedCount = dedupedFixtures.filter((m) => m.completed && m.outcome).length;
  const seasonDefaults = mergeSeasonHistoryRow(year, existingSeason);
  const east = standings?.east ?? [];
  const west = standings?.west ?? [];
  const tableSnapshot = (east.length > 0 ? east : west).slice();
  const incomingRoster = dedupeRosterStats(rosterStats ?? []);
  const existingRoster = dedupeRosterStats(existingSeason?.rosterStats ?? []);
  const sortedRoster =
    incomingRoster.length > 0 && hasMeaningfulRosterStats(incomingRoster)
      ? incomingRoster
      : existingRoster.length > 0
        ? existingRoster
        : incomingRoster;

  const notes =
    dedupedFixtures.length > 0 || tableSnapshot.length > 0 || sortedRoster.length > 0
      ? `In-season sync: ${dedupedFixtures.length} fixtures${tableSnapshot.length > 0 ? `, ${tableSnapshot.length} table rows` : ""}${sortedRoster.length > 0 ? `, ${sortedRoster.length} roster rows` : ""}.`
      : "In-season sync has no fixture/table/roster rows yet.";

  return {
    season: Number(year),
    seasonLabel: `${year} MLS Regular Season`,
    seasonPulse: {
      wins: completedCount > 0 ? snapshot.record.wins : seasonDefaults.wins,
      draws: completedCount > 0 ? snapshot.record.draws : seasonDefaults.draws,
      losses: completedCount > 0 ? snapshot.record.losses : seasonDefaults.losses,
      points: completedCount > 0 ? snapshot.stats.points : seasonDefaults.points,
      finish: seasonDefaults.finish,
      playoffs: seasonDefaults.playoffs,
    },
    seasonLongStats: {
      goalsFor: completedCount > 0 ? snapshot.stats.goalsFor : null,
      goalsAgainst: completedCount > 0 ? snapshot.stats.goalsAgainst : null,
      homeRecord: completedCount > 0 ? snapshot.stats.homeRecord : null,
      awayRecord: completedCount > 0 ? snapshot.stats.awayRecord : null,
      cleanSheets: completedCount > 0 ? snapshot.stats.cleanSheets : null,
      avgAttendance: completedCount > 0 ? snapshot.stats.avgAttendance : null,
    },
    fullSchedule: dedupedFixtures.map((match) => ({
      date: match.date,
      opponent: match.opponent,
      venue: match.venue,
      competition: match.competition,
      result: formatHistoricalResult(match),
    })),
    tableSnapshot,
    rosterStats: sortedRoster,
    notes,
  };
}

function upsertSeasonIfChanged(existingSeasons, nextSeason) {
  const seasons = Array.isArray(existingSeasons) ? existingSeasons.slice() : [];
  const idx = seasons.findIndex((row) => Number(row?.season) === Number(nextSeason?.season));
  const sorted = (rows) => rows.slice().sort((a, b) => Number(b?.season) - Number(a?.season));

  if (idx < 0) {
    return {
      seasons: sorted([...seasons, nextSeason]),
      changed: true,
      action: "inserted",
    };
  }

  const currentNorm = normalizeHistoricalSeasonForDiff(seasons[idx]);
  const nextNorm = normalizeHistoricalSeasonForDiff(nextSeason);
  if (JSON.stringify(currentNorm) === JSON.stringify(nextNorm)) {
    return {
      seasons: sorted(seasons),
      changed: false,
      action: "unchanged",
    };
  }

  seasons[idx] = nextSeason;
  return {
    seasons: sorted(seasons),
    changed: true,
    action: "updated",
  };
}

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

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
      "accept-language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }
  return response.text();
}

async function fetchTextSafe(url, fallback = "") {
  try {
    return await fetchText(url);
  } catch {
    return fallback;
  }
}

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
  const statusState = String(event?.status?.type?.state ?? "").toLowerCase();
  const isPostState = statusState === "post" || statusState === "final";
  const oldEnoughToBeFinal = parsed <= Date.now() - UPCOMING_GRACE_MS;

  const completed = Boolean(event?.status?.type?.completed) || (hasScore && (isPostState || oldEnoughToBeFinal));
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
    const existing = map.get(key);
    if (!existing || isBetterFixture(fixture, existing)) {
      map.set(key, fixture);
    }
  }
  return [...map.values()].sort((a, b) => Date.parse(a.dateISO) - Date.parse(b.dateISO));
}

function fixtureQuality(fixture) {
  const hasScore = Number.isFinite(fixture?.atlScore) && Number.isFinite(fixture?.oppScore);
  let score = 0;
  if (fixture?.completed) score += 50;
  if (hasScore) score += 30;
  if (fixture?.outcome) score += 20;
  if (Number.isFinite(fixture?.attendance)) score += 5;
  if (fixture?.broadcast && fixture.broadcast !== "MLS Season Pass") score += 2;
  if (fixture?.venueFull && !/^(Home|Away)$/i.test(fixture.venueFull)) score += 2;
  if (fixture?.competition && fixture.competition !== "MLS") score += 1;
  return score;
}

function isBetterFixture(candidate, existing) {
  const candidateQuality = fixtureQuality(candidate);
  const existingQuality = fixtureQuality(existing);
  if (candidateQuality !== existingQuality) return candidateQuality > existingQuality;

  const candidateDate = Date.parse(candidate?.dateISO ?? "");
  const existingDate = Date.parse(existing?.dateISO ?? "");
  if (Number.isFinite(candidateDate) && Number.isFinite(existingDate) && candidateDate !== existingDate) {
    return candidateDate > existingDate;
  }

  return false;
}

function isUpcomingFixture(fixture, nowMs = Date.now()) {
  const kickoffMs = Date.parse(fixture?.dateISO ?? "");
  if (!Number.isFinite(kickoffMs)) return false;
  if (fixture?.completed) return false;
  if (kickoffMs < nowMs - UPCOMING_GRACE_MS) return false;
  return kickoffMs >= nowMs - UPCOMING_GRACE_MS;
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

async function loadSeasonFixturesHistorical(seasonYear) {
  const [seasonFixtures, rangeFixtures] = await Promise.all([
    loadSeasonFixtures(seasonYear),
    loadLeagueFixturesRange(
      new Date(Date.UTC(seasonYear, 0, 1)),
      new Date(Date.UTC(seasonYear, 11, 31)),
    ),
  ]);

  return dedupeFixtures([...seasonFixtures, ...rangeFixtures]);
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
    .filter((f) => isUpcomingFixture(f, now))
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
    const hasUnplayedCurrent = current.some((fixture) => !fixture.completed);
    if (!hasUnplayedCurrent) {
      const nextYear = nowYear + 1;
      const nextSeasonFixtures = byYear.get(nextYear) ?? [];
      return {
        year: nextYear,
        label: `${nextYear} MLS Regular Season (Upcoming)`,
        fixtures: nextSeasonFixtures,
      };
    }
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
    .filter((f) => isUpcomingFixture(f, now))
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
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }
  const str = String(raw).trim();
  if (!str) return null;
  if (/^(-|--|n\/a|null|undefined)$/i.test(str)) return null;

  const compact = str.replace(/,/g, "");
  const asNumber = Number(compact);
  if (Number.isFinite(asNumber)) return asNumber;

  const numericMatch = compact.match(/-?\d+(?:\.\d+)?/);
  if (numericMatch) {
    const extracted = Number(numericMatch[0]);
    if (Number.isFinite(extracted)) return extracted;
  }

  return null;
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sortConferenceRows(rows) {
  const sorted = rows
    .slice()
    .sort((a, b) => {
      const pointsDiff = (toNumber(b?.points) ?? -9999) - (toNumber(a?.points) ?? -9999);
      if (pointsDiff !== 0) return pointsDiff;

      const gdDiff = (toNumber(b?.goalDiff) ?? -9999) - (toNumber(a?.goalDiff) ?? -9999);
      if (gdDiff !== 0) return gdDiff;

      const winsDiff = (toNumber(b?.wins) ?? -9999) - (toNumber(a?.wins) ?? -9999);
      if (winsDiff !== 0) return winsDiff;

      const playedDiff = (toNumber(a?.played) ?? 9999) - (toNumber(b?.played) ?? 9999);
      if (playedDiff !== 0) return playedDiff;

      return String(a?.team ?? "").localeCompare(String(b?.team ?? ""));
    });

  return sorted.map((row, idx) => ({ ...row, rank: idx + 1 }));
}

function parseStandingsRows(rows, conferenceName) {
  const parsed = rows.map((row) => {
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
      rank: null,
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

  return sortConferenceRows(parsed);
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
  const nowYear = new Date().getUTCFullYear();
  const urls = [
    `${ESPN_API_BASE}/standings`,
    `${ESPN_API_BASE}/standings?season=${nowYear}`,
    `${ESPN_API_BASE}/standings?season=${nowYear}&seasontype=2`,
    `https://site.web.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/standings`,
    `https://site.web.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/standings?season=${nowYear}`,
    `https://site.web.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/standings?season=${nowYear}&seasontype=2`,
  ];

  for (const url of urls) {
    const payload = await fetchJsonSafe(url, null);
    if (!payload) continue;
    const conferences = flattenStandingsGroups(payload);
    const east = conferences.find((c) => /east/i.test(c.conference));
    const west = conferences.find((c) => /west/i.test(c.conference));
    const atlantaRow = [...(east?.rows ?? []), ...(west?.rows ?? [])].find((r) => r.isAtlanta) ?? null;

    if ((east?.rows?.length ?? 0) > 0 || (west?.rows?.length ?? 0) > 0) {
      return {
        east: east?.rows ?? [],
        west: west?.rows ?? [],
        atlanta: atlantaRow,
        generatedAt: new Date().toISOString(),
      };
    }
  }

  return {
    east: [],
    west: [],
    atlanta: null,
    generatedAt: new Date().toISOString(),
  };
}

async function loadStandingsSnapshotForSeason(seasonYear) {
  const urls = [
    `${ESPN_API_BASE}/standings?season=${seasonYear}`,
    `${ESPN_API_BASE}/standings?season=${seasonYear}&seasontype=2`,
    `https://site.web.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/standings?season=${seasonYear}`,
    `https://site.web.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/standings?season=${seasonYear}&seasontype=2`,
  ];

  for (const url of urls) {
    const payload = await fetchJsonSafe(url, null);
    if (!payload) continue;

    const conferences = flattenStandingsGroups(payload);
    const east = conferences.find((c) => /east/i.test(c.conference));
    const west = conferences.find((c) => /west/i.test(c.conference));
    const atlantaRow = [...(east?.rows ?? []), ...(west?.rows ?? [])].find((r) => r.isAtlanta) ?? null;

    if ((east?.rows?.length ?? 0) > 0 || (west?.rows?.length ?? 0) > 0) {
      return {
        east: east?.rows ?? [],
        west: west?.rows ?? [],
        atlanta: atlantaRow,
        generatedAt: new Date().toISOString(),
      };
    }
  }

  return {
    east: [],
    west: [],
    atlanta: null,
    generatedAt: new Date().toISOString(),
  };
}

function buildQuickSnapshot(seasonFixtures, allFixtures, standings) {
  const completed = seasonFixtures.filter((m) => m.completed && m.outcome);
  const last5 = completed.slice(-5);
  const gamesSampled = last5.length;
  const pointsLast5 = last5.reduce((sum, m) => sum + (m.outcome === "Win" ? 3 : m.outcome === "Draw" ? 1 : 0), 0);
  const formMaxPoints = gamesSampled > 0 ? gamesSampled * 3 : null;
  const goalDiffLast5 = last5.reduce((sum, m) => sum + ((m.atlScore ?? 0) - (m.oppScore ?? 0)), 0);
  const cleanSheetsLastN = last5.reduce((sum, m) => sum + ((m.oppScore ?? 1) === 0 ? 1 : 0), 0);
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
    .filter((f) => isUpcomingFixture(f, now))
    .sort((a, b) => Date.parse(a.dateISO) - Date.parse(b.dateISO));
  const allUpcoming = allFixtures
    .filter((f) => isUpcomingFixture(f, now))
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
      formRatingOutOf5: formMaxPoints ? Number(((pointsLast5 / formMaxPoints) * 5).toFixed(1)) : null,
      goalDiffPerMatch: gamesSampled > 0 ? Number((goalDiffLast5 / gamesSampled).toFixed(2)) : null,
      pointsPerMatchLastN: gamesSampled > 0 ? Number((pointsLast5 / gamesSampled).toFixed(2)) : null,
      gamesSampled,
      cleanSheetsLastN,
      wdlLast5,
    },
    nextThree: upcoming,
    playoffLine: playoffSnapshot,
  };
}

function flattenRosterGroups(payload) {
  const all = [];
  const seen = new Set();

  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (seen.has(node)) return;
    seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }

    const looksLikeAthlete =
      node?.id != null &&
      (node?.displayName || node?.shortName || node?.fullName) &&
      (node?.position || node?.jersey != null || node?.headshot || node?.links);
    if (looksLikeAthlete) {
      all.push(node);
    }

    const collections = [
      ...(Array.isArray(node?.athletes) ? [node.athletes] : []),
      ...(Array.isArray(node?.items) ? [node.items] : []),
      ...(Array.isArray(node?.roster) ? [node.roster] : []),
      ...(Array.isArray(node?.players) ? [node.players] : []),
    ];
    for (const list of collections) walk(list);

    for (const value of Object.values(node)) {
      if (value && typeof value === "object") walk(value);
    }
  }

  walk(payload);
  return all;
}

function collectAthleteStats(node, map) {
  if (!node || typeof node !== "object") return;

  if (Array.isArray(node)) {
    for (const item of node) collectAthleteStats(item, map);
    return;
  }

  const athlete =
    node?.athlete ??
    node?.player ??
    (node?.id != null && (node?.displayName || node?.shortName || node?.fullName) ? node : null);
  const id = String(athlete?.id ?? "");
  if (id) {
    const curr = map.get(id) ?? {};

    const applyStat = (rawKey, rawValue) => {
      const key = String(rawKey ?? "")
        .toLowerCase()
        .replace(/[^a-z]/g, "");
      const val = parseStatValue(rawValue);
      if (!key || val == null) return;
      if (/(^appearances$|^gamesplayed$|^matches$|^apps$|^gp$|^mp$)/.test(key)) {
        curr.appearances = pickBetterNumericStat(curr.appearances, val);
      }
      if (/(^starts$|^gamesstarted$|^startsplayed$|^gs$)/.test(key)) {
        curr.starts = pickBetterNumericStat(curr.starts, val);
      }
      if (/(^goals$|^goalsscored$|^g$)/.test(key)) {
        curr.goals = pickBetterNumericStat(curr.goals, val);
      }
      if (/^assists$/.test(key)) {
        curr.assists = pickBetterNumericStat(curr.assists, val);
      }
      if (/(^minutes$|^mins$|^timeplayed$|^min$|^minutesplayed$|^totalminutes$)/.test(key)) {
        curr.minutes = pickBetterNumericStat(curr.minutes, val);
      }
    };

    const consumeStatsSource = (source) => {
      if (!source) return;
      if (Array.isArray(source)) {
        for (const item of source) {
          if (!item || typeof item !== "object") continue;
          const key = item?.name ?? item?.abbreviation ?? item?.key;
          const value = item?.value ?? item?.displayValue ?? item?.stat ?? item?.total;
          if (key != null || value != null) {
            applyStat(key, value);
          } else {
            for (const [k, v] of Object.entries(item)) applyStat(k, v);
          }
        }
        return;
      }
      if (typeof source === "object") {
        for (const [k, v] of Object.entries(source)) applyStat(k, v);
      }
    };

    consumeStatsSource(node?.stats);
    consumeStatsSource(node?.statistics);
    if (Array.isArray(node?.categories)) {
      for (const category of node.categories) consumeStatsSource(category?.stats);
    }
    if (Array.isArray(node?.splits)) {
      for (const split of node.splits) consumeStatsSource(split?.stats);
    }

    map.set(id, curr);
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === "object") collectAthleteStats(value, map);
  }
}

function collectAthleteProfiles(node, map) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectAthleteProfiles(item, map);
    return;
  }

  const athlete = node?.athlete ?? node?.player ?? null;
  if (athlete) {
    const id = String(athlete?.id ?? "");
    if (id) {
      const current = map.get(id) ?? {};
      map.set(id, {
        ...current,
        id,
        name: athlete?.displayName || athlete?.shortName || current.name || "Unknown",
        position:
          athlete?.position?.abbreviation || athlete?.position?.name || current.position || "-",
        number: athlete?.jersey || current.number || "",
      });
    }
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === "object") collectAthleteProfiles(value, map);
  }
}

function dedupeRosterStats(rows) {
  const map = new Map();
  for (const row of rows) {
    const nameKey = String(row?.name ?? "")
      .trim()
      .toLowerCase();
    const key = nameKey || row?.id || `${row?.number ?? ""}|${row?.position ?? ""}`;
    if (!key) continue;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, row);
      continue;
    }
    map.set(key, mergeRosterRow(existing, row));
  }
  return [...map.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

function mergeRosterRow(a, b) {
  const chooseText = (x, y) => {
    const sx = String(x ?? "").trim();
    const sy = String(y ?? "").trim();
    if (!sx) return sy || "";
    if (!sy) return sx;
    return sy.length > sx.length ? sy : sx;
  };

  return {
    id: chooseText(a?.id, b?.id),
    name: chooseText(a?.name, b?.name),
    number: chooseText(a?.number, b?.number),
    position: chooseText(a?.position, b?.position),
    appearances: pickBetterNumericStat(a?.appearances, b?.appearances),
    starts: pickBetterNumericStat(a?.starts, b?.starts),
    goals: pickBetterNumericStat(a?.goals, b?.goals),
    assists: pickBetterNumericStat(a?.assists, b?.assists),
    minutes: pickBetterNumericStat(a?.minutes, b?.minutes),
  };
}

function hasUsableRosterStats(rows) {
  return rows.some((row) =>
    [row?.appearances, row?.starts, row?.goals, row?.assists, row?.minutes].some((value) => {
      if (value == null) return false;
      const n = Number(value);
      return Number.isFinite(n);
    }),
  );
}

function hasMeaningfulRosterStats(rows) {
  return rows.some((row) =>
    [row?.appearances, row?.starts, row?.goals, row?.assists, row?.minutes].some((value) => {
      const n = toNumber(value);
      return n != null && n > 0;
    }),
  );
}

function pickBetterNumericStat(current, incoming) {
  const curr = toNumber(current);
  const next = toNumber(incoming);
  if (next == null) return curr;
  if (curr == null) return next;
  return Math.max(curr, next);
}

function mergeRosterStats(primaryRows, fallbackRows) {
  const fallbackById = new Map();
  const fallbackByName = new Map();
  for (const row of fallbackRows) {
    if (row?.id) fallbackById.set(String(row.id), row);
    const nameKey = String(row?.name ?? "").trim().toLowerCase();
    if (nameKey) fallbackByName.set(nameKey, row);
  }

  const mergedPrimary = primaryRows.map((row) => {
    const byId = row?.id ? fallbackById.get(String(row.id)) : null;
    const byName = fallbackByName.get(String(row?.name ?? "").trim().toLowerCase());
    const fallback = byId ?? byName ?? null;
    if (!fallback) return row;
    return {
      ...row,
      appearances: row?.appearances ?? fallback?.appearances ?? null,
      starts: row?.starts ?? fallback?.starts ?? null,
      goals: row?.goals ?? fallback?.goals ?? null,
      assists: row?.assists ?? fallback?.assists ?? null,
      minutes: row?.minutes ?? fallback?.minutes ?? null,
    };
  });

  return dedupeRosterStats([...mergedPrimary, ...fallbackRows]);
}

function parseFbrefStandardRows(html, seasonYear) {
  if (!html) return [];
  const tableMatch =
    html.match(/<table[^>]*id=["']stats_standard[^"']*["'][\s\S]*?<\/table>/i) ||
    html.match(/<!--[\s\S]*?(<table[^>]*id=["']stats_standard[^"']*["'][\s\S]*?<\/table>)[\s\S]*?-->/i);
  if (!tableMatch) return [];

  const tableHtml = tableMatch[1] ?? tableMatch[0];
  const rowMatches = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
  const rows = [];

  for (const rowHtml of rowMatches) {
    if (/class=["'][^"']*thead/.test(rowHtml)) continue;
    const cellRegex = /<(td|th)[^>]*data-stat=["']([^"']+)["'][^>]*>([\s\S]*?)<\/\1>/gi;
    const cells = {};
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      cells[cellMatch[2]] = stripHtml(cellMatch[3]);
    }

    const name = cells.player;
    if (!name || /^squad total$/i.test(name)) continue;

    const appearances = Number(cells.games);
    const starts = Number(cells.games_starts);
    const minutes = Number(String(cells.minutes ?? "").replace(/,/g, ""));
    const goals = Number(cells.goals);
    const assists = Number(cells.assists);

    rows.push({
      id: `fbref-${seasonYear}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name,
      number: "",
      position: cells.position || "-",
      appearances: Number.isFinite(appearances) ? appearances : Number.isFinite(starts) ? starts : null,
      starts: Number.isFinite(starts) ? starts : null,
      goals: Number.isFinite(goals) ? goals : null,
      assists: Number.isFinite(assists) ? assists : null,
      minutes: Number.isFinite(minutes) ? minutes : null,
    });
  }

  return dedupeRosterStats(rows);
}

async function loadRosterStatsFromFbref(seasonYear) {
  const urls = [
    `https://fbref.com/en/squads/1ebc1a5b/${seasonYear}/Atlanta-United-Stats`,
    `https://fbref.com/en/squads/1ebc1a5b/Atlanta-United-Stats`,
  ];

  for (const url of urls) {
    const html = await fetchTextSafe(url, "");
    const parsed = parseFbrefStandardRows(html, seasonYear);
    if (parsed.length > 0) return parsed;
  }
  return [];
}

function normalizeMlsPosition(raw) {
  const pos = String(raw ?? "").trim().toLowerCase();
  if (!pos) return "-";
  if (pos.includes("goal")) return "GK";
  if (pos.includes("def")) return "D";
  if (pos.includes("mid")) return "M";
  if (pos.includes("forw") || pos.includes("strik") || pos.includes("wing")) return "F";
  return pos.slice(0, 3).toUpperCase();
}

function firstNumericValue(obj, keys) {
  for (const key of keys) {
    const value = toNumber(obj?.[key]);
    if (value != null) return value;
  }
  return null;
}

async function resolveMlsSeasonId(seasonYear) {
  const payload = await fetchJsonSafe(`${MLS_STATS_API_BASE}/competitions/${MLS_COMPETITION_ID}/seasons`, null);
  const seasons = Array.isArray(payload?.seasons) ? payload.seasons : [];
  const match = seasons.find((s) => Number(s?.season) === Number(seasonYear));
  return match?.season_id ? String(match.season_id) : null;
}

async function loadRosterStatsFromMlsStatsApi(seasonYear) {
  const seasonId = await resolveMlsSeasonId(seasonYear);
  if (!seasonId) return [];

  const [metaPayload, statsPayload] = await Promise.all([
    fetchJsonSafe(
      `${MLS_STATS_API_BASE}/players/seasons/${seasonId}/clubs/${MLS_ATLANTA_CLUB_ID}?per_page=1000&page=1`,
      {},
    ),
    fetchJsonSafe(
      `${MLS_STATS_API_BASE}/statistics/players/competitions/${MLS_COMPETITION_ID}/seasons/${seasonId}?club_id=${MLS_ATLANTA_CLUB_ID}&per_page=1000&page=1`,
      {},
    ),
  ]);

  const players = Array.isArray(metaPayload?.players) ? metaPayload.players : [];
  const byPlayerId = new Map();
  for (const p of players) {
    const id = String(p?.player_id ?? "").trim();
    if (!id) continue;
    byPlayerId.set(id, {
      name: String(p?.name ?? "").trim(),
      number: p?.shirt_number != null ? String(p.shirt_number) : "",
      position: normalizeMlsPosition(p?.playing_position_english),
    });
  }

  const rows = Array.isArray(statsPayload?.player_statistics) ? statsPayload.player_statistics : [];
  const mapped = rows
    .map((row) => {
      const playerId = String(row?.player_id ?? "").trim();
      const meta = playerId ? byPlayerId.get(playerId) : null;
      const name =
        String(meta?.name ?? "").trim() ||
        `${String(row?.player_first_name ?? "").trim()} ${String(row?.player_last_name ?? "").trim()}`.trim();
      if (!name) return null;

      return {
        id: playerId ? `mls-${seasonYear}-${playerId}` : `mls-${seasonYear}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name,
        number: meta?.number ?? (row?.jersey_number != null ? String(row.jersey_number) : ""),
        position: meta?.position ?? normalizeMlsPosition(row?.position),
        appearances:
          firstNumericValue(row, [
            "matches_played",
            "matches_played_tracking",
            "games_played",
            "games",
            "appearances",
            "apps",
          ]) ??
          (firstNumericValue(row, [
            "starts",
            "games_started",
            "matches_started",
            "games_starts",
            "starts_played",
            "normalized_player_minutes",
            "minutes_played",
            "minutes",
          ]) != null
            ? 0
            : null),
        starts: firstNumericValue(row, [
          "starts",
          "games_started",
          "matches_started",
          "games_starts",
          "starts_played",
        ]),
        goals: firstNumericValue(row, ["goals", "goal", "goals_scored"]),
        assists: firstNumericValue(row, ["assists", "assist"]),
        minutes: firstNumericValue(row, [
          "normalized_player_minutes",
          "minutes_played",
          "minutes",
          "mins",
          "time_played",
        ]),
      };
    })
    .filter(Boolean);

  return dedupeRosterStats(mapped);
}

function buildRosterStatsFromPayloads(rosterPayload, teamPayload, statsPayload) {
  const rosterAthletes = flattenRosterGroups(rosterPayload);
  const statsMap = new Map();
  const profileMap = new Map();
  collectAthleteStats(rosterPayload, statsMap);
  collectAthleteStats(teamPayload, statsMap);
  collectAthleteStats(statsPayload, statsMap);
  collectAthleteProfiles(rosterPayload, profileMap);
  collectAthleteProfiles(teamPayload, profileMap);
  collectAthleteProfiles(statsPayload, profileMap);

  const rosterById = new Map();
  for (const athlete of rosterAthletes) {
    const id = String(athlete?.id ?? "");
    if (id) rosterById.set(id, athlete);
  }

  const ids = new Set([...rosterById.keys(), ...statsMap.keys(), ...profileMap.keys()]);

  const mergedRows = [...ids]
    .map((id) => {
      const athlete = rosterById.get(id) ?? profileMap.get(id) ?? {};
      const merged = statsMap.get(id) ?? {};
      return {
        id,
        name: athlete?.displayName || athlete?.shortName || profileMap.get(id)?.name || "Unknown",
        number: athlete?.jersey || profileMap.get(id)?.number || "",
        position:
          athlete?.position?.abbreviation ||
          athlete?.position?.name ||
          profileMap.get(id)?.position ||
          "-",
        appearances: merged.appearances ?? null,
        starts: merged.starts ?? null,
        goals: merged.goals ?? null,
        assists: merged.assists ?? null,
        minutes: merged.minutes ?? null,
      };
    })
    .filter((row) => row.name && row.name !== "Unknown");

  return dedupeRosterStats(mergedRows);
}

async function loadPlayerStatsSnapshot() {
  const nowYear = new Date().getUTCFullYear();
  const urlSets = [
    [
      `${ESPN_API_BASE}/teams/${TEAM_ID}/roster`,
      `${ESPN_API_BASE}/teams/${TEAM_ID}`,
      `${ESPN_API_BASE}/teams/${TEAM_ID}/statistics`,
    ],
    [
      `${ESPN_API_BASE}/teams/${TEAM_ID}/roster?season=${nowYear}`,
      `${ESPN_API_BASE}/teams/${TEAM_ID}?season=${nowYear}`,
      `${ESPN_API_BASE}/teams/${TEAM_ID}/statistics?season=${nowYear}`,
    ],
    [
      `https://site.web.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/teams/${TEAM_ID}/roster`,
      `https://site.web.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/teams/${TEAM_ID}`,
      `https://site.web.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/teams/${TEAM_ID}/statistics`,
    ],
    [
      `https://site.web.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/teams/${TEAM_ID}/roster?season=${nowYear}`,
      `https://site.web.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/teams/${TEAM_ID}?season=${nowYear}`,
      `https://site.web.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/teams/${TEAM_ID}/statistics?season=${nowYear}`,
    ],
  ];

  const merged = [];
  for (const [rosterUrl, teamUrl, statsUrl] of urlSets) {
    const [rosterPayload, teamPayload, statsPayload] = await Promise.all([
      fetchJsonSafe(rosterUrl, {}),
      fetchJsonSafe(teamUrl, {}),
      fetchJsonSafe(statsUrl, {}),
    ]);
    merged.push(...buildRosterStatsFromPayloads(rosterPayload, teamPayload, statsPayload));
  }

  const rows = dedupeRosterStats(merged);
  if (rows.length > 0 && hasUsableRosterStats(rows) && hasMeaningfulRosterStats(rows)) return rows;

  const mlsRows = await loadRosterStatsFromMlsStatsApi(nowYear);
  if (mlsRows.length > 0 && hasUsableRosterStats(mlsRows) && hasMeaningfulRosterStats(mlsRows)) {
    if (rows.length === 0) return mlsRows;
    return mergeRosterStats(rows, mlsRows);
  }

  const seasonal = await loadRosterStatsForSeason(nowYear);
  const seasonalRows = seasonal?.rows ?? [];
  if (rows.length === 0) return seasonalRows;
  if (seasonalRows.length === 0) return rows;
  return mergeRosterStats(rows, seasonalRows);
}

async function loadRosterStatsForSeason(seasonYear) {
  const urlSets = [
    [
      `${ESPN_API_BASE}/teams/${TEAM_ID}/roster?season=${seasonYear}`,
      `${ESPN_API_BASE}/teams/${TEAM_ID}?season=${seasonYear}`,
      `${ESPN_API_BASE}/teams/${TEAM_ID}/statistics?season=${seasonYear}`,
    ],
    [
      `${ESPN_API_BASE}/teams/${TEAM_ID}/roster?season=${seasonYear}&seasontype=2`,
      `${ESPN_API_BASE}/teams/${TEAM_ID}?season=${seasonYear}&seasontype=2`,
      `${ESPN_API_BASE}/teams/${TEAM_ID}/statistics?season=${seasonYear}&seasontype=2`,
    ],
    [
      `https://site.web.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/teams/${TEAM_ID}/roster?season=${seasonYear}`,
      `https://site.web.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/teams/${TEAM_ID}?season=${seasonYear}`,
      `https://site.web.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/teams/${TEAM_ID}/statistics?season=${seasonYear}`,
    ],
    [
      `https://site.web.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/teams/${TEAM_ID}/roster?season=${seasonYear}&seasontype=2`,
      `https://site.web.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/teams/${TEAM_ID}?season=${seasonYear}&seasontype=2`,
      `https://site.web.api.espn.com/apis/v2/sports/soccer/${LEAGUE}/teams/${TEAM_ID}/statistics?season=${seasonYear}&seasontype=2`,
    ],
  ];

  const merged = [];
  for (const [rosterUrl, teamUrl, statsUrl] of urlSets) {
    const [rosterPayload, teamPayload, statsPayload] = await Promise.all([
      fetchJsonSafe(rosterUrl, {}),
      fetchJsonSafe(teamUrl, {}),
      fetchJsonSafe(statsUrl, {}),
    ]);
    merged.push(...buildRosterStatsFromPayloads(rosterPayload, teamPayload, statsPayload));
  }

  const espnMerged = dedupeRosterStats(merged);
  if (espnMerged.length >= 8 && hasUsableRosterStats(espnMerged) && hasMeaningfulRosterStats(espnMerged)) {
    return { rows: espnMerged, source: "ESPN" };
  }

  const mlsRows = await loadRosterStatsFromMlsStatsApi(seasonYear);
  if (mlsRows.length > 0 && hasUsableRosterStats(mlsRows) && hasMeaningfulRosterStats(mlsRows)) {
    return {
      rows: espnMerged.length > 0 ? mergeRosterStats(espnMerged, mlsRows) : mlsRows,
      source: espnMerged.length > 0 ? "ESPN+MLSStatsAPI" : "MLSStatsAPI",
    };
  }

  const fbrefRows = await loadRosterStatsFromFbref(seasonYear);
  if (fbrefRows.length === 0) {
    return { rows: espnMerged, source: espnMerged.length > 0 ? "ESPN-partial" : "none" };
  }

  return {
    rows: mergeRosterStats(espnMerged, fbrefRows),
    source: espnMerged.length > 0 ? "ESPN+FBref" : "FBref",
  };
}

async function fetchHistoricalSeasonsFromNetwork() {
  const historicalYears = [...new Set(STATIC_SEASON_HISTORY.map((row) => Number(row.season)).filter(Number.isFinite))];
  const historicalBundles = await Promise.all(
    historicalYears.map(async (seasonYear) => {
      const [fixtures, seasonStandings, rosterBundle] = await Promise.all([
        loadSeasonFixturesHistorical(seasonYear),
        loadStandingsSnapshotForSeason(seasonYear),
        loadRosterStatsForSeason(seasonYear),
      ]);
      const rosterStats = rosterBundle?.rows ?? [];
      const rosterSource = rosterBundle?.source ?? "none";
      console.log(`Historical ${seasonYear}: fixtures=${fixtures.length}, tableRows=${(seasonStandings?.east?.length ?? 0) + (seasonStandings?.west?.length ?? 0)}, rosterRows=${rosterStats.length} (${rosterSource})`);
      return { seasonYear, fixtures, seasonStandings, rosterStats };
    }),
  );

  const fixturesBySeason = new Map();
  const standingsBySeason = new Map();
  const rosterBySeason = new Map();
  for (const bundle of historicalBundles) {
    fixturesBySeason.set(bundle.seasonYear, dedupeFixtures(bundle.fixtures));
    standingsBySeason.set(bundle.seasonYear, bundle.seasonStandings);
    rosterBySeason.set(bundle.seasonYear, bundle.rosterStats ?? []);
  }

  return buildHistoricalSeasons(STATIC_SEASON_HISTORY, fixturesBySeason, standingsBySeason, rosterBySeason);
}

async function buildLiveData() {
  const nowYear = new Date().getUTCFullYear();
  const rangeStart = new Date(Date.UTC(nowYear - 1, 0, 1));
  const rangeEnd = new Date(Date.UTC(nowYear + 1, 11, 31));
  const historicalSeasons = await loadHistoricalDataFromFile();

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
  const existingActiveSeason = historicalSeasons.find((row) => Number(row?.season) === Number(selected.year));
  const seasonFixtures = dedupeFixtures(selected.fixtures);
  const snapshot = deriveSeasonSnapshot(seasonFixtures);
  const nextMatch = pickNextMatch(allFixtures);
  const quickSnapshot = buildQuickSnapshot(seasonFixtures, allFixtures, standings);
  const atlantaStanding = standings?.atlanta ?? null;
  const position =
    atlantaStanding && Number.isFinite(Number(atlantaStanding.rank))
      ? { rank: Number(atlantaStanding.rank), conference: atlantaStanding.conference ?? "Conference" }
      : null;

  const activeSeasonHistoricalRoster = dedupeRosterStats(existingActiveSeason?.rosterStats ?? []);
  const resolvedPlayerStats =
    hasMeaningfulRosterStats(playerStats ?? []) || activeSeasonHistoricalRoster.length === 0
      ? (playerStats ?? [])
      : activeSeasonHistoricalRoster;

  const inSeasonHistorical = buildInSeasonHistoricalEntry({
    year: selected.year,
    fixtures: seasonFixtures,
    standings,
    rosterStats: resolvedPlayerStats,
    existingSeason: existingActiveSeason,
  });
  const historicalUpsert = upsertSeasonIfChanged(historicalSeasons, inSeasonHistorical);
  const historyPageSeasons = historicalUpsert.seasons.filter((row) => Number(row?.season) !== Number(selected.year));

  return {
    liveData: {
      season: selected.label,
      clubName: TEAM_NAME,
      record: snapshot.record,
      stats: snapshot.stats,
      position,
      formLastFive: snapshot.formLastFive,
      nextMatch,
      results: snapshot.results,
      quickSnapshot,
      playerStats: resolvedPlayerStats,
      formationTemplates: FORMATION_TEMPLATES,
      notableLineups: NOTABLE_LINEUPS,
      historicalSeasons: historyPageSeasons,
      standings,
      seasonHistory: STATIC_SEASON_HISTORY,
      timeline: STATIC_TIMELINE,
    },
    historicalSync: {
      season: selected.year,
      changed: historicalUpsert.changed,
      action: historicalUpsert.action,
      seasons: historicalUpsert.seasons,
    },
  };
}

async function writeDataFile(data) {
  const output = `window.ATL_DATA = ${JSON.stringify(data, null, 2)};\n`;
  await writeFile(new URL("../data.js", import.meta.url), output, "utf8");
}

async function main() {
  try {
    if (process.argv.includes("--backfill-history")) {
      const historicalSeasons = await fetchHistoricalSeasonsFromNetwork();
      await writeHistoricalDataFile(historicalSeasons);
      console.log(`Backfilled historical-data.json with ${historicalSeasons.length} seasons.`);
      return;
    }

    const { liveData, historicalSync } = await buildLiveData();
    if (historicalSync.changed) {
      await writeHistoricalDataFile(historicalSync.seasons);
      console.log(`Historical sync ${historicalSync.action} season ${historicalSync.season} in historical-data.json.`);
    } else {
      console.log(`Historical sync unchanged for season ${historicalSync.season}; no write to historical-data.json.`);
    }
    await writeDataFile(liveData);
    console.log("Updated data.js from ESPN live feeds + local historical-data.json.");
  } catch (error) {
    console.error(`Live update failed: ${error.message}`);
    process.exitCode = 1;
  }
}

main();
