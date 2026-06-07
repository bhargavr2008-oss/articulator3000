import OpenAI from "openai";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

const speechRequestSchema = z.object({
  text: z.string().min(1).max(600),
});

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  const json = (await request.json().catch(() => null)) as unknown;
  const parsed = speechRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid speech payload" },
      { status: 400 },
    );
  }

  const client = new OpenAI({ apiKey });
  const audio = await client.audio.speech.create({
    model: process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts",
    voice: process.env.OPENAI_TTS_VOICE ?? "marin",
    input: parsed.data.text,
    response_format: "mp3",
    instructions:
      "Sound like a sharp, calm product partner in a hackathon demo. Natural, concise, curious, not robotic.",
  });

  return new Response(await audio.arrayBuffer(), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
