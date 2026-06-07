import { NextResponse, type NextRequest } from "next/server";
import { runGrillTurn } from "@/lib/grill/provider";
import { grillTurnRequestSchema } from "@/lib/grill/schema";

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
  const parsed = grillTurnRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid Grill payload", detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await runGrillTurn(apiKey, parsed.data));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Grill turn failed." },
      { status: 502 },
    );
  }
}
