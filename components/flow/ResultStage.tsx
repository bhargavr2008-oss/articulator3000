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
  { id: "teammate", label: "Teammates" },
  { id: "technical-engineering", label: "Technical engineering" },
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
          alt={title}
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

function imageFiles(assets: VisualAsset[]) {
  return assets.flatMap((asset, index) => {
    if (!asset.imageDataUrl) return [];
    const [header, b64] = asset.imageDataUrl.split(",");
    const mime = header.match(/data:(.*?);/)?.[1] ?? "image/jpeg";
    const bytes = Uint8Array.from(atob(b64), (char) => char.charCodeAt(0));
    return [
      new File([bytes], index === 0 ? "concept.jpg" : "drawing.jpg", {
        type: mime,
      }),
    ];
  });
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
  const idea = initialIdea;
  const [audience, setAudience] = useState<Audience>("teammate");
  const [audienceCopies, setAudienceCopies] = useState<
    Partial<Record<Audience, AudienceCopy>>
  >({
    teammate: {
      oneLiner: initialIdea.oneLiner.value,
      summary: `Hey team - quick idea: ${initialIdea.oneLiner.value} ${initialIdea.summary.value}`,
    },
  });
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [audienceError, setAudienceError] = useState("");
  const [packageNotice, setPackageNotice] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [shareError, setShareError] = useState("");
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
    // Generate once from the approved model snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function switchAudience(next: Audience) {
    setAudience(next);
    setAudienceError("");
    setPackageNotice("");
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
      setPackageNotice("Share link created.");
      return absoluteUrl;
    } catch (err) {
      setShareError(err instanceof Error ? err.message : String(err));
      return "";
    }
  }

  async function copyForChat() {
    const url = shareUrl || (await createShare());
    if (!url) return;
    await navigator.clipboard.writeText(`${activeCopy.summary}\n\n${url}`);
    setPackageNotice("Message and share link copied.");
  }

  async function copyText() {
    const text =
      audience === "technical-engineering"
        ? `Subject: ${activeCopy.oneLiner}\n\n${activeCopy.summary}`
        : activeCopy.summary;
    await navigator.clipboard.writeText(text);
    setPackageNotice(
      audience === "technical-engineering"
        ? "Engineering email copied."
        : "Teammate message copied.",
    );
  }

  async function shareTeammatePackage() {
    const files = imageFiles([hero, sketch]);
    if (files.length < 2) return;
    const url = shareUrl || (await createShare());
    if (!url) return;

    if (
      navigator.share &&
      (!navigator.canShare || navigator.canShare({ files }))
    ) {
      await navigator.share({ text: activeCopy.summary, url, files });
      return;
    }

    await navigator.clipboard.writeText(`${activeCopy.summary}\n\n${url}`);
    for (const file of files) {
      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(file);
      anchor.download = file.name;
      anchor.click();
      URL.revokeObjectURL(anchor.href);
    }
    setPackageNotice("Message copied and both images downloaded.");
  }

  async function deleteShare() {
    if (!shareUrl) return;
    const token = shareUrl.split("/").pop();
    if (!token) return;
    await fetch(`/api/share/${token}`, { method: "DELETE" });
    setShareUrl("");
    setPackageNotice("Share link deleted.");
  }

  const visualsReady = hero.status === "ready" && sketch.status === "ready";
  const visualsSettled =
    hero.status !== "pending" && sketch.status !== "pending";

  return (
    <main className="mx-auto min-h-svh max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <FlowStepper active="Result" />
        <button
          onClick={createShare}
          disabled={!visualsSettled}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-50"
        >
          {visualsSettled ? "Create share link" : "Preparing share..."}
        </button>
      </div>

      <header className="mt-12 max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
          Approved results
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">
          {idea.title.value}
        </h1>
        <p className="mt-4 text-xl leading-relaxed text-stone-300">
          {idea.oneLiner.value}
        </p>
      </header>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <VisualPanel
          title="Concept image"
          asset={hero}
          onRetry={() => generateVisual("hero")}
        />
        <VisualPanel
          title="Cleaned-up drawing"
          asset={sketch}
          onRetry={() => generateVisual("sketch")}
        />
      </section>

      <section className="mt-8 rounded-2xl border border-stone-800 bg-stone-900/50 p-5 sm:p-7">
        <div className="inline-flex rounded-lg border border-stone-700 bg-stone-950 p-1">
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

        {audienceLoading ? (
          <p className="mt-8 text-stone-400">Writing the engineering spec...</p>
        ) : audience === "teammate" ? (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-stone-200">
              Informal text message
            </h2>
            <p className="mt-3 max-w-3xl whitespace-pre-wrap text-lg leading-relaxed text-stone-300">
              {activeCopy.summary}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={copyText}
                className="rounded-lg border border-stone-600 px-4 py-2.5 text-sm font-semibold hover:bg-stone-800"
              >
                Copy message
              </button>
              <button
                onClick={shareTeammatePackage}
                disabled={!visualsReady}
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
              >
                {visualsReady
                  ? "Share message + 2 images"
                  : "Waiting for both images..."}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-stone-200">
              Full engineering spec email
            </h2>
            <p className="mt-4 rounded-lg border border-stone-700 bg-stone-950 px-4 py-3 text-sm text-stone-300">
              <span className="font-semibold text-stone-100">Subject:</span>{" "}
              {activeCopy.oneLiner}
            </p>
            <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-stone-700 bg-stone-950 p-5 font-sans text-sm leading-7 text-stone-300">
              {activeCopy.summary}
            </pre>
            <button
              onClick={copyText}
              className="mt-5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Copy email
            </button>
          </div>
        )}

        {audienceError && (
          <p className="mt-4 text-sm text-rose-300">{audienceError}</p>
        )}
        {packageNotice && (
          <p className="mt-4 text-sm text-emerald-300">{packageNotice}</p>
        )}
        {shareError && (
          <p className="mt-4 text-sm text-rose-300">{shareError}</p>
        )}
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {RESULT_FIELDS.map(([key, label]) => (
          <article
            key={key}
            className="rounded-xl border border-stone-800 bg-stone-900/40 p-5"
          >
            <h2 className="text-sm font-semibold text-stone-200">{label}</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-400">
              {idea[key].value}
            </p>
          </article>
        ))}
      </section>

      {shareUrl && (
        <section className="fixed inset-x-4 bottom-4 z-20 mx-auto max-w-xl rounded-xl border border-stone-700 bg-stone-900 p-5 shadow-2xl">
          <p className="text-sm font-semibold">Temporary share link ready</p>
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
              onClick={deleteShare}
              className="rounded-lg border border-rose-900 px-3 py-2 text-sm text-rose-300"
            >
              Delete now
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
