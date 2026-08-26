import Link from "next/link";
import { ArrowDown, GitFork, Network, Route } from "lucide-react";
import ArtworkMedia, {
  isVideoArtwork,
} from "@/app/components/artwork-media";
import MobileAppNavigation from "@/app/components/mobile-app-navigation";
import PolishedImage from "@/app/components/polished-image";
import {
  worldThreadDescription,
  worldThreadItemAnchor,
  worldThreadRelationLabel,
  type WorldThread,
} from "@/lib/world-threads";
import ThreadHeader from "../thread-header";
import ThreadActions from "./thread-actions";
import ThreadLineageMap from "./thread-lineage-map";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function ThreadDetail({ thread }: { thread: WorldThread }) {
  const firstArtwork = thread.items[0]?.artwork;
  const firstArtworkPreview = firstArtwork
    ? firstArtwork.thumbSrc || (isVideoArtwork(firstArtwork.mediaType, firstArtwork.src)
      ? "/video-placeholder.svg"
      : firstArtwork.src)
    : null;

  return (
    <main className="min-h-screen bg-zinc-950 pb-[calc(7rem+env(safe-area-inset-bottom))] text-zinc-100 lg:pb-0">
      <ThreadHeader />

      <section className="relative isolate overflow-hidden border-b border-white/10 px-5 py-14 sm:px-8 sm:py-20">
        {firstArtworkPreview && (
          <div className="pointer-events-none absolute inset-0 -z-20 opacity-20">
            <PolishedImage
              src={firstArtworkPreview}
              alt=""
              wrapperClassName="size-full"
              className="size-full scale-110 object-cover blur-3xl"
            />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(9,9,11,.62),#09090b_92%)]" />

        <div className="mx-auto max-w-5xl">
          <Link
            href="/threads"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300 hover:text-cyan-200"
          >
            <Network className="size-3.5" aria-hidden="true" />
            World Threads
          </Link>

          {thread.forkedFromId && (
            <p className="mt-7 flex flex-wrap items-center gap-2 text-xs text-violet-200">
              <GitFork className="size-3.5" aria-hidden="true" />
              Forked with lineage intact from
              {thread.forkedFrom ? (
                <Link href={`/threads/${thread.forkedFrom.slug}`} className="font-medium underline decoration-violet-300/40 underline-offset-4 hover:text-white">
                  {thread.forkedFrom.title}
                </Link>
              ) : (
                <span className="font-medium">a source thread that is no longer public</span>
              )}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                <span>{thread.itemCount} connected pieces</span>
                <span aria-hidden="true">·</span>
                <time dateTime={thread.updatedAt}>Updated {formatDate(thread.updatedAt)}</time>
                {thread.visibility === "draft" && (
                  <span className="rounded-full border border-amber-300/25 bg-amber-300/8 px-2 py-1 text-amber-200">Owner draft</span>
                )}
              </div>
              <h1 className="mt-4 text-4xl font-light tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
                {thread.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg sm:leading-8">
                {worldThreadDescription(thread)}
              </p>
              <p className="mt-5 text-sm text-zinc-500">
                Curated by{" "}
                {thread.owner?.username ? (
                  <Link href={`/creator/${thread.owner.username}`} className="text-zinc-200 underline decoration-white/20 underline-offset-4 hover:text-cyan-200">
                    {thread.owner.displayName}
                  </Link>
                ) : (
                  <span className="text-zinc-300">{thread.owner?.displayName || "NODEINE maker"}</span>
                )}
              </p>
            </div>

            <ThreadActions
              threadId={thread.id}
              slug={thread.slug}
              ownerId={thread.ownerId}
              allowForks={thread.allowForks}
            />
          </div>
        </div>
      </section>

      <ThreadLineageMap thread={thread} />

      <section aria-label={`${thread.title} sequence`} className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="space-y-6 sm:space-y-10">
          {thread.items.map((item, index) => {
            const creator = item.artwork.collection?.creator;
            return (
              <article
                key={item.id}
                id={worldThreadItemAnchor(item.artwork.id)}
                className="relative scroll-mt-6 sm:scroll-mt-10"
              >
                {index > 0 && (
                  <div className="mb-6 flex items-center gap-3 sm:mb-10">
                    <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/12 to-white/5" />
                    <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/7 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">
                      <ArrowDown className="size-3" aria-hidden="true" />
                      {worldThreadRelationLabel(item.relationType)}
                    </span>
                    <span className="h-px flex-1 bg-gradient-to-l from-transparent via-white/12 to-white/5" />
                  </div>
                )}

                <div className={`grid overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.025] lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,.6fr)] ${index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}>
                  {isVideoArtwork(item.artwork.mediaType, item.artwork.src) ? (
                    <div className="relative min-h-[48svh] overflow-hidden bg-black sm:min-h-[62svh] lg:min-h-[720px]">
                      <ArtworkMedia
                        src={item.artwork.src}
                        posterSrc={item.artwork.thumbSrc}
                        mediaType={item.artwork.mediaType}
                        alt={item.artwork.title}
                        preload={index === 0 ? "metadata" : "none"}
                        wrapperClassName="absolute inset-0"
                        className="size-full object-contain"
                      />
                    </div>
                  ) : (
                    <Link href={`/artwork/${item.artwork.id}`} className="group relative min-h-[48svh] overflow-hidden bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300 sm:min-h-[62svh] lg:min-h-[720px]">
                      <ArtworkMedia
                        src={item.artwork.src}
                        posterSrc={item.artwork.thumbSrc}
                        mediaType={item.artwork.mediaType}
                        alt={item.artwork.title}
                        loading={index === 0 ? "eager" : "lazy"}
                        decoding="async"
                        fetchPriority={index === 0 ? "high" : "low"}
                        wrapperClassName="absolute inset-0"
                        imageClassName="size-full object-contain transition duration-500 group-hover:scale-[1.01]"
                      />
                    </Link>
                  )}

                  <div className="flex flex-col justify-between gap-10 p-6 sm:p-8 lg:p-10">
                    <div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">Step {String(index + 1).padStart(2, "0")}</span>
                        <span className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-500">
                          {index === 0 ? "Origin" : worldThreadRelationLabel(item.relationType)}
                        </span>
                      </div>
                      <h2 className="mt-5 text-2xl font-medium tracking-tight text-white sm:text-3xl">
                        {item.artwork.title}
                      </h2>
                      {item.note && (
                        <blockquote className="mt-6 border-l border-cyan-300/50 pl-4 text-base leading-7 text-zinc-300">
                          {item.note}
                        </blockquote>
                      )}
                    </div>

                    <div className="space-y-4 border-t border-white/10 pt-5 text-sm">
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">Original world</p>
                        <p className="mt-1 text-zinc-300">
                          {item.artwork.collection?.worldCode || "Visual world"} · {item.artwork.collection?.title || "NODEINE"}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-600">Maker credit</p>
                        {creator?.username ? (
                          <Link href={`/creator/${creator.username}`} className="mt-1 inline-flex text-cyan-300 hover:text-cyan-200">
                            {creator.displayName}
                          </Link>
                        ) : (
                          <p className="mt-1 text-zinc-300">{creator?.displayName || "NODEINE"}</p>
                        )}
                      </div>
                      <Link href={`/artwork/${item.artwork.id}`} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-zinc-500 hover:text-white">
                        Open original piece
                        <Route className="size-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-14 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(103,232,249,.10),transparent_58%)] px-6 py-12 text-center sm:mt-20 sm:py-16">
          <GitFork className="mx-auto size-7 text-cyan-300" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-medium text-white">The path ends here. The lineage does not.</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-zinc-400">
            {thread.allowForks
              ? "Fork this World Thread to carry its references into a new interpretation. The source path and every maker credit remain attached."
              : "This curator has kept the path complete as published. You can still open and save every original piece."}
          </p>
        </div>
      </section>

      <MobileAppNavigation />
    </main>
  );
}
