import OpenAI, { toFile } from "openai";
import { NextResponse, type NextRequest } from "next/server";
import { visualRequestSchema } from "@/lib/artifacts/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!match) throw new Error("Invalid source image.");
  return { mime: match[1], bytes: Buffer.from(match[2], "base64") };
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  const json = (await request.json().catch(() => null)) as unknown;
  const parsed = visualRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid visual payload" },
      { status: 400 },
    );
  }

  const { idea, kind, sourceImageDataUrl } = parsed.data;
  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2";

  try {
    const common = {
      model,
      size: "1536x1024" as const,
      quality: "low" as const,
      output_format: "jpeg" as const,
    };
    const prompt =
      kind === "hero"
        ? `Create a crisp editorial product concept image for "${idea.title.value}". Show the actual product or workflow clearly, not an abstract background. ${idea.solution.value}. Target user: ${idea.targetUser.value}. Differentiator: ${idea.differentiator.value}. No text, logos, gradients, or decorative UI mockups.`
        : `Create a clean reconstructed concept sketch for "${idea.title.value}". Use white background, precise dark ink, sparse cyan and magenta annotations, and preserve the spatial mechanism described here: ${idea.coreWorkflow.value}. ${idea.differentiator.value}. No photorealism and no decorative background.`;

    const response =
      kind === "sketch" && sourceImageDataUrl
        ? await (async () => {
            const source = decodeDataUrl(sourceImageDataUrl);
            return client.images.edit({
              ...common,
              image: await toFile(source.bytes, "capture.jpg", {
                type: source.mime,
              }),
              prompt:
                prompt +
                " Use the supplied webcam-and-ink capture as composition reference, but remove the person and background.",
            });
          })()
        : await client.images.generate({ ...common, prompt });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) throw new Error("Image generation returned no image.");
    return NextResponse.json({
      kind,
      imageDataUrl: `data:image/jpeg;base64,${b64}`,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Image generation failed.",
      },
      { status: 502 },
    );
  }
}
