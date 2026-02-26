import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

import { isConnectedGraph, applyImportanceDefaults } from "@/lib/graph";
import { buildGenerationPrompt } from "@/lib/prompt";
import {
  graphEdgeSchema,
  graphNodeSchema,
  generationRequestSchema,
  generationResponseSchema,
  type GenerationResponse
} from "@/lib/schema";

export async function POST(req: Request) {
  const parsedBody = generationRequestSchema.safeParse(await req.json().catch(() => null));

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: "Invalid request payload.",
        details: parsedBody.error.flatten()
      },
      { status: 400 }
    );
  }

  const { topic } = parsedBody.data;
  const hasApiKey = Boolean(process.env.OPENAI_API_KEY);
  if (!hasApiKey) {
    return NextResponse.json(
      {
        error: "Generation failed.",
        details: "OPENAI_API_KEY is not configured on the server.",
        source: "openai"
      },
      { status: 500 }
    );
  }

  try {
    const raw = await generateWithOpenAI(topic);

    const normalized: GenerationResponse = {
      ...raw,
      graph: {
        ...raw.graph,
        nodes: applyImportanceDefaults(raw.graph.nodes, raw.graph.edges)
      }
    };

    const parsedResult = generationResponseSchema.safeParse(normalized);
    if (!parsedResult.success) {
      return NextResponse.json(
        {
          error: "Generation did not match expected schema.",
          details: parsedResult.error.flatten(),
          source: "openai"
        },
        { status: 502 }
      );
    }

    if (!isConnectedGraph(parsedResult.data.graph.nodes, parsedResult.data.graph.edges)) {
      return NextResponse.json(
        {
          error: "Generated graph is not connected.",
          source: "openai"
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      data: parsedResult.data,
      source: "openai"
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Generation failed.",
        details: formatGenerationError(error),
        source: "openai"
      },
      { status: 500 }
    );
  }
}

async function generateWithOpenAI(topic: string): Promise<GenerationResponse> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const primaryModel = process.env.OPENAI_MODEL ?? "gpt-4.1-nano";
  const isNetlify = process.env.NETLIFY === "true";
  const fallbackModels = (process.env.OPENAI_FALLBACK_MODELS ?? "gpt-4.1-mini")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const modelCandidates = Array.from(
    new Set([primaryModel, ...(isNetlify ? [] : fallbackModels)])
  );
  const enableShapeFirst = process.env.ENABLE_SHAPE_FIRST === "true" && !isNetlify;

  const errors: string[] = [];

  for (const model of modelCandidates) {
    const graphShape = enableShapeFirst ? await generateGraphShape(client, model, topic) : null;
    if (enableShapeFirst && graphShape) {
      const shapeFirstText = await requestText(client, model, [
        {
          role: "system",
          content: [{ type: "input_text", text: "Return JSON only." }]
        },
        {
          role: "user",
          content: [{ type: "input_text", text: buildShapeFirstContentPrompt(topic, graphShape) }]
        }
      ]);

      const shapeFirstParse = parseAndValidate(shapeFirstText, topic, graphShape);
      if (shapeFirstParse.success) return shapeFirstParse.data;
      errors.push(`[${model} shape-first] ${shapeFirstParse.errorSummary}`);
    }

    const firstAttemptText = await requestText(client, model, [
      {
        role: "system",
        content: [{ type: "input_text", text: "Produce strict JSON matching the requested schema." }]
      },
      {
        role: "user",
        content: [{ type: "input_text", text: buildGenerationPrompt(topic) }]
      }
    ]);

    const firstParse = parseAndValidate(firstAttemptText, topic);
    if (firstParse.success) return firstParse.data;

    const repairPrompt = buildRepairPrompt(topic, firstAttemptText, firstParse.errorSummary);
    const repairedText = await requestText(client, model, [
      {
        role: "system",
        content: [{ type: "input_text", text: "Return JSON only and strictly satisfy all constraints." }]
      },
      {
        role: "user",
        content: [{ type: "input_text", text: repairPrompt }]
      }
    ]);

    const repairedParse = parseAndValidate(repairedText, topic);
    if (repairedParse.success) return repairedParse.data;

    errors.push(`[${model}] ${repairedParse.errorSummary}`);
  }

  throw new Error(`All models failed schema validation. ${errors.join(" | ")}`);
}

const graphShapeSchema = z.object({
  nodes: z.array(graphNodeSchema).min(6),
  edges: z.array(graphEdgeSchema).min(5)
});

