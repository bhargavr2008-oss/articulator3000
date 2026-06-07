import { NextResponse } from "next/server";

/**
 * POST /api/sessions — create a temporary session.
 *
 * Step 1 stub: returns an id + timestamps with no persistence yet. Wiring this
 * to Vercel Postgres lands with the synthesize/grill steps that actually need
 * to read session state back.
 */
export async function POST() {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  return NextResponse.json(
    {
      id,
      createdAt,
      uploadPermissions: {
        // Mirrors the locked capture modalities in SPEC.md §2.
        maxFileBytes: 10 * 1024 * 1024,
        acceptedTypes: ["image/png", "image/jpeg", "image/webp"],
      },
    },
    { status: 201 },
  );
}
