"use client";

import { useEffect, useMemo, useState } from "react";
import AirDraw from "@/components/airdraw/AirDraw";
import FlowStepper from "@/components/flow/FlowStepper";
import type { GrillQuestion, GrillTurnResult } from "@/lib/grill/schema";
import type { IdeaModel, KeyframeInput } from "@/lib/synthesis/schema";

type GrillStageProps = {
  sessionId: string;
  idea: IdeaModel;
  initialQuestion: GrillQuestion;
  keyframes: KeyframeInput[];
  onKeyframe: (frame: KeyframeInput) => void;
  timelineOriginMs: number;
  onComplete: (idea: IdeaModel) => void;
};

export default function GrillStage({
  sessionId,
  idea: initialIdea,
  initialQuestion,
  keyframes,
  onKeyframe,
  timelineOriginMs,
  onComplete,
}: GrillStageProps) {
  const [idea, setIdea] = useState(initialIdea);
  const [question, setQuestion] = useState(initialQuestion);
  const [questionCount, setQuestionCount] = useState(1);
  const [answer, setAnswer] = useState("");
  const [whyVisible, setWhyVisible] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [voiceStatus, setVoiceStatus] = useState<
    "idle" | "loading" | "playing" | "error"
  >("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let audio: HTMLAudioElement | null = null;

    async function speakQuestion() {
      setVoiceStatus("loading");
      try {
        const response = await fetch("/api/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: question.question }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Could not generate voiceover.");
        const url = URL.createObjectURL(await response.blob());
        audio = new Audio(url);
        audio.onended = () => {
          setVoiceStatus("idle");
          URL.revokeObjectURL(url);
        };
        setVoiceStatus("playing");
        await audio.play();
      } catch {
        if (!controller.signal.aborted) setVoiceStatus("error");
      }
    }

    void speakQuestion();
    return () => {
      controller.abort();
      audio?.pause();
    };
  }, [question]);

  const canSubmit = useMemo(
    () => answer.trim().length > 0 && status !== "loading",
    [answer, status],
  );

  async function submit(value = answer) {
    if (!value.trim()) return;
    setStatus("loading");
    setError("");
    try {
      const response = await fetch(`/api/sessions/${sessionId}/grill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          questionCount,
          previousQuestion: question,
          answer: value,
          keyframes,
        }),
      });
      const result = (await response.json()) as GrillTurnResult & {
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "Grill turn failed.");
      setIdea(result.idea);
      if (result.done || !result.nextQuestion) {
        onComplete(result.idea);
        return;
      }
      setQuestion(result.nextQuestion);
      setQuestionCount((count) => count + 1);
      setAnswer("");
      setWhyVisible(false);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <main className="mx-auto min-h-svh max-w-7xl px-4 py-4">
      <div className="mb-4">
        <FlowStepper active="Grill" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)] lg:items-start">
        <section className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-950">
          <AirDraw
            onKeyframe={onKeyframe}
            timelineOriginMs={timelineOriginMs}
            startLabel="Start camera & draw"
            showHud={false}
            showTuning={false}
            compact
            autoStart
          />
          <p className="px-5 pb-4 text-xs text-stone-500">
            Pinch to draw. Your latest frames are included with every answer.
          </p>
        </section>

        <section className="flex flex-col rounded-2xl border border-stone-800 bg-stone-900/50 p-5 lg:sticky lg:top-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Grill question {questionCount} · minimum 3
          </p>
          <h1 className="mt-4 text-2xl font-bold leading-tight sm:text-3xl">
            {question.question}
          </h1>
          {question.evidenceRef && (
            <p className="mt-3 text-sm text-cyan-300">
              Based on: {question.evidenceRef}
            </p>
          )}
          {question.mode === "redraw" && question.redrawPrompt && (
            <div className="mt-4 rounded-xl border border-cyan-900/70 bg-cyan-950/30 p-4">
              <p className="text-sm font-semibold text-cyan-200">
                Draw this while you answer
              </p>
              <p className="mt-1 text-sm text-cyan-100/80">
                {question.redrawPrompt}
              </p>
            </div>
          )}

          <textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            rows={7}
            autoFocus
            placeholder="Type your answer..."
            className="mt-6 w-full resize-y rounded-xl border border-stone-700 bg-stone-950 p-4 text-base outline-none focus:border-emerald-500"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setWhyVisible((visible) => !visible)}
              className="rounded-lg border border-stone-700 px-3 py-2 text-sm text-stone-300 hover:bg-stone-800"
            >
              Why this question?
            </button>
            {["I don't know yet", "That assumption is wrong"].map((escape) => (
              <button
                key={escape}
                onClick={() => submit(escape)}
                disabled={status === "loading"}
                className="rounded-lg border border-stone-700 px-3 py-2 text-sm text-stone-300 hover:bg-stone-800 disabled:opacity-50"
              >
                {escape}
              </button>
            ))}
          </div>
          {whyVisible && (
            <p className="mt-3 text-sm text-stone-400">{question.why}</p>
          )}

          <button
            onClick={() => submit()}
            disabled={!canSubmit}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
          >
            {status === "loading" && <span className="loading-spinner" />}
            {status === "loading" ? "Thinking..." : "Answer"}
          </button>
          {status === "error" && (
            <p className="mt-3 text-sm text-rose-300">{error}</p>
          )}
          {(voiceStatus === "loading" || voiceStatus === "playing") && (
            <p className="mt-3 text-xs text-stone-500">
              {voiceStatus === "loading"
                ? "Preparing spoken question..."
                : "Reading question aloud..."}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
