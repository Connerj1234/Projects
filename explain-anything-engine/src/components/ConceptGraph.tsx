"use client";

import { useEffect, useMemo, useRef } from "react";
import cytoscape, { type Core } from "cytoscape";

import type { GraphEdge, GraphNode } from "@/lib/schema";

type ConceptGraphProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelectNode: (node: GraphNode | null) => void;
};

export function ConceptGraph({ nodes, edges, onSelectNode }: ConceptGraphProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);

  const elements = useMemo(
    () => [
      ...nodes.map((node) => ({
        data: {
          ...node
        }
      })),
      ...edges.map((edge) => ({
        data: {
          ...edge,
          label: edge.relation
        }
      }))
    ],
    [nodes, edges]
  );

  useEffect(() => {
    if (!containerRef.current || cyRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "font-size": 10,
            "text-wrap": "wrap",
            "text-max-width": "95px",
            color: "#0f172a",
            "text-valign": "center",
            "text-halign": "center",
            width: "mapData(importance, 1, 10, 46, 96)",
            height: "mapData(importance, 1, 10, 46, 96)",
            "background-color": "#60a5fa",
            "border-color": "#1e3a8a",
            "border-width": 2
          }
        },
        {
          selector: 'node[type = "Topic"]',
          style: {
            "background-color": "#f59e0b",
            "border-color": "#92400e"
          }
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#94a3b8",
            "target-arrow-color": "#94a3b8",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(label)",
            "font-size": 9,
            color: "#334155",
            "text-background-opacity": 1,
            "text-background-color": "#f8fafc",
            "text-background-padding": "2px"
          }
        },
        {
          selector: ":selected",
          style: {
            "overlay-opacity": 0,
            "border-width": 3,
            "border-color": "#dc2626"
          }
        }
      ]
    });

    cy.on("tap", "node", (event) => {
      const data = event.target.data() as GraphNode;
      onSelectNode(data ?? null);
    });

    cy.on("tap", (event) => {
      if (event.target === cy) onSelectNode(null);
    });

    cyRef.current = cy;

    return () => {
      cyRef.current?.stop();
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, [onSelectNode]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.startBatch();
    cy.elements().remove();
    cy.add(elements);
    cy.endBatch();

    cy.layout({ name: "cose", animate: false, fit: true, padding: 20 }).run();
  }, [elements]);

  return <div ref={containerRef} className="h-[560px] w-full rounded-xl border border-slate-300 bg-white" />;
}
