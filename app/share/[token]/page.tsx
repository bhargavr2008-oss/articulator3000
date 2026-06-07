import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readShare } from "@/lib/share/store";

type SharePageProps = { params: Promise<{ token: string }> };

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  const { token } = await params;
  const snapshot = await readShare(token);
  if (!snapshot) return { title: "Shared idea not found" };
  return {
    title: snapshot.idea.title.value,
    description: snapshot.audienceCopy.summary,
    robots: { index: false },
    openGraph: {
      title: snapshot.idea.title.value,
      description: snapshot.audienceCopy.summary,
      images: [`/share/${token}/card.svg`],
    },
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const snapshot = await readShare(token);
  if (!snapshot) notFound();

  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col gap-8 px-5 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">
          Temporary shared idea
        </p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          {snapshot.idea.title.value}
        </h1>
        <p className="max-w-3xl text-lg leading-relaxed text-stone-300">
          {snapshot.audienceCopy.oneLiner}
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <figure className="overflow-hidden rounded-xl border border-stone-800 bg-stone-900">
          {snapshot.hero.imageDataUrl ? (
            <img
              src={snapshot.hero.imageDataUrl}
              alt=""
              className="aspect-[3/2] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[3/2] items-center justify-center text-stone-500">
              Hero image unavailable
            </div>
          )}
          <figcaption className="px-4 py-3 text-sm text-stone-400">
            Hero concept
          </figcaption>
        </figure>
        <figure className="overflow-hidden rounded-xl border border-stone-800 bg-stone-900">
          {snapshot.sketch.imageDataUrl ? (
            <img
              src={snapshot.sketch.imageDataUrl}
              alt=""
              className="aspect-[3/2] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[3/2] items-center justify-center text-stone-500">
              Sketch unavailable
            </div>
          )}
          <figcaption className="px-4 py-3 text-sm text-stone-400">
            Air-drawing cleaned up
          </figcaption>
        </figure>
      </section>

      <article className="grid gap-6 border-t border-stone-800 pt-8 md:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-stone-200">Summary</h2>
          <p className="leading-relaxed text-stone-400">
            {snapshot.audienceCopy.summary}
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-sm font-semibold text-stone-200">
            Open decisions
          </h2>
          {snapshot.idea.openDecisions.length ? (
            <ul className="list-disc space-y-1 pl-5 text-stone-400">
              {snapshot.idea.openDecisions.map((decision) => (
                <li key={decision}>{decision}</li>
              ))}
            </ul>
          ) : (
            <p className="text-stone-500">No unresolved decisions captured.</p>
          )}
        </section>
      </article>
    </main>
  );
}
