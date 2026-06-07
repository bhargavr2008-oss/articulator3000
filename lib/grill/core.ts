import type { IdeaModel } from "@/lib/synthesis/schema";
import type { FoundationalField } from "./schema";

export const FOUNDATIONAL_FIELDS: FoundationalField[] = [
  "title",
  "oneLiner",
  "summary",
  "problem",
  "targetUser",
  "solution",
  "coreWorkflow",
  "differentiator",
  "desiredOutcome",
];

export const GRILL_CONFIDENCE_THRESHOLD = 0.7;
export const GRILL_QUESTION_MIN = 3;
export const GRILL_QUESTION_CAP = 5;

export function lowestConfidenceField(idea: IdeaModel) {
  return FOUNDATIONAL_FIELDS.reduce((lowest, field) =>
    idea[field].confidence < idea[lowest].confidence ? field : lowest,
  );
}

export function shouldStopGrill(idea: IdeaModel, questionCount: number) {
  if (questionCount < GRILL_QUESTION_MIN) return false;
  if (questionCount >= GRILL_QUESTION_CAP) return true;
  return FOUNDATIONAL_FIELDS.every(
    (field) => idea[field].confidence >= GRILL_CONFIDENCE_THRESHOLD,
  );
}
