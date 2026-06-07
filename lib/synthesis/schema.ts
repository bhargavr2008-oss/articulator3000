import { z } from "zod";

export const transcriptSegmentSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  final: z.boolean(),
  at: z.number().int().min(0),
});

export const keyframeSchema = z.object({
  id: z.string().min(1),
  imageDataUrl: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/),
  at: z.number().int().min(0),
  reason: z.string().min(1),
});

export const synthesisRequestSchema = z.object({
  transcript: z.array(transcriptSegmentSchema).max(250),
  typedNotes: z.string().max(12_000),
  keyframes: z.array(keyframeSchema).max(8),
});

export const evidenceRefSchema = z.object({
  sourceId: z.string().min(1),
  quote: z.string(),
});

export const understandingFieldSchema = z.object({
  value: z.string(),
  confidence: z.number().min(0).max(1),
  evidenceRefs: z.array(evidenceRefSchema),
});

export const evidenceItemSchema = z.object({
  id: z.string().min(1),
  source: z.enum(["transcript", "keyframe", "typed_note"]),
  timestampMs: z.number().int().min(0).nullable(),
  summary: z.string(),
});

export const ideaModelSchema = z.object({
  title: understandingFieldSchema,
  oneLiner: understandingFieldSchema,
  summary: understandingFieldSchema,
  problem: understandingFieldSchema,
  targetUser: understandingFieldSchema,
  solution: understandingFieldSchema,
  coreWorkflow: understandingFieldSchema,
  differentiator: understandingFieldSchema,
  desiredOutcome: understandingFieldSchema,
  openDecisions: z.array(z.string()),
  assumptions: z.array(z.string()),
  evidence: z.array(evidenceItemSchema),
});

export type TranscriptSegmentInput = z.infer<typeof transcriptSegmentSchema>;
export type KeyframeInput = z.infer<typeof keyframeSchema>;
export type SynthesisRequest = z.infer<typeof synthesisRequestSchema>;
export type UnderstandingField = z.infer<typeof understandingFieldSchema>;
export type IdeaModel = z.infer<typeof ideaModelSchema>;
