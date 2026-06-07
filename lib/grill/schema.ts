import { z } from "zod";
import { ideaModelSchema } from "@/lib/synthesis/schema";
import { keyframeSchema } from "@/lib/synthesis/schema";

export const foundationalFieldSchema = z.enum([
  "title",
  "oneLiner",
  "summary",
  "problem",
  "targetUser",
  "solution",
  "coreWorkflow",
  "differentiator",
  "desiredOutcome",
]);

export const grillQuestionSchema = z.object({
  field: foundationalFieldSchema,
  question: z.string().min(1),
  why: z.string().min(1),
  evidenceRef: z.string().nullable(),
  mode: z.enum(["answer", "redraw"]),
  redrawPrompt: z.string().nullable(),
});

export const grillTurnRequestSchema = z.object({
  idea: ideaModelSchema,
  questionCount: z.number().int().min(0).max(5),
  previousQuestion: grillQuestionSchema.nullable(),
  answer: z.string().max(8_000).nullable(),
  keyframes: z.array(keyframeSchema).max(8),
});

export const grillTurnResultSchema = z.object({
  idea: ideaModelSchema,
  nextQuestion: grillQuestionSchema.nullable(),
  done: z.boolean(),
});

export type FoundationalField = z.infer<typeof foundationalFieldSchema>;
export type GrillQuestion = z.infer<typeof grillQuestionSchema>;
export type GrillTurnRequest = z.infer<typeof grillTurnRequestSchema>;
export type GrillTurnResult = z.infer<typeof grillTurnResultSchema>;
