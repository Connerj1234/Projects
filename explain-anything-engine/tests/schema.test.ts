import assert from "node:assert/strict";
import test from "node:test";

import { generationResponseSchema } from "../src/lib/schema";

function basePayload() {
  return {
    topic: "Transformers",
    explanations: {
      eli5: "Simple",
      intermediate: "Medium",
      advanced: "Advanced",
      expert: "Expert"
    },
    glossary: [
      { term: "Token", definition: "Small text unit" },
      { term: "Embedding", definition: "Vector representation" },
      { term: "Attention", definition: "Weighted relevance" }
    ],
    analogies: ["Like reading with context", "Like a weighted graph"],
    misconceptions: ["It is just autocomplete", "It has true understanding"],
    prerequisites: ["Linear algebra", "Probability"],
    learningPath: ["Basics", "Attention", "Architectures"],
    graph: {
      nodes: [
        { id: "t", label: "Transformers", type: "Topic", summary: "Main", importance: 10 },
        { id: "a", label: "Attention", type: "Key Term", summary: "Core", importance: 8 },
        { id: "e", label: "Encoder", type: "Subtopic", summary: "Module", importance: 7 },
        { id: "d", label: "Decoder", type: "Subtopic", summary: "Module", importance: 7 },
        { id: "p", label: "Positional Encoding", type: "Prerequisite", summary: "Order", importance: 7 },
        { id: "x", label: "Example", type: "Example", summary: "Use case", importance: 5 }
      ],
      edges: [
        { id: "e1", source: "a", target: "t", relation: "part_of" },
        { id: "e2", source: "e", target: "t", relation: "part_of" },
        { id: "e3", source: "d", target: "t", relation: "part_of" },
        { id: "e4", source: "p", target: "t", relation: "requires" },
        { id: "e5", source: "x", target: "t", relation: "example_of" }
      ]
    }
  };
}

test("schema accepts valid payload", () => {
  const parsed = generationResponseSchema.safeParse(basePayload());
  assert.equal(parsed.success, true);
});

test("schema rejects duplicate node IDs", () => {
  const payload = basePayload();
  payload.graph.nodes[1].id = "t";
  const parsed = generationResponseSchema.safeParse(payload);
  assert.equal(parsed.success, false);
});

test("schema rejects multiple topic nodes", () => {
  const payload = basePayload();
  payload.graph.nodes[1].type = "Topic";
  const parsed = generationResponseSchema.safeParse(payload);
  assert.equal(parsed.success, false);
});
