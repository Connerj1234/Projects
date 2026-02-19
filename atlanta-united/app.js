(function () {
  const data = window.ATL_DATA;
  if (!data) return;

  const seasonLabel = document.getElementById("seasonLabel");
  const recordLine = document.getElementById("recordLine");
  const metaStats = document.getElementById("metaStats");
  const lastFive = document.getElementById("lastFive");
  const recordChart = document.getElementById("recordChart");
  const nextMatch = document.getElementById("nextMatch");
  const countdown = document.getElementById("countdown");
  const resultsBody = document.getElementById("resultsBody");
  const eastStandingsBody = document.getElementById("eastStandingsBody");
  const westStandingsBody = document.getElementById("westStandingsBody");
  const standingsUpdated = document.getElementById("standingsUpdated");
  const formTrendCard = document.getElementById("formTrendCard");
  const nextThreeCard = document.getElementById("nextThreeCard");
  const playoffCard = document.getElementById("playoffCard");
  const rosterBody = document.getElementById("rosterBody");
  const timeline = document.getElementById("timeline");
  const historyBody = document.getElementById("historyBody");

  function ordinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
  }

  if (seasonLabel) seasonLabel.textContent = data.season;
  if (recordLine) {
    recordLine.textContent = `${data.clubName}: ${data.record.wins}-${data.record.draws}-${data.record.losses}`;
  }

  if (metaStats) {
    const conferenceLabel =
      typeof data.position?.conference === "string" && /east/i.test(data.position.conference)
        ? "East"
        : typeof data.position?.conference === "string" && /west/i.test(data.position.conference)
          ? "West"
          : data.position?.conference || "Conference";
    const positionText =
      data.position && Number.isFinite(Number(data.position.rank))
        ? `${ordinal(Number(data.position.rank))} in ${conferenceLabel}`
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
    resultsBody.innerHTML = data.results
      .map((match) => {
        const resultClass = match.outcome.toLowerCase();
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

  function valueOrDash(value) {
    return value == null || value === "" ? "-" : value;
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

  if (formTrendCard) {
    const trend = data.quickSnapshot?.formTrend;
    const formRating = trend?.formRatingOutOf5;
    const points5 = trend?.pointsLast5;
    const gd5 = trend?.goalDiffLast5;
    const gdPerMatch = trend?.goalDiffPerMatch;
    const wdl = trend?.wdlLast5;
    const ratingText = formRating == null ? "-" : `${formRating}/5`;
    const pointsText = points5 == null ? "-" : `${points5} pts`;
    const gdText = gdPerMatch == null ? "-" : gdPerMatch > 0 ? `+${gdPerMatch}` : String(gdPerMatch);
    const wdlText = wdl ? `${wdl.wins}-${wdl.draws}-${wdl.losses}` : "-";
    formTrendCard.innerHTML = `
      <div><b>Form Rating:</b> ${ratingText} <span class="quick-muted">(${pointsText})</span></div>
      <div><b>GD / Match (Last 5):</b> ${gdText}</div>
      <div><b>W-D-L (Last 5):</b> ${wdlText}</div>
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
    const players = data.playerStats ?? [];
    if (players.length === 0) {
      rosterBody.innerHTML = `<tr><td colspan="8" class="standings-empty">Roster stats unavailable right now.</td></tr>`;
    } else {
      rosterBody.innerHTML = players
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
            <td>${valueOrDash(p.status)}</td>
          </tr>
        `,
        )
        .join("");
    }
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

  if (historyBody) {
    historyBody.innerHTML = data.seasonHistory
      .map(
        (row) => `
        <tr>
          <td>${row.season}</td>
          <td>${row.record}</td>
          <td>${row.points}</td>
          <td>${row.finish}</td>
          <td>${row.playoffs}</td>
        </tr>
      `,
      )
      .join("");
  }
})();
