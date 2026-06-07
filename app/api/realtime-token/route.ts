import { NextResponse } from "next/server";

/**
 * POST /api/realtime-token — mint a short-lived ephemeral credential the browser
 * uses to open a WebRTC connection to OpenAI's realtime transcription service.
 *
 * The real OPENAI_API_KEY never leaves the server; the browser only ever sees the
 * ephemeral `ek_...` secret, which expires in ~1 minute.
 */
export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  const model = process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-transcribe";

  const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: {
        type: "transcription",
        audio: {
          input: {
            transcription: { model },
            turn_detection: { type: "server_vad" },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json(
      { error: "Failed to create realtime session", detail },
      { status: 502 },
    );
  }

  const data = await res.json();
  // Return only what the client needs to connect.
  return NextResponse.json({
    value: data.value,
    expiresAt: data.expires_at,
    model,
  });
}
