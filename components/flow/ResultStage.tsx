"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FlowStepper from "./FlowStepper";
import type { Audience, AudienceCopy } from "@/lib/artifacts/schema";
import type { VisualAsset } from "@/lib/share/schema";
import type { IdeaModel } from "@/lib/synthesis/schema";

const RESULT_FIELDS = [
  ["problem", "Problem"],
  ["solution", "Solution"],
  ["targetUser", "Target user"],
  ["coreWorkflow", "Core workflow"],
  ["differentiator", "Differentiator"],
  ["desiredOutcome", "Desired outcome"],
] as const;

const AUDIENCES: { id: Audience; label: string }[] = [
  { id: "teammate", label: "Teammate" },
  { id: "investor", label: "Investor" },
  { id: "coding-agent", label: "Coding agent" },
];

function VisualPanel({
  title,
  asset,
  onRetry,
}: {
  title: string;
  asset: VisualAsset;
  onRetry: () => void;
}) {
  return (
    <figure className="overflow-hidden rounded-xl border border-stone-800 bg-stone-900">
      {asset.status === "ready" && asset.imageDataUrl ? (
        <img
          src={asset.imageDataUrl}
          alt=""
          className="aspect-[3/2] w-full object-cover"
        />
      ) : asset.status === "error" ? (
        <div className="flex aspect-[3/2] flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm text-rose-300">{asset.error}</p>
          <button
            onClick={onRetry}
            className="rounded-lg border border-stone-600 px-3 py-2 text-sm hover:bg-stone-800"
          >
            Retry
          </button>
        </div>
      ) : (
        <div
          className="visual-shimmer aspect-[3/2]"
          aria-label="Generating image"
        />
      )}
      <figcaption className="px-4 py-3 text-sm text-stone-400">
        {title}
      </figcaption>
    </figure>
  );
}

