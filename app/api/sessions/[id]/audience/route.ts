import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { NextResponse, type NextRequest } from "next/server";
import {
  audienceCopySchema,
  audienceRequestSchema,
} from "@/lib/artifacts/schema";

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
  const parsed = audienceRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid audience payload" },
      { status: 400 },
    );
  }

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.responses.parse({
      model: process.env.OPENAI_SYNTHESIS_MODEL ?? "gpt-5.4-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `Create the ${parsed.data.audience} communication artifact from this IdeaModel.`,
                "Keep the meaning faithful. Do not invent facts or settled implementation choices.",
                parsed.data.audience === "technical-engineering"
                  ? [
                      "Return oneLiner as an email subject line.",
                      "Return summary as a complete, detailed plain-text email to an engineering team.",
                      "The email must include: greeting, context, target user and problem, required product behavior, end-to-end workflow, functional requirements, constraints/non-goals, acceptance criteria, assumptions or open questions, and a short sign-off.",
                      "Use concrete domain language. Mark unsupported implementation details as decisions for engineering instead of pretending they are settled.",
                    ].join(" ")
                  : [
                      "Return oneLiner as a short label for the message.",
                      "Return summary as a short informal text message to teammates, 2 to 4 sentences, conversational and easy to paste into a group chat.",
                      "Explain the idea, why it matters, and the intended outcome without headings or product-management jargon.",
                    ].join(" "),
                `IdeaModel: ${JSON.stringify(parsed.data.idea)}`,
              ].join("\n"),
            },
          ],
        },
      ],
      text: { format: zodTextFormat(audienceCopySchema, "audience_copy") },
    });
    if (!response.output_parsed) throw new Error("No audience copy returned.");
    return NextResponse.json(response.output_parsed);
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Audience rewrite failed.",
      },
      { status: 502 },
    );
  }
}
