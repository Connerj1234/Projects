import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { generationResponseSchema } from "@/lib/schema";

const historySaveSchema = z.object({
  clientId: z.string().min(8).max(128),
  topic: z.string().min(2).max(120),
  source: z.enum(["openai", "mock"]),
  data: generationResponseSchema
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId")?.trim();

  if (!clientId) {
    return NextResponse.json({ items: [] });
  }

  const items = await prisma.topicHistory.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      topic: true,
      source: true,
      createdAt: true,
      payload: true
    }
  });

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      topic: item.topic,
      source: item.source,
      createdAt: item.createdAt,
      data: JSON.parse(item.payload)
    }))
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = historySaveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid history payload.",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const { clientId, topic, source, data } = parsed.data;

  const saved = await prisma.topicHistory.create({
    data: {
      clientId,
      topic,
      source,
      payload: JSON.stringify(data)
    },
    select: {
      id: true,
      topic: true,
      source: true,
      createdAt: true
    }
  });

  return NextResponse.json({ item: saved });
}
