import { z } from "zod";

export const nodeTypeSchema = z.enum([
  "Topic",
  "Prerequisite",
  "Key Term",
  "Subtopic",
  "Misconception",
  "Example"
]);

export const edgeRelationSchema = z.enum([
  "requires",
  "related_to",
  "part_of",
  "confused_with",
  "example_of"
]);

export const graphNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: nodeTypeSchema,
  summary: z.string().min(1),
  importance: z.number().min(1).max(10).optional()
});

export const graphEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  relation: edgeRelationSchema,
  strength: z.number().min(0).max(1).optional()
});

const explanationLevelsSchema = z.object({
  eli5: z.string().min(1),
  intermediate: z.string().min(1),
  advanced: z.string().min(1),
  expert: z.string().min(1)
});

const glossaryItemSchema = z.object({
  term: z.string().min(1),
  definition: z.string().min(1)
});

const quizQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  answer: z.string().min(1),
  explanation: z.string().min(1)
});

const shortAnswerSchema = z.object({
  question: z.string().min(1),
  guidance: z.string().min(1)
});

export const generationResponseSchema = z
  .object({
    topic: z.string().min(1),
    explanations: explanationLevelsSchema,
    glossary: z.array(glossaryItemSchema).min(3),
    analogies: z.array(z.string().min(1)).min(2),
    misconceptions: z.array(z.string().min(1)).min(2),
    prerequisites: z.array(z.string().min(1)).min(2),
    learningPath: z.array(z.string().min(1)).min(3),
    quiz: z.object({
      multipleChoice: z.array(quizQuestionSchema).length(3),
      shortAnswer: z.array(shortAnswerSchema).length(2)
    }),
    graph: z.object({
      nodes: z.array(graphNodeSchema).min(6),
      edges: z.array(graphEdgeSchema).min(5)
    })
  })
  .superRefine((value, ctx) => {
    const topicNodes = value.graph.nodes.filter((n) => n.type === "Topic");
    if (topicNodes.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Graph must contain exactly one Topic node."
      });
    }

    const nodeIds = new Set<string>();
    for (const node of value.graph.nodes) {
      if (nodeIds.has(node.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate node id: ${node.id}`
        });
      }
      nodeIds.add(node.id);
    }

    const edgeIds = new Set<string>();
    for (const edge of value.graph.edges) {
      if (edgeIds.has(edge.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate edge id: ${edge.id}`
        });
      }
      edgeIds.add(edge.id);

      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Edge references missing node: ${edge.id}`
        });
      }
    }
  });

export const generationRequestSchema = z.object({
  topic: z.string().trim().min(2).max(120)
});

export type GenerationRequest = z.infer<typeof generationRequestSchema>;
export type GenerationResponse = z.infer<typeof generationResponseSchema>;
export type GraphNode = z.infer<typeof graphNodeSchema>;
export type GraphEdge = z.infer<typeof graphEdgeSchema>;
