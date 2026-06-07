import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <p className="text-sm font-semibold tracking-[0.2em] text-stone-400">
        INDYHAX 2026
      </p>
      <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
        The Articulator 3000
      </h1>
      <p className="max-w-xl text-lg text-stone-300">
        Show, say, or draw your idea. Talk, type, and draw in the air with your
        finger — and turn it into something other people understand.
      </p>
      <div>
        <Link
          href="/capture"
          className="inline-block rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-500"
        >
          Start
        </Link>
      </div>
    </main>
  );
}
