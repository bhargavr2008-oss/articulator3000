import { NextResponse, type NextRequest } from "next/server";
import { ideaModelSchema } from "@/lib/synthesis/schema";

export async function POST(request: NextRequest) {
  const json = (await request.json().catch(() => null)) as unknown;
  const parsed = ideaModelSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid confirmed IdeaModel" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    idea: parsed.data,
    confirmedAt: new Date().toISOString(),
  });
}
