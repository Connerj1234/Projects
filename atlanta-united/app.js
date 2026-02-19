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
  const timeline = document.getElementById("timeline");
  const historyBody = document.getElementById("historyBody");

  if (seasonLabel) seasonLabel.textContent = data.season;
  if (recordLine) {
    recordLine.textContent = `${data.clubName}: ${data.record.wins}-${data.record.draws}-${data.record.losses}`;
  }

  if (metaStats) {
    const statsEntries = [
      ["Points", data.stats.points],
      ["GF", data.stats.goalsFor],
      ["GA", data.stats.goalsAgainst],
      ["Home", data.stats.homeRecord],
      ["Away", data.stats.awayRecord],
      ["Clean Sheets", data.stats.cleanSheets],
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
    const nextDate = new Date(next.dateISO);
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
