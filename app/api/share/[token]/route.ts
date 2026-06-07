import { NextResponse, type NextRequest } from "next/server";
import { deleteShare } from "@/lib/share/store";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const deleted = await deleteShare(token);
  return NextResponse.json({ deleted });
}
