import { ideaModelSchema, type IdeaModel } from "./schema";
import { ZodError } from "zod";

export type SynthesisProvider = () => Promise<unknown>;

export class SynthesisValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SynthesisValidationError";
  }
}

export async function synthesizeWithRetry(
  provider: SynthesisProvider,
): Promise<{ idea: IdeaModel; attempts: number }> {
  let lastError = "Model returned malformed output.";

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await provider();
      const parsed = ideaModelSchema.safeParse(raw);
      if (parsed.success) return { idea: parsed.data, attempts: attempt };
      lastError = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
    } catch (err) {
      if (!(err instanceof SyntaxError) && !(err instanceof ZodError)) {
        if (attempt === 2) throw err;
        continue;
      }
      lastError = err.message;
    }
  }

  throw new SynthesisValidationError(
    `Model returned malformed output after retry: ${lastError}`,
  );
}
