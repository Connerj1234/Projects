import { NextResponse } from "next/server";
import OpenAI from "openai";

import { isConnectedGraph, applyImportanceDefaults } from "@/lib/graph";
import { buildMockResponse } from "@/lib/mockData";
import { buildGenerationPrompt } from "@/lib/prompt";
import {
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

  try {
    const raw = hasApiKey ? await generateWithOpenAI(topic) : buildMockResponse(topic);

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
          source: hasApiKey ? "openai" : "mock"
        },
        { status: 502 }
      );
    }

    if (!isConnectedGraph(parsedResult.data.graph.nodes, parsedResult.data.graph.edges)) {
      return NextResponse.json(
        {
          error: "Generated graph is not connected.",
          source: hasApiKey ? "openai" : "mock"
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      data: parsedResult.data,
      source: hasApiKey ? "openai" : "mock"
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Generation failed.",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

async function generateWithOpenAI(topic: string): Promise<GenerationResponse> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: "Produce strict JSON matching the requested schema." }]
      },
      {
        role: "user",
        content: [{ type: "input_text", text: buildGenerationPrompt(topic) }]
      }
    ]
  });

  const text = response.output_text;
  const json = JSON.parse(text);

  const parsed = generationResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("OpenAI response was not valid for the schema.");
  }

  return parsed.data;
}
