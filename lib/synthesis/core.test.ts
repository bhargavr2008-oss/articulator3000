import { describe, expect, it } from "vitest";
import {
  SynthesisValidationError,
  synthesizeWithRetry,
  type SynthesisProvider,
} from "./core";
import type { IdeaModel } from "./schema";

function field(value: string, confidence = 0.8) {
  return {
    value,
    confidence,
    evidenceRefs: [{ sourceId: "t1", quote: "rough idea" }],
  };
}

const validIdea: IdeaModel = {
  title: field("Truck ladder mapper"),
  oneLiner: field("Turns rough gestures into a clear product concept."),
  summary: field(
    "A capture tool that combines voice, notes, and sketch frames.",
  ),
  problem: field("Teams lose context when ideas are explained informally."),
  targetUser: field("Hackathon builders"),
  solution: field("Capture multimodal evidence and synthesize an idea model."),
  coreWorkflow: field("Talk, air-draw, add notes, then synthesize."),
  differentiator: field("Webcam drawing is fused with narrated meaning."),
  desiredOutcome: field("A shareable concept teammates understand."),
  openDecisions: ["Whether the ladder is manual or powered."],
  assumptions: ["The creator wants a demo-friendly explanation."],
  evidence: [
    {
      id: "t1",
      source: "transcript",
      timestampMs: 4200,
      summary: "Creator described the rough idea.",
    },
  ],
};

describe("synthesizeWithRetry", () => {
  it("returns validated IdeaModel output on the first attempt", async () => {
    const result = await synthesizeWithRetry(async () => validIdea);
    expect(result.idea.title.value).toBe("Truck ladder mapper");
    expect(result.attempts).toBe(1);
  });

  it("retries once after malformed output", async () => {
    const responses: unknown[] = [{ title: "not the contract" }, validIdea];
    const provider: SynthesisProvider = async () => responses.shift();

    const result = await synthesizeWithRetry(provider);

    expect(result.idea).toEqual(validIdea);
    expect(result.attempts).toBe(2);
  });

  it("retries when SDK-side structured-output parsing throws", async () => {
    let calls = 0;
    const result = await synthesizeWithRetry(async () => {
      calls++;
      if (calls === 1) throw new SyntaxError("invalid JSON");
      return validIdea;
    });

    expect(result.idea).toEqual(validIdea);
    expect(result.attempts).toBe(2);
  });

  it("throws after two malformed outputs", async () => {
    await expect(
      synthesizeWithRetry(async () => ({ title: "still wrong" })),
    ).rejects.toBeInstanceOf(SynthesisValidationError);
  });
});
