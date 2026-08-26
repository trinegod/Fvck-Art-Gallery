import Link from "next/link";
import { ArrowUpRight, GitFork, Route } from "lucide-react";
import PolishedImage from "@/app/components/polished-image";
import type { WorldThread } from "@/lib/world-threads";

export default function ThreadCard({ thread }: { thread: WorldThread }) {
  const coverItems = thread.items.slice(0, 3);

  return (
    <article className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.025] transition-colors hover:border-cyan-300/30">
      <Link
        href={`/threads/${thread.slug}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300"
      >
        <div className="grid aspect-[4/3] grid-cols-3 gap-px overflow-hidden bg-black">
          {coverItems.map((item, index) => (
            <PolishedImage
              key={item.id}
              src={item.artwork.thumbSrc || item.artwork.src}
              alt={index === 0 ? `${thread.title} cover` : ""}
              loading="lazy"
              decoding="async"
              wrapperClassName="h-full min-w-0"
              className="size-full object-cover transition duration-500 group-hover:scale-[1.025]"
            />
          ))}
          {coverItems.length === 0 && (
            <div className="col-span-3 grid place-items-center bg-[radial-gradient(circle_at_50%_10%,rgba(103,232,249,.16),transparent_60%)] text-zinc-600">
              <Route className="size-8" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                {thread.itemCount} connected pieces
              </p>
              <h2 className="mt-2 text-xl font-medium tracking-tight text-white sm:text-2xl">
                {thread.title}
              </h2>
            </div>
            <ArrowUpRight
              className="mt-1 size-5 shrink-0 text-zinc-600 transition group-hover:text-cyan-200"
              aria-hidden="true"
            />
          </div>

          {thread.summary && (
            <p className="line-clamp-2 text-sm leading-6 text-zinc-400">
              {thread.summary}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4 text-xs text-zinc-500">
            <span>
              Curated by {thread.owner?.displayName || "NODEINE maker"}
            </span>
            {thread.forkedFromId && (
              <span className="inline-flex items-center gap-1.5 text-violet-300">
                <GitFork className="size-3" aria-hidden="true" />
                Forked lineage
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}
