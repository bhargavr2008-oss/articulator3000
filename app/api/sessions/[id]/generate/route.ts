import { NextResponse, type NextRequest } from "next/server";
import { generateRequestSchema } from "@/lib/artifacts/schema";

export async function POST(request: NextRequest) {
  const json = (await request.json().catch(() => null)) as unknown;
  const parsed = generateRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid generation payload" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    idea: parsed.data.idea,
    audience: {
      teammate: {
        oneLiner: parsed.data.idea.oneLiner.value,
        summary: parsed.data.idea.summary.value,
      },
    },
    visuals: {
      hero: { status: "pending" },
      sketch: { status: "pending" },
    },
  });
}