async function generateGraphShape(
  client: OpenAI,
  model: string,
  topic: string
): Promise<{ nodes: z.infer<typeof graphNodeSchema>[]; edges: z.infer<typeof graphEdgeSchema>[] } | null> {
  const text = await requestText(client, model, [
    {
      role: "system",
      content: [{ type: "input_text", text: "Return strict JSON only." }]
    },
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text: [
            "Generate a connected concept graph JSON.",
            `Topic: ${topic}`,
            "Output schema:",
            "{",
            '  "nodes":[{"id":"string","label":"string","type":"Topic|Prerequisite|Key Term|Subtopic|Misconception|Example","summary":"string","importance":1-10}],',
            '  "edges":[{"id":"string","source":"nodeId","target":"nodeId","relation":"requires|related_to|part_of|confused_with|example_of","strength":0-1}]',
            "}",
            "Rules:",
            "- Exactly one Topic node.",
            "- 18 to 32 nodes.",
            "- No duplicate IDs.",
            "- Graph must be connected.",
            "- Return JSON only."
          ].join("\n")
        }
      ]
    }
  ]);

  const parsedJson = safeParseJson(extractJsonCandidate(text));
  if (!parsedJson.ok) return null;
  const coerced = coerceGraph(parsedJson.value);
  const parsed = graphShapeSchema.safeParse(coerced);
  if (!parsed.success) return null;
  if (!isConnectedGraph(parsed.data.nodes, parsed.data.edges)) return null;
  return parsed.data;
}

async function requestText(
  client: OpenAI,
  model: string,
  input: Array<{
    role: "system" | "user";
    content: Array<{ type: "input_text"; text: string }>;
  }>
): Promise<string> {
  const timeoutMs = Number(process.env.OPENAI_REQUEST_TIMEOUT_MS ?? 9000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await client.responses.create(
      {
        model,
        input
      },
      {
        signal: controller.signal
      }
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.output_text?.trim()) return response.output_text;

  // output_text can be empty when the model responds with block content.
  const outputItems = ((response as unknown as { output?: unknown[] }).output ?? []) as Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
  const fallback = outputItems
    .flatMap((item) => item.content ?? [])
    .filter((contentItem) => contentItem.type === "output_text" && Boolean(contentItem.text))
    .map((contentItem) => contentItem.text as string)
    .join("\n")
    .trim();

  return fallback;
}

function parseAndValidate(
  text: string,
  topic: string,
  lockedGraph?: { nodes: z.infer<typeof graphNodeSchema>[]; edges: z.infer<typeof graphEdgeSchema>[] }
):
  | { success: true; data: GenerationResponse }
  | { success: false; errorSummary: string } {
  const parsedJson = safeParseJson(extractJsonCandidate(text));
  if (!parsedJson.ok) {
    return { success: false, errorSummary: `JSON parse failed: ${parsedJson.error}` };
  }

  const normalizedCandidate = coerceCandidate(parsedJson.value, topic, lockedGraph);
  const parsed = generationResponseSchema.safeParse(normalizedCandidate);
  if (parsed.success) return { success: true, data: parsed.data };

  const topIssues = parsed.error.issues
    .slice(0, 8)
    .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    .join("; ");
  return { success: false, errorSummary: topIssues };
}

function safeParseJson(input: string): { ok: true; value: unknown } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown JSON parse error"
    };
  }
}

function extractJsonCandidate(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) return fencedMatch[1].trim();

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function coerceCandidate(
  value: unknown,
  topic: string,
  lockedGraph?: { nodes: z.infer<typeof graphNodeSchema>[]; edges: z.infer<typeof graphEdgeSchema>[] }
): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const obj = { ...(value as Record<string, unknown>) };

  if (typeof obj.topic !== "string" || !obj.topic.trim()) {
    const maybeTopic =
      (typeof obj.subject === "string" && obj.subject) ||
      (typeof obj.title === "string" && obj.title) ||
      null;
    obj.topic = maybeTopic ?? topic;
  }

  if (typeof obj.explanations === "string") {
    obj.explanations = {
      eli5: obj.explanations,
      intermediate: obj.explanations,
      advanced: obj.explanations,
      expert: obj.explanations
    };
  }
  if (obj.explanations && typeof obj.explanations === "object" && !Array.isArray(obj.explanations)) {
    const explanations = obj.explanations as Record<string, unknown>;
    const fallback =
      (typeof explanations.eli5 === "string" && explanations.eli5) ||
      (typeof explanations.beginner === "string" && explanations.beginner) ||
      (typeof explanations.intermediate === "string" && explanations.intermediate) ||
      (typeof explanations.advanced === "string" && explanations.advanced) ||
      (typeof explanations.expert === "string" && explanations.expert) ||
      `Overview of ${topic}`;

    obj.explanations = {
      eli5:
        (typeof explanations.eli5 === "string" && explanations.eli5) ||
        (typeof explanations.beginner === "string" && explanations.beginner) ||
        fallback,
      intermediate:
        (typeof explanations.intermediate === "string" && explanations.intermediate) || fallback,
      advanced: (typeof explanations.advanced === "string" && explanations.advanced) || fallback,
      expert: (typeof explanations.expert === "string" && explanations.expert) || fallback
    };
  }

  obj.glossary = coerceGlossary(obj.glossary);
  obj.analogies = coerceStringArray(obj.analogies);
  obj.misconceptions = coerceStringArray(obj.misconceptions);
  obj.prerequisites = coerceStringArray(obj.prerequisites);
  obj.learningPath = coerceStringArray(obj.learningPath);
  obj.graph = lockedGraph ?? coerceGraph(obj.graph);

  return obj;
}

