import { describe, expect, it } from "vitest";
import type { IdeaModel } from "@/lib/synthesis/schema";
import {
  GRILL_QUESTION_MIN,
  lowestConfidenceField,
  shouldStopGrill,
  GRILL_QUESTION_CAP,
} from "./core";

function field(value: string, confidence: number) {
  return { value, confidence, evidenceRefs: [] };
}

function idea(confidence = 0.8): IdeaModel {
  return {
    title: field("Title", confidence),
    oneLiner: field("One line", confidence),
    summary: field("Summary", confidence),
    problem: field("Problem", confidence),
    targetUser: field("User", confidence),
    solution: field("Solution", confidence),
    coreWorkflow: field("Workflow", confidence),
    differentiator: field("Difference", confidence),
    desiredOutcome: field("Outcome", confidence),
    openDecisions: [],
    assumptions: [],
    evidence: [],
  };
}

describe("grill selection", () => {
  it("selects the lowest-confidence foundational field", () => {
    const model = idea();
    model.targetUser.confidence = 0.31;
    model.problem.confidence = 0.55;
    expect(lowestConfidenceField(model)).toBe("targetUser");
  });

  it("never stops before the minimum question count", () => {
    expect(shouldStopGrill(idea(1), GRILL_QUESTION_MIN - 1)).toBe(false);
  });

  it("stops once the minimum is met and every field clears the threshold", () => {
    expect(shouldStopGrill(idea(0.7), GRILL_QUESTION_MIN)).toBe(true);
  });

  it("continues when a foundational field is below threshold", () => {
    const model = idea();
    model.coreWorkflow.confidence = 0.69;
    expect(shouldStopGrill(model, 2)).toBe(false);
  });

  it("hard-stops at five questions", () => {
    expect(shouldStopGrill(idea(0.1), GRILL_QUESTION_CAP)).toBe(true);
  });
});
