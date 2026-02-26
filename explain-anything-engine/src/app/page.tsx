"use client";

import { FormEvent, useMemo, useState } from "react";

import { ConceptGraph } from "@/components/ConceptGraph";
import { NodeInspector } from "@/components/NodeInspector";
import type { GenerationResponse, GraphNode } from "@/lib/schema";

type TabKey = "explanations" | "glossary" | "misconceptions" | "quiz";

const tabs: { id: TabKey; label: string }[] = [
  { id: "explanations", label: "Explanations" },
  { id: "glossary", label: "Glossary" },
  { id: "misconceptions", label: "Misconceptions" },
  { id: "quiz", label: "Quiz" }
];

export default function HomePage() {
  const [topic, setTopic] = useState("How transformers work in AI");
  const [activeTab, setActiveTab] = useState<TabKey>("explanations");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [source, setSource] = useState<"openai" | "mock" | null>(null);
  const [result, setResult] = useState<GenerationResponse | null>(null);

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

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to generate topic output.");
      }

      setResult(payload.data);
      setSource(payload.source);
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
        <div className="space-y-3 text-sm text-slate-700">
          <Section label="ELI5" body={result.explanations.eli5} />
          <Section label="Intermediate" body={result.explanations.intermediate} />
          <Section label="Advanced" body={result.explanations.advanced} />
          <Section label="Expert" body={result.explanations.expert} />
          <Section label="Analogies" body={result.analogies.join("\n")} />
        </div>
      );
    }

    if (activeTab === "glossary") {
      return (
        <div className="space-y-2 text-sm text-slate-700">
          {result.glossary.map((item) => (
            <div key={item.term} className="rounded border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">{item.term}</p>
              <p>{item.definition}</p>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === "misconceptions") {
      return (
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
          {result.misconceptions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    }

    return (
      <div className="space-y-4 text-sm text-slate-700">
        <div>
          <h3 className="font-semibold text-slate-900">Multiple Choice</h3>
          <div className="mt-2 space-y-3">
            {result.quiz.multipleChoice.map((q) => (
              <div key={q.question} className="rounded border border-slate-200 bg-slate-50 p-3">
                <p className="font-medium">{q.question}</p>
                <ul className="mt-1 list-disc pl-5">
                  {q.options.map((option) => (
                    <li key={option}>{option}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs">
                  <span className="font-semibold">Answer:</span> {q.answer}
                </p>
                <p className="text-xs">{q.explanation}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-slate-900">Short Answer</h3>
          <div className="mt-2 space-y-3">
            {result.quiz.shortAnswer.map((q) => (
              <div key={q.question} className="rounded border border-slate-200 bg-slate-50 p-3">
                <p className="font-medium">{q.question}</p>
                <p className="text-xs">{q.guidance}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }, [activeTab, result]);

  return (
    <main className="mx-auto max-w-7xl p-6">
      <header className="rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold">Explain Anything Engine</h1>
        <p className="mt-1 text-sm text-slate-600">
          Generate a multi-level explanation and explore concept relationships through an interactive graph.
        </p>

        <form onSubmit={handleGenerate} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter a topic"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </form>

        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        {source ? <p className="mt-2 text-xs text-slate-500">Data source: {source}</p> : null}
      </header>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div>
          {result ? (
            <ConceptGraph
              nodes={result.graph.nodes}
              edges={result.graph.edges}
              onSelectNode={setSelectedNode}
            />
          ) : (
            <div className="flex h-[560px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
              Generate a topic to render the concept graph.
            </div>
          )}
        </div>
        <NodeInspector node={selectedNode} />
      </section>

      <section className="mt-6 rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded px-3 py-1 text-sm ${
                activeTab === tab.id ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4">{tabContent ?? <p className="text-sm text-slate-500">No generated content yet.</p>}</div>
      </section>
    </main>
  );
}

function Section({ label, body }: { label: string; body: string }) {
  return (
    <section className="rounded border border-slate-200 bg-slate-50 p-3">
      <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
      <p className="whitespace-pre-line">{body}</p>
    </section>
  );
}