function coerceGlossary(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === "string") {
        const [term, ...rest] = item.split(":");
        const definition = rest.join(":").trim();
        return {
          term: term.trim() || "Term",
          definition: definition || item.trim()
        };
      }
      return item;
    });
  }
  if (!value || typeof value !== "object") return value;

  const record = value as Record<string, unknown>;
  if (typeof record.term === "string" && typeof record.definition === "string") {
    return [{ term: record.term, definition: record.definition }];
  }

  const mapped = Object.entries(record)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([term, definition]) => ({ term, definition }));
  return mapped.length ? mapped : value;
}

function coerceStringArray(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const chunks = value
      .split(/\n|;/)
      .map((s) => s.trim())
      .filter(Boolean);
    return chunks.length ? chunks : [value];
  }
  return value;
}

function coerceGraph(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const graph = { ...(value as Record<string, unknown>) };

  graph.nodes = coerceNodes(graph.nodes);
  graph.edges = coerceEdges(graph.edges);

  return graph;
}

function coerceNodes(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((node, index) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return node;
    const n = { ...(node as Record<string, unknown>) };
    const label = asString(n.label) ?? asString(n.name) ?? asString(n.title) ?? `Concept ${index + 1}`;

    return {
      ...n,
      id: asString(n.id) ?? slugId(label, `node-${index + 1}`),
      label,
      summary: asString(n.summary) ?? `Key concept: ${label}`
    };
  });
}

function coerceEdges(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((edge, index) => {
    if (Array.isArray(edge)) {
      const [sourceRaw, targetRaw, relationRaw] = edge;
      const source = asString(sourceRaw) ?? `node-${index + 1}`;
      const target = asString(targetRaw) ?? source;
      return {
        id: `e-${index + 1}`,
        source,
        target,
        relation: normalizeRelation(asString(relationRaw))
      };
    }

    if (!edge || typeof edge !== "object") return edge;
    const e = edge as Record<string, unknown>;
    const source = asString(e.source) ?? asString(e.from) ?? asString(e.start) ?? "";
    const target = asString(e.target) ?? asString(e.to) ?? asString(e.end) ?? "";

    return {
      ...e,
      id: asString(e.id) ?? `e-${index + 1}`,
      source,
      target,
      relation: normalizeRelation(asString(e.relation) ?? asString(e.type) ?? asString(e.label))
    };
  });
}

function normalizeRelation(value: string | null): string {
  const relation = (value ?? "").toLowerCase();
  if (
    relation === "requires" ||
    relation === "related_to" ||
    relation === "part_of" ||
    relation === "confused_with" ||
    relation === "example_of"
  ) {
    return relation;
  }
  if (relation === "related" || relation === "relates_to") return "related_to";
  if (relation === "requires_prerequisite" || relation === "prerequisite_of") return "requires";
  if (relation === "partof") return "part_of";
  return "related_to";
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function slugId(input: string, fallback: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || fallback
  );
}

function buildRepairPrompt(topic: string, invalidOutput: string, errorSummary: string): string {
  return [
    "The previous answer did not satisfy schema validation.",
    `Topic: ${topic}`,
    `Validation errors: ${errorSummary}`,
    "Rewrite the output as valid JSON only.",
    "Do not include markdown or code fences.",
    "Keep the same top-level shape and required fields.",
    "Ensure explanations is an object with eli5/intermediate/advanced/expert.",
    "Ensure glossary/analogies/misconceptions/prerequisites/learningPath are arrays.",
    "Ensure graph has exactly one Topic node and no duplicate IDs.",
    "Previous invalid output:",
    invalidOutput
  ].join("\n");
}

function buildShapeFirstContentPrompt(
  topic: string,
  graph: { nodes: z.infer<typeof graphNodeSchema>[]; edges: z.infer<typeof graphEdgeSchema>[] }
): string {
  return [
    "Use the graph below as fixed structure and return full response JSON.",
    `Topic: ${topic}`,
    "Return these fields only:",
    "topic, explanations, glossary, analogies, misconceptions, prerequisites, learningPath, graph",
    "graph must be copied exactly as provided.",
    "explanations must be object: eli5, intermediate, advanced, expert.",
    "glossary must be array of objects: term + definition.",
    "analogies/misconceptions/prerequisites/learningPath must be arrays of strings.",
    "JSON only. No markdown.",
    "Graph:",
    JSON.stringify(graph)
  ].join("\n");
}

function formatGenerationError(error: unknown): string {
  if (!error) return "Unknown error";

  const e = error as { message?: string; status?: number; name?: string; code?: string };
  const parts = [
    typeof e.message === "string" ? e.message : "Unknown error",
    typeof e.status === "number" ? `status=${e.status}` : null,
    typeof e.code === "string" ? `code=${e.code}` : null,
    typeof e.name === "string" ? `type=${e.name}` : null
  ].filter(Boolean);

  return parts.join(" | ");
}
