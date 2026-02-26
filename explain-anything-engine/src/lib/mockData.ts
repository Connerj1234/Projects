import type { GenerationResponse } from "@/lib/schema";
import { applyImportanceDefaults } from "@/lib/graph";

export function buildMockResponse(topic: string): GenerationResponse {
  const topicId = slug(topic);

  const nodes: GenerationResponse["graph"]["nodes"] = [
    {
      id: topicId,
      label: topic,
      type: "Topic",
      summary: `${topic} is the central concept explored in this map.`
    },
    {
      id: `${topicId}-foundation`,
      label: "Foundational Principles",
      type: "Prerequisite",
      summary: `Core ideas that must be understood before diving deeper into ${topic}.`
    },
    {
      id: `${topicId}-terms`,
      label: "Core Vocabulary",
      type: "Key Term",
      summary: `Shared language and definitions used when discussing ${topic}.`
    },
    {
      id: `${topicId}-workflow`,
      label: "Typical Workflow",
      type: "Subtopic",
      summary: `The common sequence of steps used to apply ${topic}.`
    },
    {
      id: `${topicId}-pitfalls`,
      label: "Common Mistakes",
      type: "Misconception",
      summary: `Frequent misunderstandings that reduce results in ${topic}.`
    },
    {
      id: `${topicId}-example`,
      label: "Real-World Example",
      type: "Example",
      summary: `A practical scenario that demonstrates ${topic} in action.`
    }
  ];

  const edges: GenerationResponse["graph"]["edges"] = [
    {
      id: `${topicId}-e1`,
      source: `${topicId}-foundation`,
      target: topicId,
      relation: "requires",
      strength: 0.9
    },
    {
      id: `${topicId}-e2`,
      source: `${topicId}-terms`,
      target: topicId,
      relation: "part_of",
      strength: 0.8
    },
    {
      id: `${topicId}-e3`,
      source: topicId,
      target: `${topicId}-workflow`,
      relation: "related_to",
      strength: 0.85
    },
    {
      id: `${topicId}-e4`,
      source: `${topicId}-pitfalls`,
      target: topicId,
      relation: "confused_with",
      strength: 0.7
    },
    {
      id: `${topicId}-e5`,
      source: `${topicId}-example`,
      target: topicId,
      relation: "example_of",
      strength: 0.8
    }
  ];

  return {
    topic,
    explanations: {
      eli5: `${topic} is like a system that helps you break a big idea into smaller, connected parts you can explore step by step.`,
      intermediate: `${topic} can be understood as a structured approach where concepts, dependencies, and practical examples are linked to improve comprehension.`,
      advanced: `${topic} combines conceptual decomposition, dependency mapping, and contextual examples to support deeper transfer of knowledge.`,
      expert: `${topic} is a knowledge-graph-oriented learning model where semantic relationships and relevance weighting guide progression and interpretation.`
    },
    glossary: [
      {
        term: "Concept Node",
        definition: "A single idea represented in the graph."
      },
      {
        term: "Edge Relation",
        definition: "A typed connection between two concept nodes."
      },
      {
        term: "Prerequisite",
        definition: "A concept that should be understood before another concept."
      }
    ],
    analogies: [
      `${topic} is like a subway map where each stop is a concept and routes show how ideas connect.`,
      `${topic} is like assembling a machine from components, where each part only makes sense in relation to others.`
    ],
    misconceptions: [
      `${topic} is only useful for beginners.`,
      `If you know definitions, you automatically understand ${topic}.`
    ],
    prerequisites: ["Basic terminology", "High-level mental model"],
    learningPath: [
      "Understand foundational principles",
      "Learn core terms and relationships",
      "Apply concepts in practical examples"
    ],
    quiz: {
      multipleChoice: [
        {
          question: "What is the purpose of a knowledge graph in this system?",
          options: [
            "Store images",
            "Show relationships between concepts",
            "Replace all explanations",
            "Increase server speed"
          ],
          answer: "Show relationships between concepts",
          explanation: "The graph is used to represent conceptual structure and dependencies."
        },
        {
          question: "What does a prerequisite edge imply?",
          options: [
            "Two terms are synonyms",
            "One concept should be understood first",
            "A concept is optional",
            "The relationship is random"
          ],
          answer: "One concept should be understood first",
          explanation: "Prerequisite links define dependency order between ideas."
        },
        {
          question: "Why include misconceptions?",
          options: [
            "To add complexity",
            "To reduce topic scope",
            "To highlight common errors and improve understanding",
            "To avoid giving examples"
          ],
          answer: "To highlight common errors and improve understanding",
          explanation: "Addressing misconceptions helps learners avoid faulty mental models."
        }
      ],
      shortAnswer: [
        {
          question: "Describe how concept dependencies improve learning.",
          guidance: "Mention sequencing and foundational understanding."
        },
        {
          question: "Give one real-world use case for mapping misconceptions.",
          guidance: "Describe a context where correcting wrong assumptions matters."
        }
      ]
    },
    graph: {
      nodes: applyImportanceDefaults(nodes, edges),
      edges
    }
  };
}

function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50) || "topic";
}
