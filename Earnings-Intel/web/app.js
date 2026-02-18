const byId = (id) => document.getElementById(id);

const fetchJson = async (name) => {
  const res = await fetch(`data/${name}`);
  if (!res.ok) throw new Error(`Failed to load ${name}`);
  return res.json();
};

const numberFmt = (n) => new Intl.NumberFormat().format(n);
const pctFmt = (v) => `${(v * 100).toFixed(1)}%`;

const renderSummary = (summary) => {
  const cards = [
    ["Transcripts", numberFmt(summary.transcript_rows)],
    ["Tickers", numberFmt(summary.unique_tickers)],
    ["Labeled Events", numberFmt(summary.labeled_events)],
    ["Label Coverage", pctFmt(summary.label_coverage)],
    ["Feature Rows", numberFmt(summary.feature_rows)],
    ["Retrieval Chunks", numberFmt(summary.chunk_rows)],
  ];
  byId("summary-cards").innerHTML = cards
    .map(
      ([k, v]) =>
        `<div class="card"><div class="label">${k}</div><div class="value">${v}</div></div>`
    )
    .join("");
};

const renderFindings = (summary, models) => {
  const bestCls = [...models.classification].sort((a, b) => b.accuracy - a.accuracy)[0];
  const bestReg = [...models.regression].sort((a, b) => a.mae - b.mae)[0];
  const findings = [
    `Coverage is strong: ${numberFmt(summary.transcript_rows)} transcripts across ${numberFmt(
      summary.unique_tickers
    )} tickers with ${pctFmt(summary.label_coverage)} labeled-event coverage.`,
    `Best classification baseline is ${bestCls.model} with test accuracy ${bestCls.accuracy.toFixed(
      3
    )}, indicating limited directional edge in the current setup.`,
    `Best regression baseline is ${bestReg.model} with test MAE ${bestReg.mae.toFixed(
      4
    )}, suggesting short-horizon CAR magnitude is hard to predict from transcript text alone.`,
    `Retrieval remains useful qualitatively: the semantic search surfaces context-rich passages for queries like guidance, margin expansion, and demand outlook.`,
  ];
  byId("findings").innerHTML = findings.map((f) => `<div class="finding">${f}</div>`).join("");
};

const bar = (ctx, labels, data, color) =>
  new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ data, backgroundColor: color, borderRadius: 8 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
  });

const line = (ctx, labels, data, color) =>
  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{ data, borderColor: color, borderWidth: 2, tension: 0.2, pointRadius: 0 }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
  });

const scoreChunk = (chunkText, query) => {
  const q = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!q.length) return 0;
  const t = chunkText.toLowerCase();
  return q.reduce((acc, term) => acc + (t.includes(term) ? 1 : 0), 0) / q.length;
};

const renderResults = (chunks, query) => {
  const scored = chunks
    .map((c) => ({ ...c, score: scoreChunk(c.chunk_text, query) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const root = byId("results");
  if (!scored.length) {
    root.innerHTML = `<div class="result"><p>No matches for this query.</p></div>`;
    return;
  }
  root.innerHTML = scored
    .map(
      (r) => `<div class="result">
    <div class="meta">${r.ticker} | ${String(r.event_date).slice(0, 10)} | ${r.section} | score ${r.score.toFixed(2)}</div>
    <p>${r.chunk_text}</p>
  </div>`
    )
    .join("");
};

async function main() {
  const [summary, events, tickers, models, featCorr, chunks] = await Promise.all([
    fetchJson("summary.json"),
    fetchJson("events_by_period.json"),
    fetchJson("top_tickers.json"),
    fetchJson("model_metrics.json"),
    fetchJson("feature_correlations.json"),
    fetchJson("retrieval_chunks.json"),
  ]);

  renderSummary(summary);
  renderFindings(summary, models);

  line(
    byId("timelineChart"),
    events.map((d) => d.period),
    events.map((d) => d.events),
    "#d14e2d"
  );

  bar(
    byId("tickerChart"),
    tickers.map((d) => d.ticker),
    tickers.map((d) => d.events),
    "#1f1f1f"
  );

  bar(
    byId("clsChart"),
    models.classification.map((d) => d.model),
    models.classification.map((d) => d.accuracy),
    "#d14e2d"
  );

  bar(
    byId("regChart"),
    models.regression.map((d) => d.model),
    models.regression.map((d) => d.mae),
    "#5b7c6f"
  );

  bar(
    byId("featChart"),
    featCorr.map((d) => d.feature),
    featCorr.map((d) => d.corr_target_car),
    "#f0a267"
  );

  byId("searchBtn").addEventListener("click", () => {
    renderResults(chunks, byId("queryInput").value);
  });
  byId("queryInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") renderResults(chunks, byId("queryInput").value);
  });
  renderResults(chunks, "guidance margin expansion");
}

main().catch((err) => {
  console.error(err);
  byId("summary-cards").innerHTML = `<div class="card"><div class="label">Error</div><div class="value">Failed to load dashboard data</div></div>`;
});
