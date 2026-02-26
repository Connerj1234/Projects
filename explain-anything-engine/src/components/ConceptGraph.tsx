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
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      layout: {
        name: "cose",
        animate: true,
        fit: true,
        padding: 20
      },
      style: [
        {
          selector: "node",
          style: {
            label: "data(label)",
            "font-size": 11,
            "text-wrap": "wrap",
            "text-max-width": "110px",
            color: "#0f172a",
            "text-valign": "center",
            "text-halign": "center",
            width: "mapData(importance, 1, 10, 35, 90)",
            height: "mapData(importance, 1, 10, 35, 90)",
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
            "border-width": 4,
            "border-color": "#ef4444"
          }
        }
      ]
    });

    cy.on("tap", "node", (event) => {
      const selectedId = event.target.id();
      const selected = nodes.find((node) => node.id === selectedId) ?? null;
      onSelectNode(selected);
    });

    cy.on("tap", (event) => {
      if (event.target === cy) onSelectNode(null);
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [elements, nodes, onSelectNode]);

  useEffect(() => {
    if (!cyRef.current) return;
    cyRef.current.layout({ name: "cose", animate: true, fit: true, padding: 20 }).run();
  }, [elements]);

  return <div ref={containerRef} className="h-[560px] w-full rounded-xl border border-slate-300 bg-white" />;
}
