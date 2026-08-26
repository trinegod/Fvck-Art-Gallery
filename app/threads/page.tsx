import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Network, Sparkles } from "lucide-react";
import MobileAppNavigation from "@/app/components/mobile-app-navigation";
import { getPublicWorldThreads } from "@/lib/world-threads";
import ThreadCard from "./thread-card";
import ThreadHeader from "./thread-header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "World Threads — NODEINE",
  description:
    "Follow human-curated paths through NODEINE artwork, visual worlds, and creative lineages.",
};

export default async function ThreadsPage() {
  const threads = await getPublicWorldThreads();

  return (
    <main className="min-h-screen bg-zinc-950 pb-[calc(7rem+env(safe-area-inset-bottom))] text-zinc-100 lg:pb-0">
      <ThreadHeader />

      <section className="relative overflow-hidden border-b border-white/10 px-5 py-16 sm:px-8 sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(103,232,249,.12),transparent_34%),radial-gradient(circle_at_84%_20%,rgba(167,139,250,.10),transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-200">
              <Network className="size-3.5" aria-hidden="true" />
              Human paths through the archive
            </div>
            <h1 className="mt-6 text-4xl font-light tracking-[-0.04em] text-white sm:text-6xl lg:text-7xl">
              Follow the reason one image leads to another.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
              World Threads connect references by palette, mood, composition,
              character, setting, motion, continuity, lore, and contrast—preserving the
              maker and world behind every piece.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/threads/new"
                className="nodeine-action inline-flex min-h-11 items-center gap-2 rounded-full bg-cyan-300 px-5 text-sm font-semibold text-zinc-950 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100"
              >
                Start a thread
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/saved"
                className="nodeine-action inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 text-sm font-medium text-zinc-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                Open your stash
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Live lineages
            </p>
            <h2 className="mt-2 text-2xl font-medium tracking-tight text-white sm:text-3xl">
              Paths worth wandering
            </h2>
          </div>
          <Sparkles className="size-5 text-cyan-300" aria-hidden="true" />
        </div>

        {threads.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {threads.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} />
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-white/15 bg-white/[0.02] px-6 py-16 text-center">
            <Network className="mx-auto size-8 text-zinc-600" aria-hidden="true" />
            <h2 className="mt-5 text-xl font-medium text-white">
              The first path is waiting to be drawn.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
              Choose two or more saved pieces, name the relationships between
              them, and publish the first World Thread.
            </p>
            <Link
              href="/threads/new"
              className="mt-6 inline-flex min-h-10 items-center rounded-full bg-cyan-300 px-5 text-sm font-semibold text-zinc-950 hover:bg-cyan-200"
            >
              Create the first thread
            </Link>
          </div>
        )}
      </section>

      <MobileAppNavigation />
    </main>
  );
}
