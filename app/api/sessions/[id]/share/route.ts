import { NextResponse, type NextRequest } from "next/server";
import { shareRequestSchema } from "@/lib/share/schema";
import { createShare } from "@/lib/share/store";

export async function POST(request: NextRequest) {
  const json = (await request.json().catch(() => null)) as unknown;
  const parsed = shareRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid share payload" },
      { status: 400 },
    );
  }

  const token = await createShare(parsed.data);
  return NextResponse.json({ token, url: `/share/${token}` });
}
