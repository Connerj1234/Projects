"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { ConceptGraph } from "@/components/ConceptGraph";
import { NodeInspector } from "@/components/NodeInspector";
import type { GenerationResponse, GraphNode } from "@/lib/schema";

type TabKey = "explanations" | "glossary" | "misconceptions";

const tabs: { id: TabKey; label: string; description: string }[] = [
  { id: "explanations", label: "Explanations", description: "Layered understanding" },
  { id: "glossary", label: "Glossary", description: "Core terms" },
  { id: "misconceptions", label: "Misconceptions", description: "Common pitfalls" }
];

const nodeTypes = [
  "Topic",
  "Prerequisite",
  "Key Term",
  "Subtopic",
  "Misconception",
  "Example"
] as const;
type NodeTypeFilter = (typeof nodeTypes)[number];
type LabelDensity = "compact" | "balanced" | "expanded";

export default function HomePage() {
  const [topic, setTopic] = useState("How transformers work in AI");
  const [activeTab, setActiveTab] = useState<TabKey>("explanations");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [source, setSource] = useState<"openai" | "mock" | null>(null);
  const [result, setResult] = useState<GenerationResponse | null>(null);
  const [activeNodeTypes, setActiveNodeTypes] = useState<NodeTypeFilter[]>([...nodeTypes]);
  const [labelDensity, setLabelDensity] = useState<LabelDensity>("balanced");
  const [fitVersion, setFitVersion] = useState(0);

  async function handleGenerate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSelectedNode(null);
    setLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ topic })
      });

      const rawText = await response.text();
      const payload = safeJsonParse(rawText);
      if (!response.ok) {
        const detailsValue = payload?.details;
        const detailText = detailsValue
          ? typeof detailsValue === "string"
            ? detailsValue
            : JSON.stringify(detailsValue)
          : null;
        const messageParts = [
          payload?.error || payload?.message || `Failed to generate topic output. (HTTP ${response.status})`,
          detailText,
          !payload ? rawText.slice(0, 400) : null
        ].filter(Boolean);
        throw new Error(messageParts.join(" "));
      }

      if (!payload?.data || !payload?.source) {
        throw new Error("Generation succeeded but response payload was malformed.");
      }

      setResult(payload.data as GenerationResponse);
      setSource(payload.source as "openai" | "mock");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown generation error.");
    } finally {
      setLoading(false);
    }
  }

  const tabContent = useMemo(() => {
    if (!result) return null;

    if (activeTab === "explanations") {
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Section label="ELI5" tone="amber" body={result.explanations.eli5} />
          <Section label="Intermediate" tone="sky" body={result.explanations.intermediate} />
          <Section label="Advanced" tone="emerald" body={result.explanations.advanced} />
          <Section label="Expert" tone="violet" body={result.explanations.expert} />
          <Section label="Analogies" tone="slate" body={result.analogies.join("\n")} fullWidth />
        </div>
      );
    }

    if (activeTab === "glossary") {
      return (
        <div className="grid gap-3 md:grid-cols-2">
          {result.glossary.map((item) => (
            <article key={item.term} className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-100">{item.term}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{item.definition}</p>
            </article>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {result.misconceptions.map((item, idx) => (
          <article key={item} className="rounded-xl border border-rose-900/70 bg-rose-950/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-300">Pitfall {idx + 1}</p>
            <p className="mt-1 text-sm text-rose-100">{item}</p>
          </article>
        ))}
      </div>
    );
  }, [activeTab, result]);

  const filteredGraph = useMemo(() => {
    if (!result) return null;
    const allowed = new Set(activeNodeTypes);
    const nodes = result.graph.nodes.filter((node) => allowed.has(node.type as NodeTypeFilter));
    const ids = new Set(nodes.map((node) => node.id));
    const edges = result.graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
    return { nodes, edges };
  }, [activeNodeTypes, result]);

  useEffect(() => {
    if (!selectedNode || !filteredGraph) return;
    const visible = filteredGraph.nodes.some((node) => node.id === selectedNode.id);
    if (!visible) setSelectedNode(null);
  }, [filteredGraph, selectedNode]);

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-100">Explain Anything Engine</h1>
        <p className="mt-1 text-sm text-slate-400">
          Generate a multi-level explanation and explore concept relationships through an interactive graph.
        </p>

        <form onSubmit={handleGenerate} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter a topic"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </form>

        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
        {source ? <p className="mt-2 text-xs text-slate-500">Data source: {source}</p> : null}
      </header>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {nodeTypes.map((type) => {
                const active = activeNodeTypes.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() =>
                      setActiveNodeTypes((prev) =>
                        prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
                      )
                    }
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      active
                        ? "border-slate-500 bg-slate-700 text-white"
                        : "border-slate-700 bg-slate-900 text-slate-300"
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
              <button
                onClick={() => setActiveNodeTypes([...nodeTypes])}
                className="ml-auto rounded border border-slate-700 px-2.5 py-1 text-xs text-slate-300"
              >
                Reset filters
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                value={labelDensity}
                onChange={(e) => setLabelDensity(e.target.value as LabelDensity)}
                className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-300"
              >
                <option value="compact">Labels: Compact</option>
                <option value="balanced">Labels: Balanced</option>
                <option value="expanded">Labels: Expanded</option>
              </select>
              <button
                onClick={() => setFitVersion((v) => v + 1)}
                className="rounded border border-slate-700 px-2.5 py-1 text-xs text-slate-300"
              >
                Fit / Reset layout
              </button>
            </div>
          </div>
          {loading ? (
            <GraphLoadingState topic={topic} />
          ) : filteredGraph ? (
            <ConceptGraph
              nodes={filteredGraph.nodes}
              edges={filteredGraph.edges}
              onSelectNode={setSelectedNode}
              labelDensity={labelDensity}
              fitVersion={fitVersion}
            />
          ) : (
            <div className="flex h-[560px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900 text-sm text-slate-400">
              Generate a topic to render the concept graph.
            </div>
          )}
        </div>
        {loading ? (
          <InspectorLoadingState />
        ) : (
          <NodeInspector
            node={selectedNode}
            nodes={filteredGraph?.nodes ?? []}
            edges={filteredGraph?.edges ?? []}
          />
        )}
      </section>

      <section className="mt-6 rounded-xl border border-slate-800 bg-slate-900/80 shadow-sm">
        <div className="grid lg:grid-cols-[240px_1fr]">
          <aside className="border-b border-slate-800 p-4 lg:border-b-0 lg:border-r">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Knowledge Views</p>
            <div className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    activeTab === tab.id
                      ? "border-blue-500 bg-blue-600/20 text-blue-100"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <p className="text-sm font-semibold">{tab.label}</p>
                  <p className={`text-xs ${activeTab === tab.id ? "text-blue-200" : "text-slate-500"}`}>
                    {tab.description}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          <div className="p-4 lg:p-5">
            {loading ? (
              <KnowledgeLoadingState />
            ) : (
              tabContent ?? <p className="text-sm text-slate-500">No generated content yet.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Section({
  label,
  body,
  tone,
  fullWidth
}: {
  label: string;
  body: string;
  tone: "amber" | "sky" | "emerald" | "violet" | "slate";
  fullWidth?: boolean;
}) {
  const toneClasses: Record<typeof tone, string> = {
    amber: "border-amber-900 bg-amber-950/40",
    sky: "border-sky-900 bg-sky-950/40",
    emerald: "border-emerald-900 bg-emerald-950/40",
    violet: "border-violet-900 bg-violet-950/40",
    slate: "border-slate-700 bg-slate-800/60"
  };

  return (
    <article className={`rounded-xl border p-4 ${toneClasses[tone]} ${fullWidth ? "md:col-span-2" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-200">{body}</p>
    </article>
  );
}

function GraphLoadingState({ topic }: { topic: string }) {
  return (
    <div className="flex h-[560px] flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-700 border-t-blue-400" />
      <p className="mt-5 text-sm font-semibold text-slate-100">Building concept graph</p>
      <p className="mt-1 max-w-md text-sm text-slate-400">
        Mapping: <span className="font-medium text-slate-200">{topic}</span>
      </p>
      <div className="mt-4 h-1.5 w-56 overflow-hidden rounded-full bg-slate-700">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-500" />
      </div>
    </div>
  );
}

function InspectorLoadingState() {
  return (
    <aside className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
      <div className="h-4 w-28 animate-pulse rounded bg-slate-700" />
      <div className="mt-3 h-7 w-44 animate-pulse rounded bg-slate-700" />
      <div className="mt-5 space-y-3 rounded-lg border border-slate-700 bg-slate-800 p-4">
        <div className="h-3 w-20 animate-pulse rounded bg-slate-700" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-700" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-slate-700" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="h-20 animate-pulse rounded-lg border border-slate-700 bg-slate-800" />
        <div className="h-20 animate-pulse rounded-lg border border-slate-700 bg-slate-800" />
      </div>
    </aside>
  );
}

function KnowledgeLoadingState() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Array.from({ length: 5 }).map((_, idx) => (
        <div
          key={idx}
          className={`animate-pulse rounded-xl border border-slate-700 bg-slate-800 p-4 ${
            idx === 4 ? "md:col-span-2" : ""
          }`}
        >
          <div className="h-3 w-24 rounded bg-slate-700" />
          <div className="mt-3 h-4 w-full rounded bg-slate-700" />
          <div className="mt-2 h-4 w-5/6 rounded bg-slate-700" />
          <div className="mt-2 h-4 w-2/3 rounded bg-slate-700" />
        </div>
      ))}
    </div>
  );
}

function safeJsonParse(input: string): Record<string, any> | null {
  try {
    return JSON.parse(input) as Record<string, any>;
  } catch {
    return null;
  }
}
