type PromptOptions = {
  minNodes?: number;
  maxNodes?: number;
};

export function buildGenerationPrompt(topic: string, options: PromptOptions = {}): string {
  const minNodes = options.minNodes ?? 6;
  const maxNodes = options.maxNodes ?? 40;

  return [
    "You are generating a strict JSON payload for a concept-exploration app.",
    `Topic: ${topic}`,
    "Return JSON only. No markdown, no prose outside JSON.",
    "Requirements:",
    "- Keep explanations concise and accurate.",
    "- explanations must be an object with keys: eli5, intermediate, advanced, expert.",
    "- glossary must be an array of objects with term and definition.",
    "- analogies must be an array of strings.",
    "- misconceptions must be an array of strings.",
    "- prerequisites must be an array of strings.",
    "- learningPath must be an array of strings.",
    "- Include exactly one Topic node in graph.nodes.",
    "- No duplicate IDs.",
    "- Graph should be connected and centered on the topic.",
    `- Provide ${minNodes} to ${maxNodes} nodes when possible, but never fewer than ${minNodes}.`,
    "- Use only allowed node types: Topic, Prerequisite, Key Term, Subtopic, Misconception, Example.",
    "- Use only allowed edge relations: requires, related_to, part_of, confused_with, example_of.",
    "- If importance is included, normalize between 1 and 10."
  ].join("\n");
}
