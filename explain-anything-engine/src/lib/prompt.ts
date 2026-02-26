export function buildGenerationPrompt(topic: string): string {
  return [
    "You are generating a strict JSON payload for a concept-exploration app.",
    `Topic: ${topic}`,
    "Return JSON only. No markdown, no prose outside JSON.",
    "Requirements:",
    "- Keep explanations concise and accurate.",
    "- Include exactly one Topic node in graph.nodes.",
    "- No duplicate IDs.",
    "- Graph should be connected and centered on the topic.",
    "- Provide 20 to 40 nodes when possible, but never fewer than 6.",
    "- Use only allowed node types: Topic, Prerequisite, Key Term, Subtopic, Misconception, Example.",
    "- Use only allowed edge relations: requires, related_to, part_of, confused_with, example_of.",
    "- quiz.multipleChoice must have exactly 3 items with 4 options each.",
    "- quiz.shortAnswer must have exactly 2 items.",
    "- If importance is included, normalize between 1 and 10."
  ].join("\n");
}
