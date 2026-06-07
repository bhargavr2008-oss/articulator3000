import { z } from "zod";
import { ideaModelSchema } from "@/lib/synthesis/schema";

export const audienceSchema = z.enum(["teammate", "technical-engineering"]);

export const audienceCopySchema = z.object({
  oneLiner: z.string(),
  summary: z.string(),
});

export const generateRequestSchema = z.object({
  idea: ideaModelSchema,
});

export const audienceRequestSchema = z.object({
  idea: ideaModelSchema,
  audience: audienceSchema,
});

export const visualRequestSchema = z.object({
  idea: ideaModelSchema,
  kind: z.enum(["hero", "sketch"]),
  sourceImageDataUrl: z.string().nullable(),
});

export type Audience = z.infer<typeof audienceSchema>;
export type AudienceCopy = z.infer<typeof audienceCopySchema>;
