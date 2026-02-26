import assert from "node:assert/strict";
import test from "node:test";

import { isConnectedGraph } from "../src/lib/graph";

const nodes = [
  { id: "a", label: "A", type: "Topic", summary: "A", importance: 8 },
  { id: "b", label: "B", type: "Subtopic", summary: "B", importance: 6 },
  { id: "c", label: "C", type: "Example", summary: "C", importance: 4 }
] as const;

test("isConnectedGraph returns true for connected graph", () => {
  const edges = [
    { id: "e1", source: "a", target: "b", relation: "related_to" },
    { id: "e2", source: "b", target: "c", relation: "related_to" }
  ] as const;

  assert.equal(isConnectedGraph([...nodes], [...edges]), true);
});

test("isConnectedGraph returns false for disconnected graph", () => {
  const edges = [{ id: "e1", source: "a", target: "b", relation: "related_to" }] as const;

  assert.equal(isConnectedGraph([...nodes], [...edges]), false);
});
