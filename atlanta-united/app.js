(function () {
  let data = window.ATL_DATA;
  if (!data) return;

  function parseResult(result) {
    if (typeof result !== "string") return null;
    const m = result.match(/^\s*(\d+)\s*-\s*(\d+)\s*\((Win|Draw|Loss)\)\s*$/i);
    if (!m) return null;
    return {
      goalsFor: Number(m[1]),
      goalsAgainst: Number(m[2]),
      outcome: m[3].charAt(0).toUpperCase() + m[3].slice(1).toLowerCase(),
      score: `${m[1]}-${m[2]}`,
    };
  }

  function computeRecordRows(matches) {
    const record = { wins: 0, draws: 0, losses: 0 };
    const home = { wins: 0, draws: 0, losses: 0 };
    const away = { wins: 0, draws: 0, losses: 0 };
    let goalsFor = 0;
    let goalsAgainst = 0;
    let cleanSheets = 0;

    matches.forEach((match) => {
      const parsed = parseResult(match?.result);
      if (!parsed) return;
      goalsFor += parsed.goalsFor;
      goalsAgainst += parsed.goalsAgainst;
      if (parsed.goalsAgainst === 0) cleanSheets += 1;

      if (parsed.outcome === "Win") record.wins += 1;
      if (parsed.outcome === "Draw") record.draws += 1;
      if (parsed.outcome === "Loss") record.losses += 1;

      const bucket = String(match?.venue).toLowerCase() === "home" ? home : away;
      if (parsed.outcome === "Win") bucket.wins += 1;
      if (parsed.outcome === "Draw") bucket.draws += 1;
      if (parsed.outcome === "Loss") bucket.losses += 1;
    });

    return {
      record,
      stats: {
        points: record.wins * 3 + record.draws,
        goalsFor,
        goalsAgainst,
        homeRecord: `${home.wins}-${home.draws}-${home.losses}`,
        awayRecord: `${away.wins}-${away.draws}-${away.losses}`,
        cleanSheets,
      },
      formLastFive: matches
        .map((m) => parseResult(m?.result)?.outcome?.charAt(0))
        .filter(Boolean),
    };
  }

  function buildSimulatedFirstFive(baseData) {
    const latestHistorical = Array.isArray(baseData?.historicalSeasons) ? baseData.historicalSeasons[0] : null;
    const schedule = Array.isArray(latestHistorical?.fullSchedule) ? latestHistorical.fullSchedule : [];
    const finished = schedule.filter((row) => parseResult(row?.result));
    const firstFive = finished.slice(0, 5);
    if (firstFive.length < 5) return baseData;

    const derived = computeRecordRows(firstFive);
    const simulatedResults = firstFive.map((match) => {
      const parsed = parseResult(match.result);
      return {
        date: match.date,
        opponent: match.opponent,
        venue: match.venue,
        score: parsed?.score ?? "-",
        outcome: parsed?.outcome ?? "Draw",
      };
    });

    const allStandings = Array.isArray(latestHistorical?.tableSnapshot) ? latestHistorical.tableSnapshot : [];
    const east = allStandings.filter((row) => /east/i.test(String(row?.conference ?? "")));
    const west = allStandings.filter((row) => /west/i.test(String(row?.conference ?? "")));
    const atlantaRow = east.find((row) => row?.isAtlanta) ?? west.find((row) => row?.isAtlanta) ?? null;
    const nextThree = (baseData?.quickSnapshot?.nextThree ?? []).slice(0, 3);
    const nextMatch = baseData?.nextMatch ?? null;
    const gamesPlayed = firstFive.length;
    const formPoints = derived.record.wins * 3 + derived.record.draws;

    return {
      ...baseData,
      season: `${baseData.season} [Simulation: First 5 Played]`,
      record: derived.record,
      stats: {
        ...baseData.stats,
        ...derived.stats,
      },
      position: atlantaRow
        ? {
            rank: atlantaRow.rank,
            conference: /west/i.test(String(atlantaRow.conference ?? "")) ? "Western Conference" : "Eastern Conference",
          }
        : baseData.position,
      formLastFive: derived.formLastFive,
      results: simulatedResults,
      standings: {
        east,
        west,
        generatedAt: new Date().toISOString(),
      },
      playerStats:
        Array.isArray(latestHistorical?.rosterStats) && latestHistorical.rosterStats.length > 0
          ? latestHistorical.rosterStats
          : baseData.playerStats,
      quickSnapshot: {
        ...baseData.quickSnapshot,
        formTrend: {
          pointsLast5: formPoints,
          goalDiffLast5: derived.stats.goalsFor - derived.stats.goalsAgainst,
          formRatingOutOf5: Number(((formPoints / 15) * 5).toFixed(1)),
          goalDiffPerMatch: Number((((derived.stats.goalsFor - derived.stats.goalsAgainst) / gamesPlayed) || 0).toFixed(2)),
          pointsPerMatchLastN: Number(((formPoints / gamesPlayed) || 0).toFixed(2)),
          gamesSampled: gamesPlayed,
          cleanSheetsLastN: derived.stats.cleanSheets,
          wdlLast5: { ...derived.record },
        },
        nextThree,
        playoffLine: atlantaRow
          ? {
              rank: atlantaRow.rank,
              conference: /west/i.test(String(atlantaRow.conference ?? "")) ? "West" : "East",
              points: derived.stats.points,
              lineRank: 9,
              pointsFromLine: 0,
              gamesInHand: 0,
            }
          : null,
      },
      nextMatch,
    };
  }

  const search = new URLSearchParams(window.location.search);
  const simulateFirstFive = search.get("simulate") === "first5";
  if (simulateFirstFive) {
    data = buildSimulatedFirstFive(data);
  }

  const DEFAULT_FORMATION_TEMPLATES = [
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
  const DEFAULT_NOTABLE_LINEUPS = [
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

  const seasonLabel = document.getElementById("seasonLabel");
  const recordLine = document.getElementById("recordLine");
  const metaStats = document.getElementById("metaStats");
  const lastFive = document.getElementById("lastFive");
  const recordChart = document.getElementById("recordChart");
  const nextMatch = document.getElementById("nextMatch");
  const countdown = document.getElementById("countdown");
  const resultsBody = document.getElementById("resultsBody");
  const resultsToggle = document.getElementById("resultsToggle");
  const eastStandingsBody = document.getElementById("eastStandingsBody");
  const westStandingsBody = document.getElementById("westStandingsBody");
  const standingsUpdated = document.getElementById("standingsUpdated");
  const sidebarLastUpdated = document.getElementById("sidebarLastUpdated");
  const formTrendCard = document.getElementById("formTrendCard");
  const nextThreeCard = document.getElementById("nextThreeCard");
  const playoffCard = document.getElementById("playoffCard");
  const rosterBody = document.getElementById("rosterBody");
  const rosterTable = document.getElementById("rosterTable");
  const rosterToggle = document.getElementById("rosterToggle");
  const recordLegend = document.getElementById("recordLegend");
  const timeline = document.getElementById("timeline");
  const historySeasonSelect = document.getElementById("historySeasonSelect");
  const historySeasonPulse = document.getElementById("historySeasonPulse");
  const historySeasonMeta = document.getElementById("historySeasonMeta");
  const historyScheduleBody = document.getElementById("historyScheduleBody");
  const historyScheduleToggle = document.getElementById("historyScheduleToggle");
  const historyTableBody = document.getElementById("historyTableBody");
  const historyRosterSeasonSelect = document.getElementById("historyRosterSeasonSelect");
  const historyRosterMeta = document.getElementById("historyRosterMeta");
  const historyRosterBody = document.getElementById("historyRosterBody");
  const historyRosterTable = document.getElementById("historyRosterTable");
  const historyRosterToggle = document.getElementById("historyRosterToggle");
  const formationSelect = document.getElementById("formationSelect");
  const formationPitch = document.getElementById("formationPitch");
  const formationHint = document.getElementById("formationHint");

  let homeRosterSort = { key: "goals", dir: "desc", type: "numeric" };
  let historyRosterSort = { key: "goals", dir: "desc", type: "numeric" };
  let homeResultsExpanded = false;
  let homeRosterExpanded = false;

  const HOME_RESULTS_PREVIEW_LIMIT = 10;
  const HOME_ROSTER_PREVIEW_LIMIT = 10;

  function ordinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
  }

  if (seasonLabel) {
    const seasonText = String(data.season ?? "").replace(/\s*\(upcoming\)\s*$/i, "").trim();
    const hasPlayedMatch = (Number(data.record?.wins) || 0) + (Number(data.record?.draws) || 0) + (Number(data.record?.losses) || 0) > 0;
    const nextMatchTs = new Date(data.nextMatch?.dateISO ?? "").getTime();
    const isMatchdayStarted = Number.isFinite(nextMatchTs) && nextMatchTs <= Date.now();
    const shouldShowSeasonPill = !hasPlayedMatch && !isMatchdayStarted;

    seasonLabel.textContent = seasonText;
    seasonLabel.style.display = shouldShowSeasonPill ? "inline-flex" : "none";
  }
  if (recordLine) {
    const simulationTag = simulateFirstFive ? " (temporary simulation mode)" : "";
    recordLine.textContent = `${data.clubName}: ${data.record.wins}-${data.record.draws}-${data.record.losses}${simulationTag}`;
  }

  if (metaStats) {
    const positionText =
      data.position && Number.isFinite(Number(data.position.rank))
        ? `${ordinal(Number(data.position.rank))}`
        : "-";
    const avgAttendance =
      Number.isFinite(Number(data.stats.avgAttendance)) ? Number(data.stats.avgAttendance).toLocaleString() : "-";

    const statsEntries = [
      ["Points", data.stats.points],
      ["GF", data.stats.goalsFor],
      ["GA", data.stats.goalsAgainst],
      ["Position", positionText],
      ["Home", data.stats.homeRecord],
      ["Away", data.stats.awayRecord],
      ["Clean Sheets", data.stats.cleanSheets],
      ["Avg Attendance", avgAttendance],
    ];

    metaStats.innerHTML = statsEntries
      .map(
        ([label, value]) => `
        <div class="meta-item">
          <div class="meta-label">${label}</div>
          <div class="meta-value">${value}</div>
        </div>
      `,
      )
      .join("");
  }

  if (lastFive) {
    lastFive.innerHTML = data.formLastFive
      .map((r) => `<div class="form-chip ${r.toLowerCase()}">${r}</div>`)
      .join("");
  }

  if (recordChart) {
    const total = data.record.wins + data.record.draws + data.record.losses;
    if (total > 0) {
      const winPct = (data.record.wins / total) * 100;
      const drawPct = (data.record.draws / total) * 100;
      recordChart.style.background = `conic-gradient(
        #be1622 0 ${winPct}%,
        #c9a34f ${winPct}% ${winPct + drawPct}%,
        #2f3442 ${winPct + drawPct}% 100%
      )`;
    }
  }

  if (recordLegend) {
    const total = data.record.wins + data.record.draws + data.record.losses;
    const pct = (value) => (total > 0 ? `${Math.round((value / total) * 100)}%` : "0%");
    recordLegend.innerHTML = `
      <div class="legend-item"><span class="legend-swatch win"></span>Win (${data.record.wins}, ${pct(data.record.wins)})</div>
      <div class="legend-item"><span class="legend-swatch draw"></span>Draw (${data.record.draws}, ${pct(data.record.draws)})</div>
      <div class="legend-item"><span class="legend-swatch loss"></span>Loss (${data.record.losses}, ${pct(data.record.losses)})</div>
    `;
  }

  if (nextMatch) {
    const next = data.nextMatch;
    const nextDate = new Date(next?.dateISO ?? "");
    const hasMatch = next && Number.isFinite(nextDate.getTime());

    if (!hasMatch) {
      nextMatch.innerHTML = `
        <div class="next-opponent">Next Fixture TBD</div>
        <div class="next-meta">The upcoming match has not been posted by the data source yet.</div>
      `;
      if (countdown) countdown.innerHTML = "";
    } else {
      nextMatch.innerHTML = `
        <div class="next-opponent">vs ${next.opponent}</div>
        <div class="next-meta">${next.competition} | ${next.venue}</div>
        <div class="next-meta">${nextDate.toLocaleString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}</div>
        <div class="next-meta">Watch: ${next.broadcast}</div>
      `;

      if (countdown) {
        function updateCountdown() {
          const diff = nextDate.getTime() - Date.now();
          if (diff <= 0) {
            countdown.innerHTML = "<div class='count-item'><strong>Live</strong><span>Matchday</span></div>";
            return;
          }
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((diff / (1000 * 60)) % 60);
          const seconds = Math.floor((diff / 1000) % 60);

          countdown.innerHTML = `
            <div class="count-item"><strong>${days}</strong><span>Days</span></div>
            <div class="count-item"><strong>${hours}</strong><span>Hours</span></div>
            <div class="count-item"><strong>${minutes}</strong><span>Min</span></div>
            <div class="count-item"><strong>${seconds}</strong><span>Sec</span></div>
          `;
        }

        updateCountdown();
        setInterval(updateCountdown, 1000);
      }
    }
  }

  if (resultsBody) {
    const renderHomeResults = () => {
      const allResults = Array.isArray(data.results) ? data.results : [];
      const visible = homeResultsExpanded ? allResults : allResults.slice(0, HOME_RESULTS_PREVIEW_LIMIT);
      if (allResults.length === 0) {
        resultsBody.innerHTML = `<tr><td colspan="4" class="standings-empty">No recent results available yet.</td></tr>`;
      } else {
        resultsBody.innerHTML = visible
          .map((match) => {
            const resultClass = String(match.outcome ?? "").toLowerCase();
            return `
              <tr>
                <td>${new Date(match.date).toLocaleDateString()}</td>
                <td>${match.opponent}</td>
                <td>${match.venue}</td>
                <td>
                  ${match.score}
                  <span class="result-chip ${resultClass}">${match.outcome}</span>
                </td>
              </tr>
            `;
          })
          .join("");
      }

      if (resultsToggle) {
        if (allResults.length <= HOME_RESULTS_PREVIEW_LIMIT) {
          resultsToggle.style.display = "none";
        } else {
          resultsToggle.style.display = "inline-block";
          resultsToggle.textContent = homeResultsExpanded ? "Show fewer" : `Show all results (${allResults.length})`;
        }
      }
    };

    if (resultsToggle) {
      resultsToggle.addEventListener("click", () => {
        homeResultsExpanded = !homeResultsExpanded;
        renderHomeResults();
      });
    }
    renderHomeResults();
  }

  function valueOrDash(value) {
    return value == null || value === "" ? "-" : value;
  }

  function getSortDirection(nextKey, currentSort, nextType) {
    if (!currentSort || currentSort.key !== nextKey) return nextType === "numeric" ? "desc" : "asc";
    return currentSort.dir === "asc" ? "desc" : "asc";
  }

  function compareRosterValues(a, b, sort) {
    const key = sort?.key;
    const type = sort?.type || "text";
    const dir = sort?.dir === "asc" ? 1 : -1;
    const av = a?.[key];
    const bv = b?.[key];

    if (type === "numeric") {
      const an = Number(av);
      const bn = Number(bv);
      const aValid = Number.isFinite(an);
      const bValid = Number.isFinite(bn);
      if (aValid && bValid) return (an - bn) * dir;
      if (aValid && !bValid) return -1;
      if (!aValid && bValid) return 1;
      return 0;
    }

    const as = String(av ?? "");
    const bs = String(bv ?? "");
    return as.localeCompare(bs, undefined, { sensitivity: "base", numeric: true }) * dir;
  }

  function sortRosterRows(rows, sort) {
    return rows.slice().sort((a, b) => {
      const primary = compareRosterValues(a, b, sort);
      if (primary !== 0) return primary;

      const isDefaultScoringSort = sort?.key === "goals" && sort?.dir === "desc";
      if (isDefaultScoringSort) {
        const assistsDiff = (Number(b?.assists) || 0) - (Number(a?.assists) || 0);
        if (assistsDiff !== 0) return assistsDiff;

        const minutesDiff = (Number(b?.minutes) || 0) - (Number(a?.minutes) || 0);
        if (minutesDiff !== 0) return minutesDiff;

        const appsDiff = (Number(b?.appearances) || 0) - (Number(a?.appearances) || 0);
        if (appsDiff !== 0) return appsDiff;
      }

      return String(a?.name ?? "").localeCompare(String(b?.name ?? ""), undefined, { sensitivity: "base" });
    });
  }

  function updateSortHeaderIndicators(tableEl, sort) {
    if (!tableEl) return;
    const headers = tableEl.querySelectorAll("th[data-sort-key]");
    headers.forEach((th) => {
      const key = th.getAttribute("data-sort-key");
      const active = key === sort?.key;
      th.setAttribute("data-sort-dir", active ? sort.dir : "none");
      th.setAttribute("aria-sort", active ? (sort.dir === "asc" ? "ascending" : "descending") : "none");
    });
  }

  function renderStandingsRows(rows) {
    if (!rows || rows.length === 0) {
      return `<tr><td colspan="8" class="standings-empty">Standings unavailable right now.</td></tr>`;
    }

    return rows
      .map(
        (row) => `
        <tr class="${row.isAtlanta ? "atlanta-row" : ""}">
          <td>${valueOrDash(row.rank)}</td>
          <td>${valueOrDash(row.team)}</td>
          <td>${valueOrDash(row.played)}</td>
          <td>${valueOrDash(row.wins)}</td>
          <td>${valueOrDash(row.draws)}</td>
          <td>${valueOrDash(row.losses)}</td>
          <td>${valueOrDash(row.goalDiff)}</td>
          <td>${valueOrDash(row.points)}</td>
        </tr>
      `,
      )
      .join("");
  }

  if (eastStandingsBody) {
    eastStandingsBody.innerHTML = renderStandingsRows(data.standings?.east);
  }

  if (westStandingsBody) {
    westStandingsBody.innerHTML = renderStandingsRows(data.standings?.west);
  }

  if (standingsUpdated) {
    const generatedAt = data.standings?.generatedAt;
    if (generatedAt) {
      const ts = new Date(generatedAt);
      standingsUpdated.textContent = `Updated ${ts.toLocaleString()}`;
    } else {
      standingsUpdated.textContent = "Standings update time unavailable.";
    }
  }

  if (sidebarLastUpdated) {
    const generatedAt = data.standings?.generatedAt;
    if (generatedAt) {
      const ts = new Date(generatedAt);
      sidebarLastUpdated.textContent = `Last updated: ${ts.toLocaleString()}`;
    } else {
      sidebarLastUpdated.textContent = "Last updated: unavailable";
    }
  }

  if (formTrendCard) {
    const trend = data.quickSnapshot?.formTrend;
    const formRating = trend?.formRatingOutOf5;
    const points5 = trend?.pointsLast5;
    const gdPerMatch = trend?.goalDiffPerMatch;
    const ppm = trend?.pointsPerMatchLastN;
    const gamesSampled = Number.isFinite(Number(trend?.gamesSampled)) ? Number(trend.gamesSampled) : 0;
    const cleanSheets = Number.isFinite(Number(trend?.cleanSheetsLastN)) ? Number(trend.cleanSheetsLastN) : null;
    const ratingText = formRating == null ? "-" : `${formRating}/5`;
    const pointsText = points5 == null ? "-" : `${points5} pts`;
    const gdText = gdPerMatch == null ? "-" : gdPerMatch > 0 ? `+${gdPerMatch}` : String(gdPerMatch);
    const ppmText = ppm == null ? "-" : ppm;
    const cleanSheetsText = cleanSheets == null ? "-" : cleanSheets;
    const coverageNote =
      gamesSampled > 0 && gamesSampled < 5
        ? `Using ${gamesSampled}/5 completed matches so far.`
        : gamesSampled === 0
          ? "No completed matches in the current 5-match window yet."
          : "";
    formTrendCard.innerHTML = `
      <div><b>Form Rating:</b> ${ratingText} <span class="quick-muted">(${pointsText})</span></div>
      <div class="quick-muted">Form Rating = points from last 5 matches on a 0-5 scale (3/win, 1/draw).</div>
      <div><b>GD / Match:</b> ${gdText}</div>
      <div><b>Pts / Match:</b> ${ppmText}</div>
      <div><b>Clean Sheets:</b> ${cleanSheetsText}</div>
      ${coverageNote ? `<div class="quick-muted">${coverageNote}</div>` : ""}
    `;
  }

  if (nextThreeCard) {
    const upcoming = data.quickSnapshot?.nextThree ?? [];
    if (upcoming.length === 0) {
      nextThreeCard.innerHTML = `<div>No upcoming fixtures available yet.</div>`;
    } else {
      nextThreeCard.innerHTML = upcoming
        .map((m) => {
          const dt = new Date(m.dateISO);
          const when = Number.isFinite(dt.getTime()) ? dt.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "TBD";
          return `<div><b>${m.venue === "Home" ? "vs" : "at"} ${m.opponent}</b> <span class="quick-muted">${when}</span></div>`;
        })
        .join("");
    }
  }

  if (playoffCard) {
    const playoff = data.quickSnapshot?.playoffLine;
    if (!playoff) {
      playoffCard.innerHTML = `<div>Playoff line data unavailable right now.</div>`;
    } else {
      const rank = playoff.rank ?? "-";
      const points = playoff.points ?? "-";
      const diff = playoff.pointsFromLine;
      const diffText = diff == null ? "-" : diff >= 0 ? `+${diff}` : `${diff}`;
      const gih = playoff.gamesInHand;
      const gihText = gih == null ? "-" : gih >= 0 ? `+${gih}` : `${gih}`;
      playoffCard.innerHTML = `
        <div><b>Rank:</b> ${rank} (${playoff.conference})</div>
        <div><b>Points:</b> ${points}</div>
        <div><b>Vs #${playoff.lineRank} Line:</b> ${diffText} pts</div>
        <div><b>Games in Hand:</b> ${gihText}</div>
      `;
    }
  }

  if (rosterBody) {
    const renderHomeRoster = () => {
      const players = data.playerStats ?? [];
      if (players.length === 0) {
        rosterBody.innerHTML = `<tr><td colspan="7" class="standings-empty">Roster stats unavailable right now.</td></tr>`;
      } else {
        const sorted = sortRosterRows(players, homeRosterSort);
        const visible = homeRosterExpanded ? sorted : sorted.slice(0, HOME_ROSTER_PREVIEW_LIMIT);
        rosterBody.innerHTML = visible
          .map(
            (p) => `
            <tr>
              <td>${valueOrDash(p.number)}</td>
              <td>${valueOrDash(p.name)}</td>
              <td>${valueOrDash(p.position)}</td>
              <td>${valueOrDash(p.appearances)}</td>
              <td>${valueOrDash(p.goals)}</td>
              <td>${valueOrDash(p.assists)}</td>
              <td>${valueOrDash(p.minutes)}</td>
            </tr>
          `,
          )
          .join("");
      }
      if (rosterToggle) {
        if (players.length <= HOME_ROSTER_PREVIEW_LIMIT) {
          rosterToggle.style.display = "none";
        } else {
          rosterToggle.style.display = "inline-block";
          rosterToggle.textContent = homeRosterExpanded ? "Show fewer" : `Show full roster (${players.length})`;
        }
      }
      updateSortHeaderIndicators(rosterTable, homeRosterSort);
    };

    if (rosterTable) {
      rosterTable.querySelectorAll("th[data-sort-key]").forEach((th) => {
        th.addEventListener("click", () => {
          const key = th.getAttribute("data-sort-key");
          const type = th.getAttribute("data-sort-type") || "text";
          homeRosterSort = { key, type, dir: getSortDirection(key, homeRosterSort, type) };
          renderHomeRoster();
        });
      });
    }

    if (rosterToggle) {
      rosterToggle.addEventListener("click", () => {
        homeRosterExpanded = !homeRosterExpanded;
        renderHomeRoster();
      });
    }

    renderHomeRoster();
  }

  if (timeline) {
    timeline.innerHTML = data.timeline
      .map(
        (item) => `
        <div class="timeline-item">
          <b>${item.year}</b> ${item.text}
        </div>
      `,
      )
      .join("");
  }

  if (historySeasonSelect && historySeasonPulse && historyScheduleBody && historyTableBody) {
    const SCHEDULE_PREVIEW_LIMIT = 15;
    const ROSTER_PREVIEW_LIMIT = 10;
    let scheduleExpanded = false;
    let rosterExpanded = false;
    let activeHistoricalSeason = null;
    let activeRosterSeasonValue = null;

    const fallbackHistoricalSeasons = (data.seasonHistory ?? [])
      .slice()
      .sort((a, b) => b.season - a.season)
      .map((row) => {
        const m = String(row.record ?? "").match(/(\d+)-(\d+)-(\d+)/);
        return {
          season: row.season,
          seasonLabel: `${row.season} MLS Regular Season`,
          seasonPulse: {
            wins: m ? Number(m[1]) : null,
            draws: m ? Number(m[2]) : null,
            losses: m ? Number(m[3]) : null,
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
          notes: "Schedule/table/season-long stat data to be populated in the historical data pass.",
        };
      });

    const historicalSeasons =
      Array.isArray(data.historicalSeasons) && data.historicalSeasons.length > 0 ? data.historicalSeasons : fallbackHistoricalSeasons;

    if (historyRosterTable) {
      historyRosterTable.querySelectorAll("th[data-sort-key]").forEach((th) => {
        th.addEventListener("click", () => {
          const key = th.getAttribute("data-sort-key");
          const type = th.getAttribute("data-sort-type") || "text";
          historyRosterSort = { key, type, dir: getSortDirection(key, historyRosterSort, type) };
          renderRosterSeason(activeRosterSeasonValue ?? historyRosterSeasonSelect?.value ?? historicalSeasons[0]?.season);
        });
      });
      updateSortHeaderIndicators(historyRosterTable, historyRosterSort);
    }

    historySeasonSelect.innerHTML = historicalSeasons
      .map((season) => `<option value="${season.season}">${season.season}</option>`)
      .join("");

    function renderScheduleRows(selected) {
      const schedule = selected.fullSchedule ?? [];
      const visible = scheduleExpanded ? schedule : schedule.slice(0, SCHEDULE_PREVIEW_LIMIT);

      if (schedule.length === 0) {
        historyScheduleBody.innerHTML = `<tr><td colspan="4" class="standings-empty">Full season schedule will be populated in the history data pass.</td></tr>`;
        if (historyScheduleToggle) {
          historyScheduleToggle.style.display = "none";
        }
        return;
      }

      historyScheduleBody.innerHTML = visible
        .map(
          (match) => {
            const parsed = parseResult(match?.result);
            const outcomeClass = String(parsed?.outcome ?? "").toLowerCase();
            const resultCell = parsed
              ? `${parsed.score} <span class="result-chip ${outcomeClass}">${parsed.outcome}</span>`
              : valueOrDash(match.result);
            return `
              <tr>
                <td>${valueOrDash(match.date)}</td>
                <td>${valueOrDash(match.opponent)}</td>
                <td>${valueOrDash(match.venue)}</td>
                <td>${resultCell}</td>
              </tr>
            `;
          },
        )
        .join("");

      if (historyScheduleToggle) {
        if (schedule.length <= SCHEDULE_PREVIEW_LIMIT) {
          historyScheduleToggle.style.display = "none";
        } else {
          historyScheduleToggle.style.display = "inline-block";
          historyScheduleToggle.textContent = scheduleExpanded ? "Show fewer" : `Show full schedule (${schedule.length})`;
        }
      }
    }

    function renderHistoricalSeason(seasonValue) {
      const selected =
        historicalSeasons.find((season) => String(season.season) === String(seasonValue)) ?? historicalSeasons[0];
      if (!selected) return;
      activeHistoricalSeason = selected;

      const pulse = selected.seasonPulse ?? {};
      const roster = Array.isArray(selected.rosterStats) ? selected.rosterStats : [];
      const topScorer = roster
        .filter((player) => Number.isFinite(Number(player?.goals)))
        .sort((a, b) => Number(b.goals) - Number(a.goals) || String(a.name).localeCompare(String(b.name)))[0];
      const topScorerText = topScorer ? `${valueOrDash(topScorer.name)} (${valueOrDash(topScorer.goals)})` : "-";
      const attendanceValue = selected.seasonLongStats?.avgAttendance;
      const attendanceText =
        Number.isFinite(Number(attendanceValue)) && Number(attendanceValue) > 0
          ? Number(attendanceValue).toLocaleString()
          : "-";
      const recordText =
        pulse.wins == null || pulse.draws == null || pulse.losses == null ? "-" : `${pulse.wins}-${pulse.draws}-${pulse.losses}`;

      const pulseEntries = [
        ["Record", recordText],
        ["Points", valueOrDash(pulse.points)],
        ["Finish", valueOrDash(pulse.finish)],
        ["Playoffs", valueOrDash(pulse.playoffs)],
        ["Top Scorer", topScorerText],
        ["GF", valueOrDash(selected.seasonLongStats?.goalsFor)],
        ["GA", valueOrDash(selected.seasonLongStats?.goalsAgainst)],
        ["Home", valueOrDash(selected.seasonLongStats?.homeRecord)],
        ["Away", valueOrDash(selected.seasonLongStats?.awayRecord)],
        ["Attendance", attendanceText],
      ];

      historySeasonPulse.innerHTML = pulseEntries
        .map(
          ([label, value]) => `
          <div class="history-pulse-item">
            <div class="history-pulse-label">${label}</div>
            <div class="history-pulse-value">${value}</div>
          </div>
        `,
        )
        .join("");

      if (historySeasonMeta) {
        const rawNotes = String(selected.notes ?? "");
        const cleanedNotes = rawNotes
          .replace(/,\s*\d+\s*roster rows?.*$/i, "")
          .replace(/\s*ATLUTD stats import.*$/i, "")
          .replace(/\s*FBref.*$/i, "")
          .trim();
        historySeasonMeta.textContent = cleanedNotes
          ? `${selected.seasonLabel ?? selected.season} • ${cleanedNotes}`
          : `${selected.seasonLabel ?? selected.season}`;
      }

      renderScheduleRows(selected);

      const table = selected.tableSnapshot ?? [];
      if (table.length === 0) {
        historyTableBody.innerHTML = `<tr><td colspan="8" class="standings-empty">Table snapshot for this season will be populated in the history data pass.</td></tr>`;
      } else {
        const sortedTable = table.slice().sort((a, b) => {
          const pointsA = Number(a?.points);
          const pointsB = Number(b?.points);
          const safePointsA = Number.isFinite(pointsA) ? pointsA : Number.NEGATIVE_INFINITY;
          const safePointsB = Number.isFinite(pointsB) ? pointsB : Number.NEGATIVE_INFINITY;
          if (safePointsB !== safePointsA) return safePointsB - safePointsA;

          const gdA = Number(a?.goalDiff);
          const gdB = Number(b?.goalDiff);
          const safeGdA = Number.isFinite(gdA) ? gdA : Number.NEGATIVE_INFINITY;
          const safeGdB = Number.isFinite(gdB) ? gdB : Number.NEGATIVE_INFINITY;
          if (safeGdB !== safeGdA) return safeGdB - safeGdA;

          const winsA = Number(a?.wins);
          const winsB = Number(b?.wins);
          const safeWinsA = Number.isFinite(winsA) ? winsA : Number.NEGATIVE_INFINITY;
          const safeWinsB = Number.isFinite(winsB) ? winsB : Number.NEGATIVE_INFINITY;
          return safeWinsB - safeWinsA;
        });

        historyTableBody.innerHTML = sortedTable
          .map(
            (row, idx) => `
            <tr class="${row.isAtlanta ? "atlanta-row" : ""}">
              <td>${idx + 1}</td>
              <td>${valueOrDash(row.team)}</td>
              <td>${valueOrDash(row.played)}</td>
              <td>${valueOrDash(row.wins)}</td>
              <td>${valueOrDash(row.draws)}</td>
              <td>${valueOrDash(row.losses)}</td>
              <td>${valueOrDash(row.goalDiff)}</td>
              <td>${valueOrDash(row.points)}</td>
            </tr>
          `,
          )
          .join("");
      }

    }

    historySeasonSelect.addEventListener("change", () => {
      scheduleExpanded = false;
      renderHistoricalSeason(historySeasonSelect.value);
    });
    if (historyScheduleToggle) {
      historyScheduleToggle.addEventListener("click", () => {
        scheduleExpanded = !scheduleExpanded;
        if (activeHistoricalSeason) renderScheduleRows(activeHistoricalSeason);
      });
    }

    function renderRosterSeason(seasonValue) {
      if (!historyRosterBody) return;
      activeRosterSeasonValue = seasonValue;
      const selected =
        historicalSeasons.find((season) => String(season.season) === String(seasonValue)) ?? historicalSeasons[0];
      if (!selected) return;
      const roster = Array.isArray(selected.rosterStats) ? selected.rosterStats : [];

      if (historyRosterMeta) {
        historyRosterMeta.textContent =
          roster.length > 0
            ? `${selected.season} roster rows: ${roster.length}`
            : `${selected.season} roster stats unavailable (data source may not expose season-level player stats for this year).`;
      }

      if (roster.length === 0) {
        historyRosterBody.innerHTML = `<tr><td colspan="7" class="standings-empty">Historical roster stats unavailable for this season.</td></tr>`;
        if (historyRosterToggle) historyRosterToggle.style.display = "none";
      } else {
        const sorted = sortRosterRows(roster, historyRosterSort);
        const visible = rosterExpanded ? sorted : sorted.slice(0, ROSTER_PREVIEW_LIMIT);
        historyRosterBody.innerHTML = visible
          .map(
            (player) => `
              <tr>
                <td>${valueOrDash(player.number)}</td>
                <td>${valueOrDash(player.name)}</td>
                <td>${valueOrDash(player.position)}</td>
                <td>${valueOrDash(player.appearances)}</td>
                <td>${valueOrDash(player.goals)}</td>
                <td>${valueOrDash(player.assists)}</td>
                <td>${valueOrDash(player.minutes)}</td>
              </tr>
            `,
          )
          .join("");

        if (historyRosterToggle) {
          if (roster.length <= ROSTER_PREVIEW_LIMIT) {
            historyRosterToggle.style.display = "none";
          } else {
            historyRosterToggle.style.display = "inline-block";
            historyRosterToggle.textContent = rosterExpanded ? "Show fewer" : `Show full roster (${roster.length})`;
          }
        }
      }
      updateSortHeaderIndicators(historyRosterTable, historyRosterSort);
    }

    if (historyRosterSeasonSelect) {
      historyRosterSeasonSelect.innerHTML = historicalSeasons
        .map((season) => `<option value="${season.season}">${season.season}</option>`)
        .join("");
      historyRosterSeasonSelect.addEventListener("change", () => {
        rosterExpanded = false;
        renderRosterSeason(historyRosterSeasonSelect.value);
      });
      renderRosterSeason(historicalSeasons[0]?.season);
    } else {
      renderRosterSeason(historicalSeasons[0]?.season);
    }

    if (historyRosterToggle) {
      historyRosterToggle.addEventListener("click", () => {
        rosterExpanded = !rosterExpanded;
        renderRosterSeason(activeRosterSeasonValue ?? historicalSeasons[0]?.season);
      });
    }

    renderHistoricalSeason(historicalSeasons[0]?.season);
  }

  if (formationSelect && formationPitch) {
    const templates = Array.isArray(data.formationTemplates) && data.formationTemplates.length > 0 ? data.formationTemplates : DEFAULT_FORMATION_TEMPLATES;
    const notableLineups =
      Array.isArray(data.notableLineups) && data.notableLineups.length > 0 ? data.notableLineups : DEFAULT_NOTABLE_LINEUPS;

    formationSelect.innerHTML = notableLineups
      .map((lineup) => `<option value="${lineup.id}">${lineup.label}</option>`)
      .join("");

    function renderLineup(lineupId) {
      const lineup = notableLineups.find((item) => item.id === lineupId) ?? notableLineups[0];
      if (!lineup) return;
      const template = templates.find((t) => t.id === lineup.formation) ?? templates[0];
      if (!template) return;

      formationPitch.innerHTML = `
        <div class="pitch-half-line"></div>
        <div class="pitch-center-circle"></div>
        <div class="pitch-box pitch-box-top"></div>
        <div class="pitch-box pitch-box-bottom"></div>
        <div class="pitch-goal pitch-goal-top"></div>
        <div class="pitch-goal pitch-goal-bottom"></div>
        ${template.slots
          .map(
            (slot) => `
          <div class="formation-slot" style="left:${slot.x}%; top:${slot.y}%;">
            <div class="formation-dot"></div>
            <div class="formation-role">${slot.role}</div>
            <div class="formation-player">${lineup.players?.[slot.role] ?? "-"}</div>
          </div>
        `,
          )
          .join("")}
      `;

      if (formationHint) {
        const dateText = lineup.date ? new Date(lineup.date).toLocaleDateString() : "";
        formationHint.textContent = `${lineup.competition || "Notable Match"}${dateText ? ` • ${dateText}` : ""} • ${template.label}`;
      }
    }

    formationSelect.addEventListener("change", () => renderLineup(formationSelect.value));
    renderLineup(notableLineups[0].id);
  }
})();
