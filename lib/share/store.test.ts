import { describe, expect, it } from "vitest";
import type { IdeaModel } from "@/lib/synthesis/schema";
import { shareRequestSchema } from "./schema";
import { createShare, deleteShare, readShare } from "./store";

function field(value: string) {
  return { value, confidence: 0.8, evidenceRefs: [] };
}

const idea: IdeaModel = {
  title: field("Shared idea"),
  oneLiner: field("One line"),
  summary: field("Summary"),
  problem: field("Problem"),
  targetUser: field("User"),
  solution: field("Solution"),
  coreWorkflow: field("Workflow"),
  differentiator: field("Difference"),
  desiredOutcome: field("Outcome"),
  openDecisions: [],
  assumptions: [],
  evidence: [],
};

describe("share store", () => {
  it("freezes, reads, and deletes a snapshot", async () => {
    const token = await createShare({
      idea,
      audienceCopy: { oneLiner: "One line", summary: "Summary" },
      hero: { status: "pending", imageDataUrl: null, error: null },
      sketch: { status: "pending", imageDataUrl: null, error: null },
    });

    expect((await readShare(token))?.idea.title.value).toBe("Shared idea");
    expect(await deleteShare(token)).toBe(true);
    expect(await readShare(token)).toBeNull();
  });

  it("rejects non-image content before it can reach the share-card SVG", () => {
    const result = shareRequestSchema.safeParse({
      idea,
      audienceCopy: { oneLiner: "One line", summary: "Summary" },
      hero: {
        status: "ready",
        imageDataUrl: '"><script>alert(1)</script>',
        error: null,
      },
      sketch: { status: "pending", imageDataUrl: null, error: null },
    });

    expect(result.success).toBe(false);
  });
});
