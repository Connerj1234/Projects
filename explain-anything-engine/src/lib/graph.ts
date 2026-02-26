import type { GraphEdge, GraphNode } from "@/lib/schema";

export function applyImportanceDefaults(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] {
  const incomingCounts = edges.reduce<Record<string, number>>((acc, edge) => {
    acc[edge.target] = (acc[edge.target] ?? 0) + 1;
    return acc;
  }, {});

  const scored = nodes.map((node) => {
    if (node.importance) return node;

    let score = 1;
    if (node.type === "Prerequisite") score += 3;
    score += (incomingCounts[node.id] ?? 0) * 0.8;

    return {
      ...node,
      importance: Math.min(10, Math.max(1, Number(score.toFixed(1))))
    };
  });

  return scored;
}

export function isConnectedGraph(nodes: GraphNode[], edges: GraphEdge[]): boolean {
  if (!nodes.length) return false;

  const adjacency = new Map<string, Set<string>>();
  for (const node of nodes) adjacency.set(node.id, new Set());

  for (const edge of edges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  const visited = new Set<string>();
  const queue: string[] = [nodes[0].id];

  while (queue.length) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;

    visited.add(current);
    const neighbors = adjacency.get(current);
    if (!neighbors) continue;

    for (const next of neighbors) {
      if (!visited.has(next)) queue.push(next);
    }
  }

  return visited.size === nodes.length;
}
