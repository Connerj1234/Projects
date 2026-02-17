const filterButtons = Array.from(document.querySelectorAll('.filter-btn'));
const shots = Array.from(document.querySelectorAll('.shot'));

filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.filter;

    filterButtons.forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });

    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');

    shots.forEach((shot) => {
      const type = shot.dataset.type;
      const shouldShow = filter === 'all' || filter === type;
      shot.classList.toggle('hidden', !shouldShow);
    });
  });
});

const teamSelect = document.querySelector('#team-select');
const seasonSelect = document.querySelector('#season-select');
const teamMetrics = document.querySelector('#team-metrics');

function metricCard(label, value, note) {
  return `
    <article class="metric-card">
      <p class="metric-label">${label}</p>
      <p class="metric-value">${value}</p>
      <p class="metric-note">${note}</p>
    </article>
  `;
}

function formatPct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatDiff(value) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
}

async function initExplorer() {
  if (!teamSelect || !seasonSelect || !teamMetrics) return;

  try {
    const resp = await fetch('./assets/team_summary.json');
    const teamData = await resp.json();
    const teams = Object.keys(teamData).sort();
    const seasons = Array.from(new Set(
      teams.flatMap((team) => Object.keys(teamData[team] || {}))
    )).sort();

    const leagueBySeason = {};
    seasons.forEach((season) => {
      const rows = teams
        .map((team) => teamData[team][season])
        .filter(Boolean);

      const average = (key) => rows.reduce((acc, row) => acc + row[key], 0) / Math.max(rows.length, 1);
      leagueBySeason[season] = {
        ppg: average('ppg'),
        win_rate: average('win_rate'),
        draw_rate: average('draw_rate'),
        gf_pg: average('gf_pg'),
        ga_pg: average('ga_pg'),
        xg_pg: average('xg_pg'),
        xga_pg: average('xga_pg'),
      };
    });

    teamSelect.innerHTML = teams.map((team) => `<option value="${team}">${team}</option>`).join('');
    seasonSelect.innerHTML = seasons.map((season) => `<option value="${season}">${season}</option>`).join('');

    teamSelect.value = 'Inter Miami';
    if (!teamData[teamSelect.value]) teamSelect.value = teams[0];
    seasonSelect.value = '2024';
    if (!leagueBySeason[seasonSelect.value]) seasonSelect.value = seasons[seasons.length - 1];

    const render = () => {
      const team = teamSelect.value;
      const season = seasonSelect.value;
      const row = teamData[team]?.[season];
      const league = leagueBySeason[season];

      if (!row || !league) {
        teamMetrics.innerHTML = metricCard('Data Unavailable', '--', 'No row for selected team/season');
        return;
      }

      teamMetrics.innerHTML = [
        metricCard('Matches', String(row.matches), `${team} in ${season}`),
        metricCard('Points Per Game', row.ppg.toFixed(2), `vs league ${league.ppg.toFixed(2)} (${formatDiff(row.ppg - league.ppg)})`),
        metricCard('Win / Draw / Loss Rate', `${formatPct(row.win_rate)} / ${formatPct(row.draw_rate)} / ${formatPct(row.loss_rate)}`, 'share of matches'),
        metricCard('Goals For per Match', row.gf_pg.toFixed(2), `vs league ${league.gf_pg.toFixed(2)} (${formatDiff(row.gf_pg - league.gf_pg)})`),
        metricCard('Goals Against per Match', row.ga_pg.toFixed(2), `vs league ${league.ga_pg.toFixed(2)} (${formatDiff(row.ga_pg - league.ga_pg)})`),
        metricCard('xG / xGA per Match', `${row.xg_pg.toFixed(2)} / ${row.xga_pg.toFixed(2)}`, `league ${league.xg_pg.toFixed(2)} / ${league.xga_pg.toFixed(2)}`),
      ].join('');
    };

    teamSelect.addEventListener('change', render);
    seasonSelect.addEventListener('change', render);
    render();
  } catch (err) {
    teamMetrics.innerHTML = metricCard('Explorer Error', '--', 'Could not load team summary data');
  }
}

initExplorer();
