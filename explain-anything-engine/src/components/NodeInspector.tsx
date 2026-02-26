"use client";

import type { GraphNode } from "@/lib/schema";
import type { GraphEdge } from "@/lib/schema";

type NodeInspectorProps = {
  node: GraphNode | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export function NodeInspector({ node, nodes, edges }: NodeInspectorProps) {
  if (!node) {
    return (
      <aside className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Node Inspector</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-900">No node selected</h2>
        <p className="mt-3 text-sm text-slate-600">
          Click a concept in the graph to view its details, category, and relevance score.
        </p>
      </aside>
    );
  }

  const importance = Math.round(node.importance ?? 0);
  const context = buildNodeContext(node, nodes, edges);
  const summary = buildSummary(node, context);

  return (
    <aside className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected Concept</p>
          <h2 className="mt-1 break-words text-xl font-semibold text-slate-900">{node.label}</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {node.type}
        </span>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{summary}</p>
        {context.connectedLabels.length > 0 ? (
          <div className="mt-3 border-t border-slate-200 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Context At A Glance
            </p>
            <ul className="mt-2 space-y-1 text-xs text-slate-700">
              <li>
                Connected concepts: <span className="font-semibold">{context.connectedLabels.length}</span>
              </li>
              <li>
                Incoming links: <span className="font-semibold">{context.incomingCount}</span>
              </li>
              <li>
                Outgoing links: <span className="font-semibold">{context.outgoingCount}</span>
              </li>
              {context.topRelations.length ? (
                <li>
                  Common relations: <span className="font-semibold">{context.topRelations.join(", ")}</span>
                </li>
              ) : null}
            </ul>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {context.connectedLabels.slice(0, 5).map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatCard label="Importance" value={node.importance ? `${importance}/10` : "N/A"} />
        <StatCard label="Node ID" value={node.id} mono />
      </div>
    </aside>
  );
}

function StatCard({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-sm text-slate-800 ${mono ? "font-mono text-xs" : "font-semibold"}`}>{value}</p>
    </div>
  );
}

function buildNodeContext(node: GraphNode, nodes: GraphNode[], edges: GraphEdge[]) {
  const byId = new Map(nodes.map((n) => [n.id, n.label]));
  const incoming = edges.filter((e) => e.target === node.id);
  const outgoing = edges.filter((e) => e.source === node.id);
  const relatedIds = new Set<string>();

  for (const e of incoming) relatedIds.add(e.source);
  for (const e of outgoing) relatedIds.add(e.target);

  const connectedLabels = Array.from(relatedIds)
    .map((id) => byId.get(id))
    .filter((label): label is string => Boolean(label));

  const relationCounts = [...incoming, ...outgoing].reduce<Record<string, number>>((acc, e) => {
    acc[e.relation] = (acc[e.relation] ?? 0) + 1;
    return acc;
  }, {});

  const topRelations = Object.entries(relationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([relation]) => relation);

  return {
    incomingCount: incoming.length,
    outgoingCount: outgoing.length,
    connectedLabels,
    topRelations
  };
}

function buildSummary(
  node: GraphNode,
  context: { connectedLabels: string[]; incomingCount: number; outgoingCount: number }
) {
  const raw = (node.summary ?? "").trim();
  const generic =
    raw.length < 36 ||
    raw.toLowerCase().startsWith("key concept:") ||
    raw.toLowerCase().startsWith("core concept:");

  if (!generic) return raw;

  return `${node.label} is a ${node.type.toLowerCase()} in this map with ${context.incomingCount} incoming and ${context.outgoingCount} outgoing links, connecting to ${context.connectedLabels.length} related concepts.`;
}
