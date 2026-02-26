"use client";

import type { GraphNode } from "@/lib/schema";

type NodeInspectorProps = {
  node: GraphNode | null;
};

export function NodeInspector({ node }: NodeInspectorProps) {
  if (!node) {
    return (
      <aside className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Node Inspector</h2>
        <p className="mt-2 text-sm text-slate-600">
          Select any concept node in the graph to view summary, type, and importance.
        </p>
      </aside>
    );
  }

  return (
    <aside className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{node.label}</h2>
      <div className="mt-3 space-y-2 text-sm text-slate-700">
        <p>
          <span className="font-semibold">Type:</span> {node.type}
        </p>
        <p>
          <span className="font-semibold">Importance:</span> {node.importance ?? "Not scored"}
        </p>
        <p>
          <span className="font-semibold">Summary:</span> {node.summary}
        </p>
      </div>
    </aside>
  );
}
