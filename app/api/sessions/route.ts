import { NextResponse } from "next/server";

/**
 * POST /api/sessions — create a temporary session.
 *
 * The hackathon flow keeps active session state in the client and posts each
 * model snapshot forward. Frozen public shares are persisted separately.
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
