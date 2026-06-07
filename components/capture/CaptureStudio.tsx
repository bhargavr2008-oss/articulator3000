"use client";

import { useCallback, useMemo, useState } from "react";
import AirDraw from "@/components/airdraw/AirDraw";
import ConfirmStage from "@/components/flow/ConfirmStage";
import GrillStage from "@/components/flow/GrillStage";
import ResultStage from "@/components/flow/ResultStage";
import {
  useRealtimeTranscription,
  type TranscriptSegment,
  type TranscriptionStatus,
} from "@/components/transcribe/useRealtimeTranscription";
import type { GrillQuestion, GrillTurnResult } from "@/lib/grill/schema";
import type { IdeaModel, KeyframeInput } from "@/lib/synthesis/schema";

type SubtitleOverlayProps = {
  status: TranscriptionStatus;
  error: string;
  segments: TranscriptSegment[];
};

function SubtitleOverlay({
  status,
  error,
  segments,
}: SubtitleOverlayProps) {
  const live = status === "live";
  const visible = segments
    .filter((segment) => segment.text.trim().length > 0)
    .slice(-2);

  return (
    <div className="airdraw__subtitles" aria-live="polite">
      {status === "connecting" && <p>Starting transcription...</p>}
      {status === "error" && <p>{error || "Transcription error."}</p>}
      {live && visible.length === 0 && <p>Explain the idea out loud.</p>}
      {visible.map((segment) => (
        <p key={segment.id} className={segment.final ? "" : "italic"}>
          {segment.text}
        </p>
      ))}
    </div>
  );
}

export default function CaptureStudio() {
  const [timelineOriginMs] = useState(Date.now);
  const [phase, setPhase] = useState<
    "capture" | "grill" | "confirm" | "result"
  >("capture");
  const [sessionId, setSessionId] = useState("");
  const [notes, setNotes] = useState("");
  const [keyframes, setKeyframes] = useState<KeyframeInput[]>([]);
  const [idea, setIdea] = useState<IdeaModel | null>(null);
  const [grillQuestion, setGrillQuestion] = useState<GrillQuestion | null>(
    null,
  );
  const [synthesisStatus, setSynthesisStatus] = useState<
    "idle" | "loading" | "error" | "success"
  >("idle");
  const [synthesisError, setSynthesisError] = useState("");
  const transcription = useRealtimeTranscription(timelineOriginMs);

  const selectedKeyframes = useMemo(() => keyframes.slice(-4), [keyframes]);
  const onKeyframe = useCallback((frame: KeyframeInput) => {
    setKeyframes((current) => [...current, frame].slice(-12));
  }, []);

  const startExplaining = useCallback(async () => {
    if (
      transcription.status === "live" ||
      transcription.status === "connecting"
    ) {
      return;
    }
    await transcription.start();
  }, [transcription]);

  const synthesize = useCallback(async () => {
    const usableTranscript = transcription.segments.filter(
      (segment) => segment.text.trim().length > 0,
    );
    if (
      usableTranscript.length === 0 &&
      notes.trim().length === 0 &&
      selectedKeyframes.length === 0
    ) {
      setSynthesisStatus("error");
      setSynthesisError("Add some voice, notes, or a captured drawing first.");
      return;
    }

    if (transcription.status === "live") transcription.stop();
    setSynthesisStatus("loading");
    setSynthesisError("");
    setIdea(null);

    try {
      const sessionRes = await fetch("/api/sessions", { method: "POST" });
      if (!sessionRes.ok) throw new Error("Could not create a session.");
      const { id } = (await sessionRes.json()) as { id: string };
      setSessionId(id);

      const synthRes = await fetch(`/api/sessions/${id}/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: usableTranscript,
          typedNotes: notes,
          keyframes: selectedKeyframes,
        }),
      });
      const result = (await synthRes.json()) as {
        idea?: IdeaModel;
        error?: string;
      };
      if (!synthRes.ok || !result.idea) {
        throw new Error(result.error || "Synthesis failed.");
      }

      setIdea(result.idea);
      const grillRes = await fetch(`/api/sessions/${id}/grill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea: result.idea,
          questionCount: 0,
          previousQuestion: null,
          answer: null,
          keyframes: selectedKeyframes,
        }),
      });
      const grill = (await grillRes.json()) as GrillTurnResult & {
        error?: string;
      };
      if (!grillRes.ok)
        throw new Error(grill.error || "Could not start Grill.");
      setIdea(grill.idea);
      setSynthesisStatus("success");
      if (grill.done || !grill.nextQuestion) {
        setPhase("confirm");
      } else {
        setGrillQuestion(grill.nextQuestion);
        setPhase("grill");
      }
    } catch (err) {
      setSynthesisStatus("error");
      setSynthesisError(err instanceof Error ? err.message : String(err));
    }
  }, [notes, selectedKeyframes, transcription]);

  if (phase === "grill" && idea && grillQuestion) {
    return (
      <GrillStage
        sessionId={sessionId}
        idea={idea}
        initialQuestion={grillQuestion}
        keyframes={selectedKeyframes}
        onKeyframe={onKeyframe}
        timelineOriginMs={timelineOriginMs}
        onComplete={(updatedIdea) => {
          setIdea(updatedIdea);
          setPhase("confirm");
        }}
      />
    );
  }

  if (phase === "confirm" && idea) {
    return (
      <ConfirmStage
        idea={idea}
        onConfirm={async (confirmedIdea) => {
          const confirmResponse = await fetch(
            `/api/sessions/${sessionId}/confirm`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(confirmedIdea),
            },
          );
          if (!confirmResponse.ok) {
            throw new Error("Could not confirm interpretation.");
          }
          const response = await fetch(`/api/sessions/${sessionId}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idea: confirmedIdea }),
          });
          if (!response.ok) throw new Error("Could not generate result.");
          setIdea(confirmedIdea);
          setPhase("result");
        }}
      />
    );
  }

  if (phase === "result" && idea) {
    return (
      <ResultStage
        sessionId={sessionId}
        initialIdea={idea}
        sourceImageDataUrl={selectedKeyframes.at(-1)?.imageDataUrl ?? null}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-7xl flex-col gap-4 px-4 py-4">
      <section className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-950">
        <AirDraw
          onKeyframe={onKeyframe}
          timelineOriginMs={timelineOriginMs}
          startLabel="Start explaining idea"
          onStartRequested={startExplaining}
          captionOverlay={
            <SubtitleOverlay
              status={transcription.status}
              error={transcription.error}
              segments={transcription.segments}
            />
          }
          showHud={false}
          showTuning={false}
          compact
        />
      </section>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-stone-300">
            Type anything the mic misses
          </span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            placeholder="Extra details, corrections, labels for what you drew..."
            className="resize-y rounded-xl border border-stone-700 bg-stone-950 p-4 text-sm text-stone-100 outline-none focus:border-indigo-500"
          />
        </label>

        <section className="flex flex-col gap-2 rounded-xl border border-stone-800 bg-stone-900/60 p-4 lg:w-72">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>{transcription.segments.length} transcript bits</span>
            <span>{selectedKeyframes.length} frames</span>
          </div>
          <button
            onClick={synthesize}
            disabled={synthesisStatus === "loading"}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-60"
          >
            {synthesisStatus === "loading" && (
              <span className="loading-spinner" />
            )}
            {synthesisStatus === "loading" ? "Starting grill..." : "I'm done"}
          </button>
          {synthesisStatus === "error" && (
            <p className="text-xs text-rose-300">{synthesisError}</p>
          )}
        </section>
      </div>
    </main>
  );
}
