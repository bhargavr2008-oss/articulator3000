import Link from "next/link";

const FEATURES = [
  {
    label: "1. Capture",
    description:
      "Talk, type, and pinch your fingers to draw directly over the webcam.",
  },
  {
    label: "2. Clarify",
    description:
      "A confidence-driven Grill asks only the questions that sharpen the idea.",
  },
  {
    label: "3. Share",
    description:
      "Get concept visuals, teammate-ready copy, and a technical engineering brief.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-svh max-w-6xl flex-col px-6 py-8 sm:px-8">
      <nav className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-[0.22em] text-stone-400">
          INDYHAX 2026
        </p>
        <span className="rounded-full border border-emerald-900 bg-emerald-950/50 px-3 py-1 text-xs font-medium text-emerald-300">
          Multimodal idea capture
        </span>
      </nav>

      <section className="flex flex-1 flex-col justify-center py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">
          Ideas are easier to show than explain
        </p>
        <h1 className="mt-5 max-w-4xl text-5xl font-bold tracking-tight text-balance sm:text-7xl">
          Turn hand-waving into something everyone understands.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-300 sm:text-xl">
          The Articulator 3000 combines your voice, notes, and air-drawn
          gestures, asks a few sharp questions, then produces a polished concept
          package.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link
            href="/capture"
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-400"
          >
            Start articulating
          </Link>
          <p className="text-sm text-stone-500">
            Camera and microphone are requested only when you begin.
          </p>
        </div>

        <div className="mt-14 grid gap-3 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.label}
              className="rounded-2xl border border-stone-800 bg-stone-900/50 p-5"
            >
              <h2 className="text-sm font-semibold text-emerald-300">
                {feature.label}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-400">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
