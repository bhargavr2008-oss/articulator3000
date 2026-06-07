"use client";

import { useState } from "react";
import FlowStepper from "@/components/flow/FlowStepper";
import type { IdeaModel } from "@/lib/synthesis/schema";

const FIELDS = [
  ["title", "Title"],
  ["oneLiner", "One-liner"],
  ["summary", "Summary"],
  ["problem", "Problem"],
  ["targetUser", "Target user"],
  ["solution", "Solution"],
  ["coreWorkflow", "Core workflow"],
  ["differentiator", "Differentiator"],
  ["desiredOutcome", "Desired outcome"],
] as const;

export default function ConfirmStage({
  idea: initialIdea,
  onConfirm,
}: {
  idea: IdeaModel;
  onConfirm: (idea: IdeaModel) => Promise<void>;
}) {
  const [idea, setIdea] = useState(initialIdea);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  return (
    <main className="mx-auto min-h-svh max-w-5xl px-5 py-10">
      <FlowStepper active="Confirm" />

      <header className="mb-8 mt-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
          Grill complete
        </p>
        <h1 className="text-4xl font-bold tracking-tight">
          Review the summary
        </h1>
        <p className="mt-3 text-stone-400">
          Correct anything that is off, then approve it.
        </p>
      </header>

      <section className="grid gap-x-8 gap-y-6 md:grid-cols-2">
        {FIELDS.map(([key, label]) => (
          <label key={key} className={key === "summary" ? "md:col-span-2" : ""}>
            <span className="mb-2 flex items-center justify-between text-sm font-semibold text-stone-300">
              {label}
            </span>
            <textarea
              value={idea[key].value}
              rows={key === "summary" ? 4 : 3}
              onChange={(event) =>
                setIdea((current) => ({
                  ...current,
                  [key]: { ...current[key], value: event.target.value },
                }))
              }
              className="w-full resize-y rounded-lg border border-stone-700 bg-stone-950 p-3 text-sm leading-relaxed outline-none focus:border-emerald-500"
            />
          </label>
        ))}
      </section>

      <section className="mt-8 border-t border-stone-800 pt-6">
        <h2 className="mb-3 text-sm font-semibold text-amber-300">
          {idea.openDecisions.length
            ? "Open decisions"
            : "Resolved assumptions"}
        </h2>
        {idea.openDecisions.length ? (
          <textarea
            value={idea.openDecisions.join("\n")}
            onChange={(event) =>
              setIdea((current) => ({
                ...current,
                openDecisions: event.target.value
                  .split("\n")
                  .map((value) => value.trim())
                  .filter(Boolean),
              }))
            }
            rows={4}
            className="w-full resize-y rounded-lg border border-stone-700 bg-stone-950 p-3 text-sm outline-none focus:border-amber-500"
          />
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm text-stone-400">
            {(idea.assumptions.length
              ? idea.assumptions
              : [
                  "The Grill resolved remaining ambiguity into the interpretation above.",
                ]
            ).map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        )}
      </section>

      <button
        onClick={async () => {
          setLoading(true);
          setError("");
          try {
            await onConfirm(idea);
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setLoading(false);
          }
        }}
        disabled={loading}
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {loading && <span className="loading-spinner" />}
        {loading ? "Generating results..." : "Approve"}
      </button>
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
    </main>
  );
}
