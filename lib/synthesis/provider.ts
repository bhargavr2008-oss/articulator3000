import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { ideaModelSchema, type SynthesisRequest } from "./schema";

const DEFAULT_SYNTHESIS_MODEL = "gpt-5.4-mini";

function formatTimestamp(ms: number) {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (total % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function buildEvidenceText(input: SynthesisRequest) {
  const transcript = input.transcript
    .filter((seg) => seg.text.trim().length > 0)
    .map(
      (seg) =>
        `- ${seg.id} @ ${formatTimestamp(seg.at)} (${seg.final ? "final" : "interim"}): ${seg.text}`,
    )
    .join("\n");

  const keyframes = input.keyframes
    .map(
      (frame) =>
        `- ${frame.id} @ ${formatTimestamp(frame.at)}: ${frame.reason}`,
    )
    .join("\n");

  return [
    "Transcript segments:",
    transcript || "- none",
    "",
    "Typed notes:",
    input.typedNotes.trim() || "- none",
    "",
    "Keyframes:",
    keyframes || "- none",
  ].join("\n");
}

export async function synthesizeIdeaWithOpenAI(
  apiKey: string,
  input: SynthesisRequest,
) {
  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_SYNTHESIS_MODEL ?? DEFAULT_SYNTHESIS_MODEL;

  const content = [
    {
      type: "input_text" as const,
      text: [
        "You are the synthesis engine for The Articulator 3000.",
        "Turn the creator's transcript, typed notes, and selected webcam+ink keyframes into the canonical IdeaModel.",
        "",
        "Rules:",
        "- Ground every foundational field in evidenceRefs using the provided transcript/keyframe/note ids.",
        "- Use confidence below 0.7 when the evidence is weak, contradictory, or inferred.",
        "- Keep contradictions explicit in openDecisions instead of hiding them.",
        "- The keyframes are the creator's own air-drawn shapes. Actively inspect the visible ink and ordinary objects/shapes in those frames.",
        "- Infer likely meaning from drawn shapes when there is visual evidence, even if narration is sparse. Use lower confidence for visual-only interpretations.",
        "- Do not add meta open decisions saying that keyframes need transcript narration or only show a hand. Ask concrete product questions instead.",
        "- Do not infer emotion, identity, sign language, or intent from body language.",
        "- Prefer concise, demo-ready language over product-management jargon.",
        "",
        buildEvidenceText(input),
      ].join("\n"),
    },
    ...input.keyframes.map((frame) => ({
      type: "input_image" as const,
      image_url: frame.imageDataUrl,
      detail: "low" as const,
    })),
  ];

  const response = await client.responses.parse({
    model,
    input: [{ role: "user", content }],
    text: {
      format: zodTextFormat(ideaModelSchema, "idea_model", {
        description: "Canonical understanding of the creator's idea.",
      }),
    },
  });

  if (response.output_parsed === null) {
    throw new Error("OpenAI returned no parsed IdeaModel.");
  }

  return { idea: response.output_parsed, model };
}
