import Link from "next/link";
import {
  ArrowDown,
  GitFork,
  MessageCircleMore,
  Network,
  Route,
  Waypoints,
} from "lucide-react";
import ArtworkMedia, {
  isVideoArtwork,
} from "@/app/components/artwork-media";
import MobileAppNavigation from "@/app/components/mobile-app-navigation";
import PolishedImage from "@/app/components/polished-image";
import {
  appendFeedReturnContext,
  buildFeedReturnHref,
  type FeedReturnContext,
} from "@/lib/feed-return";
import {
  worldThreadDescription,
  worldThreadItemAnchor,
  worldThreadRelationLabel,
  type WorldThread,
} from "@/lib/world-threads";
import ThreadHeader from "../thread-header";
import ThreadCard from "../thread-card";
import ThreadActions from "./thread-actions";
import ThreadLineageMap from "./thread-lineage-map";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function ThreadDetail({
  thread,
  responses = [],
  feedReturn = null,
}: {
  thread: WorldThread;
  responses?: WorldThread[];
  feedReturn?: FeedReturnContext | null;
}) {
  const firstArtwork = thread.items[0]?.artwork;
  const lastArtwork = thread.items.at(-1)?.artwork;
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
            href={feedReturn ? buildFeedReturnHref(feedReturn) : "/threads"}
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300 hover:text-cyan-200"
          >
            <Network className="size-3.5" aria-hidden="true" />
            {feedReturn ? "Back to feed" : "World Threads"}
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
                    <Link href={feedReturn ? appendFeedReturnContext(`/artwork/${item.artwork.id}`, feedReturn) : `/artwork/${item.artwork.id}`} className="group relative min-h-[48svh] overflow-hidden bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300 sm:min-h-[62svh] lg:min-h-[720px]">
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
                      <Link href={feedReturn ? appendFeedReturnContext(`/artwork/${item.artwork.id}`, feedReturn) : `/artwork/${item.artwork.id}`} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-zinc-500 hover:text-white">
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

        <section
          aria-labelledby="branch-point-title"
          className="mt-14 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(103,232,249,.10),transparent_58%)] px-5 py-10 sm:mt-20 sm:px-8 sm:py-14"
        >
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300">
              Branch point
            </p>
            <h2 id="branch-point-title" className="mt-4 text-2xl font-medium text-white sm:text-3xl">
              Which truth should this Chronicle follow?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-400">
              The canon remains intact. Choose a route into its sequence, its visual DNA, or the public interpretations it inspired.
            </p>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {firstArtwork && (
              <Link
                href={`#${worldThreadItemAnchor(firstArtwork.id)}`}
                className="group rounded-2xl border border-white/10 bg-black/30 p-5 transition hover:border-cyan-300/35 hover:bg-cyan-300/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                <Route className="size-5 text-cyan-300" aria-hidden="true" />
                <span className="mt-5 block text-base font-medium text-white">Continue canon</span>
                <span className="mt-2 block text-xs leading-5 text-zinc-500">
                  Return to the origin and follow the published sequence.
                </span>
              </Link>
            )}
            {lastArtwork && (
              <Link
                href={feedReturn ? appendFeedReturnContext(`/artwork/${lastArtwork.id}#signal-trail`, feedReturn) : `/artwork/${lastArtwork.id}#signal-trail`}
                className="group rounded-2xl border border-white/10 bg-black/30 p-5 transition hover:border-violet-300/35 hover:bg-violet-300/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
              >
                <Waypoints className="size-5 text-violet-300" aria-hidden="true" />
                <span className="mt-5 block text-base font-medium text-white">Follow visual echo</span>
                <span className="mt-2 block text-xs leading-5 text-zinc-500">
                  Leave the sequence through the final piece&apos;s Signal Trail.
                </span>
              </Link>
            )}
            <Link
              href="#creator-responses"
              className="group rounded-2xl border border-white/10 bg-black/30 p-5 transition hover:border-amber-300/35 hover:bg-amber-300/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <MessageCircleMore className="size-5 text-amber-300" aria-hidden="true" />
              <span className="mt-5 block text-base font-medium text-white">Enter responses</span>
              <span className="mt-2 block text-xs leading-5 text-zinc-500">
                {responses.length
                  ? `Explore ${responses.length} public ${responses.length === 1 ? "branch" : "branches"} from other makers.`
                  : "See where the first public response will appear."}
              </span>
            </Link>
          </div>

          <p className="mx-auto mt-7 max-w-xl text-center text-xs leading-5 text-zinc-500">
            {thread.allowForks
              ? "Fork this Chronicle to publish your own response. Its source path and every maker credit stay attached."
              : "This curator has kept the path complete as published. Existing public responses remain connected below."}
          </p>
        </section>

        <section
          id="creator-responses"
          aria-labelledby="creator-responses-title"
          className="scroll-mt-8 pt-14 sm:pt-20"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-300">
                Public branches
              </p>
              <h2 id="creator-responses-title" className="mt-3 text-3xl font-light tracking-tight text-white sm:text-4xl">
                Creator responses
              </h2>
            </div>
            <p className="text-sm text-zinc-500">
              {responses.length} published {responses.length === 1 ? "response" : "responses"}
            </p>
          </div>

          {responses.length ? (
            <div className="mt-7 grid gap-5 lg:grid-cols-2">
              {responses.map((response) => (
                <ThreadCard key={response.id} thread={response} />
              ))}
            </div>
          ) : (
            <div className="mt-7 rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center">
              <GitFork className="mx-auto size-6 text-zinc-600" aria-hidden="true" />
              <p className="mt-4 text-sm text-zinc-400">No public responses have branched from this Chronicle yet.</p>
              <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-zinc-600">
                {thread.allowForks
                  ? "Use Fork this path above to preserve the canon, change the interpretation, and become the first response."
                  : "The curator is not accepting new forks from this path."}
              </p>
            </div>
          )}
        </section>
      </section>

      <MobileAppNavigation />
    </main>
  );
}
