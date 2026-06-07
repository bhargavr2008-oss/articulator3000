import { NextResponse, type NextRequest } from "next/server";
import {
  synthesizeWithRetry,
  SynthesisValidationError,
} from "@/lib/synthesis/core";
import { synthesizeIdeaWithOpenAI } from "@/lib/synthesis/provider";
import { synthesisRequestSchema } from "@/lib/synthesis/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  const { id } = await context.params;
  const json = (await request.json().catch(() => null)) as unknown;
  const parsed = synthesisRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid synthesis payload", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    let model = "";
    const result = await synthesizeWithRetry(async () => {
      const response = await synthesizeIdeaWithOpenAI(apiKey, parsed.data);
      model = response.model;
      return response.idea;
    });

    return NextResponse.json({
      sessionId: id,
      model,
      attempts: result.attempts,
      idea: result.idea,
    });
  } catch (err) {
    const status = err instanceof SynthesisValidationError ? 422 : 502;
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to synthesize idea.",
      },
      { status },
    );
  }
}