export default function ResultStage({
  sessionId,
  initialIdea,
  sourceImageDataUrl,
}: {
  sessionId: string;
  initialIdea: IdeaModel;
  sourceImageDataUrl: string | null;
}) {
  const [idea, setIdea] = useState(initialIdea);
  const [audience, setAudience] = useState<Audience>("teammate");
  const [audienceCopies, setAudienceCopies] = useState<
    Partial<Record<Audience, AudienceCopy>>
  >({
    teammate: {
      oneLiner: initialIdea.oneLiner.value,
      summary: initialIdea.summary.value,
    },
  });
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [audienceError, setAudienceError] = useState("");
  const [hero, setHero] = useState<VisualAsset>({
    status: "pending",
    imageDataUrl: null,
    error: null,
  });
  const [sketch, setSketch] = useState<VisualAsset>({
    status: "pending",
    imageDataUrl: null,
    error: null,
  });
  const [shareUrl, setShareUrl] = useState("");
  const [shareError, setShareError] = useState("");
  const visualsStarted = useRef(false);

  const activeCopy = useMemo(
    () =>
      audienceCopies[audience] ?? {
        oneLiner: idea.oneLiner.value,
        summary: idea.summary.value,
      },
    [audience, audienceCopies, idea.oneLiner.value, idea.summary.value],
  );

  async function generateVisual(kind: "hero" | "sketch") {
    const setAsset = kind === "hero" ? setHero : setSketch;
    setAsset({ status: "pending", imageDataUrl: null, error: null });
    try {
      const response = await fetch(`/api/sessions/${sessionId}/visual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          kind,
          sourceImageDataUrl: kind === "sketch" ? sourceImageDataUrl : null,
        }),
      });
      const result = (await response.json()) as {
        imageDataUrl?: string;
        error?: string;
      };
      if (!response.ok || !result.imageDataUrl) {
        throw new Error(result.error || "Image generation failed.");
      }
      setAsset({
        status: "ready",
        imageDataUrl: result.imageDataUrl,
        error: null,
      });
    } catch (err) {
      setAsset({
        status: "error",
        imageDataUrl: null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  useEffect(() => {
    if (visualsStarted.current) return;
    visualsStarted.current = true;
    void generateVisual("hero");
    void generateVisual("sketch");
    // The first generation intentionally uses the confirmed model snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function switchAudience(next: Audience) {
    setAudience(next);
    setAudienceError("");
    if (audienceCopies[next]) return;
    setAudienceLoading(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/audience`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, audience: next }),
      });
      const result = (await response.json()) as AudienceCopy & {
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "Rewrite failed.");
      setAudienceCopies((current) => ({ ...current, [next]: result }));
    } catch (err) {
      setAudienceError(err instanceof Error ? err.message : String(err));
    } finally {
      setAudienceLoading(false);
    }
  }

  const blurb = useMemo(
    () => `${activeCopy.oneLiner}\n\n${activeCopy.summary}`,
    [activeCopy],
  );

  async function createShare() {
    setShareError("");
    try {
      const response = await fetch(`/api/sessions/${sessionId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          audienceCopy: activeCopy,
          hero,
          sketch,
        }),
      });
      const result = (await response.json()) as {
        url?: string;
        error?: string;
      };
      if (!response.ok || !result.url) {
        throw new Error(result.error || "Could not create share link.");
      }
      const absoluteUrl = new URL(
        result.url,
        window.location.origin,
      ).toString();
      setShareUrl(absoluteUrl);
      return absoluteUrl;
    } catch (err) {
      setShareError(err instanceof Error ? err.message : String(err));
      return "";
    }
  }

  async function copyForChat() {
    const url = shareUrl || (await createShare());
    if (!url) return;
    await navigator.clipboard.writeText(`${blurb}\n\n${url}`);
  }

  async function shareWithImages() {
    const files = [hero, sketch]
      .filter((asset) => asset.imageDataUrl)
      .map((asset, index) => {
        const [header, b64] = asset.imageDataUrl!.split(",");
        const mime = header.match(/data:(.*?);/)?.[1] ?? "image/jpeg";
        const bytes = Uint8Array.from(atob(b64), (char) => char.charCodeAt(0));
        return new File([bytes], index === 0 ? "hero.jpg" : "sketch.jpg", {
          type: mime,
        });
      });
    if (navigator.share && files.length) {
      await navigator.share({ text: blurb, url: shareUrl, files });
      return;
    }
    await copyForChat();
    for (const file of files) {
      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(file);
      anchor.download = file.name;
      anchor.click();
      URL.revokeObjectURL(anchor.href);
    }
  }

  async function deleteShare() {
    if (!shareUrl) return;
    const token = shareUrl.split("/").pop();
    await fetch(`/api/share/${token}`, { method: "DELETE" });
    setShareUrl("");
  }

  return (
    <main className="mx-auto min-h-svh max-w-6xl px-5 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <FlowStepper active="Result" />
        <button
          onClick={createShare}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Share
        </button>
      </div>

      <header className="mt-12 max-w-4xl">
        <input
          value={idea.title.value}
          onChange={(event) =>
            setIdea((current) => ({
              ...current,
              title: { ...current.title, value: event.target.value },
            }))
          }
          aria-label="Idea title"
          className="w-full bg-transparent text-4xl font-bold tracking-tight outline-none sm:text-6xl"
        />
        <p className="mt-4 text-xl leading-relaxed text-stone-300">
          {audienceLoading ? "Rewriting..." : activeCopy.oneLiner}
        </p>
      </header>

      <section className="mt-8">
        <p className="mb-2 text-xs font-semibold uppercase text-stone-500">
          Explain it to
        </p>
        <div className="inline-flex rounded-lg border border-stone-700 bg-stone-900 p-1">
          {AUDIENCES.map((option) => (
            <button
              key={option.id}
              onClick={() => switchAudience(option.id)}
              className={
                audience === option.id
                  ? "rounded-md bg-stone-700 px-3 py-2 text-sm text-white"
                  : "rounded-md px-3 py-2 text-sm text-stone-400 hover:text-white"
              }
            >
              {option.label}
            </button>
          ))}
        </div>
        {audienceError && (
          <p className="mt-2 text-sm text-rose-300">{audienceError}</p>
        )}
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <VisualPanel
          title="Hero concept"
          asset={hero}
          onRetry={() => generateVisual("hero")}
        />
        <VisualPanel
          title="Your air-drawing, cleaned up"
          asset={sketch}
          onRetry={() => generateVisual("sketch")}
        />
      </section>

      <section className="mt-10 border-t border-stone-800 pt-8">
        <h2 className="mb-3 text-sm font-semibold text-stone-200">Summary</h2>
        <p className="max-w-4xl text-lg leading-relaxed text-stone-400">
          {audienceLoading ? "Rewriting..." : activeCopy.summary}
        </p>
      </section>

      <section className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
        {RESULT_FIELDS.map(([key, label]) => (
          <label key={key}>
            <span className="mb-2 block text-sm font-semibold text-stone-200">
              {label}
            </span>
            <textarea
              value={idea[key].value}
              onChange={(event) =>
                setIdea((current) => ({
                  ...current,
                  [key]: { ...current[key], value: event.target.value },
                }))
              }
              rows={4}
              className="w-full resize-y border-0 border-l-2 border-stone-700 bg-transparent px-4 py-1 text-sm leading-relaxed text-stone-400 outline-none focus:border-emerald-500"
            />
          </label>
        ))}
      </section>

      <section className="mt-10 border-t border-stone-800 pt-8">
        <h2 className="mb-3 text-sm font-semibold text-amber-300">
          Open decisions
        </h2>
        {idea.openDecisions.length ? (
          <ul className="list-disc space-y-2 pl-5 text-stone-400">
            {idea.openDecisions.map((decision) => (
              <li key={decision}>{decision}</li>
            ))}
          </ul>
        ) : (
          <p className="text-stone-500">No unresolved decisions.</p>
        )}
      </section>

      {(shareUrl || shareError) && (
        <section className="fixed inset-x-4 bottom-4 z-20 mx-auto max-w-xl rounded-xl border border-stone-700 bg-stone-900 p-5 shadow-2xl">
          {shareError ? (
            <p className="text-sm text-rose-300">{shareError}</p>
          ) : (
            <>
              <p className="text-sm font-semibold">
                Temporary share link ready
              </p>
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block truncate text-sm text-cyan-300 underline"
              >
                {shareUrl}
              </a>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={copyForChat}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold"
                >
                  Copy for chat
                </button>
                <button
                  onClick={shareWithImages}
                  className="rounded-lg border border-stone-600 px-3 py-2 text-sm"
                >
                  Share with images
                </button>
                <button
                  onClick={deleteShare}
                  className="rounded-lg border border-rose-900 px-3 py-2 text-sm text-rose-300"
                >
                  Delete now
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}
