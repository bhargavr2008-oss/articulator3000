import { z } from "zod";
import { audienceCopySchema } from "@/lib/artifacts/schema";
import { ideaModelSchema } from "@/lib/synthesis/schema";

export const generatedImageDataUrlSchema = z
  .string()
  .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/);

export const visualAssetSchema = z.object({
  status: z.enum(["pending", "ready", "error"]),
  imageDataUrl: generatedImageDataUrlSchema.nullable(),
  error: z.string().nullable(),
});

export const shareSnapshotSchema = z.object({
  idea: ideaModelSchema,
  audienceCopy: audienceCopySchema,
  hero: visualAssetSchema,
  sketch: visualAssetSchema,
  createdAt: z.string(),
});

export const shareRequestSchema = shareSnapshotSchema.omit({ createdAt: true });

export type VisualAsset = z.infer<typeof visualAssetSchema>;
export type ShareSnapshot = z.infer<typeof shareSnapshotSchema>;
