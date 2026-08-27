import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Clapperboard,
  Grid3X3,
  Network,
  Radio,
} from "lucide-react";
import ArtworkMedia, {
  isVideoArtwork,
} from "@/app/components/artwork-media";
import MobileAppNavigation from "@/app/components/mobile-app-navigation";
import PolishedImage from "@/app/components/polished-image";
import { getPublicWorld } from "@/lib/content-read-model";
import type { FeedInventoryItem } from "@/lib/feed";
import {
  appendFeedReturnContext,
  buildFeedReturnHref,
  parseFeedReturn,
  type FeedReturnContext,
  type FeedReturnQuery,
} from "@/lib/feed-return";
import type { SignalTrailArtwork } from "@/lib/signal-trails";
import { rankWorldSignals } from "@/lib/world-signals";
import type { WorldThread } from "@/lib/world-threads";

type WorldLayer = "gallery" | "threads" | "film" | "signals";

type WorldPageProps = {
  params: Promise<{ collectionId: string }>;
  searchParams: Promise<{ layer?: string | string[] } & FeedReturnQuery>;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const getWorld = cache(getPublicWorld);

export const dynamic = "force-dynamic";

function isWorldLayer(value: string | undefined): value is WorldLayer {
  return (
    value === "gallery" ||
    value === "threads" ||
    value === "film" ||
    value === "signals"
  );
}

function layerHref(
  collectionId: string,
  layer: WorldLayer,
  feedReturn: FeedReturnContext | null
) {
  const href = `/worlds/${collectionId}?layer=${layer}`;
  return feedReturn ? appendFeedReturnContext(href, feedReturn) : href;
}

function contextualHref(href: string, feedReturn: FeedReturnContext | null) {
  return feedReturn ? appendFeedReturnContext(href, feedReturn) : href;
}

function toSignalArtwork(artwork: FeedInventoryItem): SignalTrailArtwork {
  return {
    id: artwork.id,
    collectionId: artwork.collection.id,
    title: artwork.title,
    src: artwork.src,
    thumbSrc: artwork.thumbSrc,
    mediaType: artwork.mediaType,
    mood: artwork.mood,
    tags: artwork.tags,
  };
}

export async function generateMetadata({ params }: WorldPageProps): Promise<Metadata> {
  const { collectionId } = await params;
  if (!uuidPattern.test(collectionId)) {
    return { title: "World not found — NODEINE", robots: { index: false } };
  }
  const result = await getWorld(collectionId);
  if (!result) {
    return { title: "World not found — NODEINE", robots: { index: false } };
  }
  return {
    title: `${result.world.title} — NODEINE World`,
    description:
      result.world.summary ||
      `Enter ${result.world.title}, a connected visual World on NODEINE.`,
  };
}

export default async function WorldPage({ params, searchParams }: WorldPageProps) {
  const [{ collectionId }, query] = await Promise.all([params, searchParams]);
  if (!uuidPattern.test(collectionId)) notFound();
  const requestedLayer = Array.isArray(query.layer) ? query.layer[0] : query.layer;
  const layer = isWorldLayer(requestedLayer) ? requestedLayer : "gallery";
  const feedReturn = parseFeedReturn(query);
  const result = await getWorld(collectionId);
  if (!result) notFound();

  const { world, inventory } = result;
  const films = world.artworks.filter((artwork) =>
    isVideoArtwork(artwork.mediaType, artwork.src)
  );
  const rankedSignals = rankWorldSignals(
    world.artworks.map(toSignalArtwork),
    inventory.map(toSignalArtwork),
    8
  );
  const inventoryById = new Map(inventory.map((artwork) => [artwork.id, artwork]));
  const signals = rankedSignals.flatMap((signal) => {
    const artwork = inventoryById.get(signal.id);
    return artwork
      ? [
          {
            artwork,
            reason: signal.reason,
            sourceArtworkTitle: signal.sourceArtworkTitle,
          },
        ]
      : [];
  });
  const layerCounts: Record<WorldLayer, number> = {
    gallery: world.artworks.length,
    threads: world.threads.length,
    film: films.length,
    signals: signals.length,
  };
  const hero = world.artworks[0] ?? null;

  return (
    <main className="min-h-screen bg-zinc-950 pb-[calc(7rem+env(safe-area-inset-bottom))] text-zinc-100 lg:pb-0">
      <header className="border-b border-white/10 px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link
            href={feedReturn ? buildFeedReturnHref(feedReturn) : "/feed"}
            className="inline-flex min-h-11 items-center gap-2 text-sm text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to feed
          </Link>
          <Link
            href="/feed"
            className="inline-flex min-h-11 items-center text-sm font-light tracking-[0.24em] text-white hover:text-cyan-200"
          >
            NODEINE
          </Link>
        </div>
      </header>

      <section className="relative isolate overflow-hidden border-b border-white/10 px-5 py-16 sm:px-8 sm:py-24">
        {hero && (
          <div className="pointer-events-none absolute inset-0 -z-20 opacity-30">
            <PolishedImage
              src={hero.thumbSrc || hero.src}
              alt=""
              wrapperClassName="size-full"
              className="size-full scale-110 object-cover blur-2xl"
            />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(110deg,#09090b_18%,rgba(9,9,11,.80)_54%,#09090b_100%)]" />

        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-300">
              {world.worldCode || "Visual World"} · World Portal
            </p>
            <h1 className="mt-4 text-5xl font-light tracking-[-0.05em] text-white sm:text-7xl lg:text-8xl">
              {world.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg sm:leading-8">
              {world.summary ||
                "A connected visual World of artwork, films, Chronicles, and neighboring signals."}
            </p>
            {world.creator && (
              <p className="mt-5 text-sm text-zinc-500">
                Created by{" "}
                {world.creator.username ? (
                  <Link
                    href={`/creator/${world.creator.username}`}
                    className="text-zinc-200 underline decoration-white/20 underline-offset-4 hover:text-cyan-200"
                  >
                    {world.creator.displayName}
                  </Link>
                ) : (
                  <span className="text-zinc-200">{world.creator.displayName}</span>
                )}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-3xl border border-white/10 bg-black/35 p-3 backdrop-blur-xl">
            {(
              [
                ["gallery", "Pieces"],
                ["threads", "Chronicles"],
                ["film", "Films"],
                ["signals", "Signals"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="rounded-2xl border border-white/8 p-3">
                <p className="text-xl font-medium text-white">{layerCounts[key]}</p>
                <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.18em] text-zinc-500">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="sticky top-0 z-30 border-b border-white/10 bg-zinc-950/88 px-3 py-2 backdrop-blur-2xl sm:px-8">
        <nav
          className="mx-auto grid max-w-4xl grid-cols-4 gap-1"
          aria-label={`${world.title} layers`}
        >
          <LayerTab collectionId={world.id} layer="gallery" active={layer === "gallery"} icon={<Grid3X3 />} count={layerCounts.gallery} feedReturn={feedReturn}>
            Gallery
          </LayerTab>
          <LayerTab collectionId={world.id} layer="threads" active={layer === "threads"} icon={<Network />} count={layerCounts.threads} feedReturn={feedReturn}>
            Threads
          </LayerTab>
          <LayerTab collectionId={world.id} layer="film" active={layer === "film"} icon={<Clapperboard />} count={layerCounts.film} feedReturn={feedReturn}>
            Film
          </LayerTab>
          <LayerTab collectionId={world.id} layer="signals" active={layer === "signals"} icon={<Radio />} count={layerCounts.signals} feedReturn={feedReturn}>
            Signals
          </LayerTab>
        </nav>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-12">
        {layer === "gallery" && <GalleryLayer artworks={world.artworks} feedReturn={feedReturn} />}
        {layer === "film" && <FilmLayer films={films} feedReturn={feedReturn} />}
        {layer === "threads" && <ThreadLayer threads={world.threads} feedReturn={feedReturn} />}
        {layer === "signals" && <SignalLayer signals={signals} feedReturn={feedReturn} />}
      </section>

      <MobileAppNavigation />
    </main>
  );
}

function LayerTab({
  collectionId,
  layer,
  active,
  icon,
  count,
  feedReturn,
  children,
}: {
  collectionId: string;
  layer: WorldLayer;
  active: boolean;
  icon: React.ReactNode;
  count: number;
  feedReturn: FeedReturnContext | null;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={layerHref(collectionId, layer, feedReturn)}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-12 items-center justify-center gap-1.5 rounded-xl px-2 text-[10px] font-medium sm:gap-2 sm:text-sm ${
        active
          ? "bg-cyan-300/12 text-cyan-100"
          : "text-zinc-500 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span className="[&>svg]:size-4" aria-hidden="true">
        {icon}
      </span>
      <span>{children}</span>
      <span className="hidden font-mono text-[9px] text-zinc-600 sm:inline">{count}</span>
    </Link>
  );
}

function GalleryLayer({ artworks, feedReturn }: { artworks: FeedInventoryItem[]; feedReturn: FeedReturnContext | null }) {
  if (!artworks.length) {
    return (
      <EmptyLayer
        icon={<Grid3X3 />}
        title="This World is ready for its first piece."
        body="The portal exists, but no artwork has been published into its Gallery yet."
      />
    );
  }
  return (
    <div>
      <LayerHeading
        eyebrow="Complete World"
        title="Gallery"
        body="Every published piece remains attached to its World and maker."
      />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {artworks.map((artwork, index) => (
          <ArtworkTile key={artwork.id} artwork={artwork} eager={index < 2} feedReturn={feedReturn} />
        ))}
      </div>
    </div>
  );
}

function FilmLayer({ films, feedReturn }: { films: FeedInventoryItem[]; feedReturn: FeedReturnContext | null }) {
  if (!films.length) {
    return (
      <EmptyLayer
        icon={<Clapperboard />}
        title="No films have entered this World yet."
        body="The layer stays honest until a published video belongs here."
      />
    );
  }
  return (
    <div>
      <LayerHeading
        eyebrow="Motion layer"
        title="Film"
        body="Moving studies and cinematic fragments from this World."
      />
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {films.map((film) => (
          <article key={film.id} className="overflow-hidden rounded-3xl border border-white/10 bg-black">
            <ArtworkMedia
              src={film.src}
              posterSrc={film.thumbSrc}
              mediaType={film.mediaType}
              alt={film.title}
              preload="none"
              wrapperClassName="aspect-video"
              className="size-full object-contain"
            />
            <div className="p-5">
              <h2 className="text-xl font-medium text-white">{film.title}</h2>
              {film.mood && <p className="mt-2 text-sm leading-6 text-zinc-500">{film.mood}</p>}
              <Link
                href={contextualHref(`/artwork/${film.id}`, feedReturn)}
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm text-cyan-200 hover:text-white"
              >
                Open artwork
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ThreadLayer({ threads, feedReturn }: { threads: WorldThread[]; feedReturn: FeedReturnContext | null }) {
  if (!threads.length) {
    return (
      <EmptyLayer
        icon={<Network />}
        title="No public Chronicles cross this World yet."
        body="Create a World Thread from two or more pieces to reveal a credit-preserving path here."
        actionHref="/threads/new"
        actionLabel="Create a Thread"
      />
    );
  }
  return (
    <div>
      <LayerHeading
        eyebrow="Connected paths"
        title="Chronicles"
        body="Ordered visual relationships curated from real published pieces."
      />
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {threads.map((thread) => {
          const cover = thread.items[0]?.artwork;
          return (
            <Link
              key={thread.id}
              href={contextualHref(`/threads/${thread.slug}`, feedReturn)}
              className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] hover:border-violet-300/35"
            >
              {cover && (
                <div className="relative aspect-[16/9] overflow-hidden bg-black">
                  <PolishedImage
                    src={cover.thumbSrc || cover.src}
                    alt=""
                    wrapperClassName="absolute inset-0"
                    className="size-full object-cover opacity-75 transition duration-500 group-hover:scale-[1.02] motion-reduce:transition-none"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
                </div>
              )}
              <div className="p-6">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-violet-200">
                  {thread.itemCount} connected pieces
                </p>
                <h2 className="mt-3 text-2xl font-medium text-white">{thread.title}</h2>
                {thread.summary && (
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-500">{thread.summary}</p>
                )}
                <span className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm text-violet-100">
                  Open Chronicle
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function SignalLayer({
  signals,
  feedReturn,
}: {
  signals: Array<{
    artwork: FeedInventoryItem;
    reason: string;
    sourceArtworkTitle: string;
  }>;
  feedReturn: FeedReturnContext | null;
}) {
  if (!signals.length) {
    return (
      <EmptyLayer
        icon={<Radio />}
        title="No neighboring signals were detected."
        body="Signals use declared mood and tag metadata in v1; this World needs more shared metadata before a connection is claimed."
      />
    );
  }
  return (
    <div>
      <LayerHeading
        eyebrow="Metadata signal trail"
        title="Visual echoes"
        body="Related Worlds found through shared mood and tag metadata—not hidden pixel similarity."
      />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
        {signals.map(({ artwork, reason, sourceArtworkTitle }) => (
          <Link
            key={artwork.id}
            href={contextualHref(`/artwork/${artwork.id}`, feedReturn)}
            className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] hover:border-cyan-300/35"
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-black">
              <PolishedImage
                src={artwork.thumbSrc || artwork.src}
                alt={artwork.title}
                wrapperClassName="absolute inset-0"
                className="size-full object-cover transition duration-500 group-hover:scale-[1.025] motion-reduce:transition-none"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="p-4">
              <p className="text-[10px] leading-5 text-cyan-200">{reason}</p>
              <h2 className="mt-2 text-sm font-medium text-white">{artwork.title}</h2>
              <p className="mt-1 text-xs text-zinc-600">{artwork.collection.title}</p>
              <p className="mt-2 line-clamp-1 font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-700">
                Via {sourceArtworkTitle}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ArtworkTile({ artwork, eager, feedReturn }: { artwork: FeedInventoryItem; eager: boolean; feedReturn: FeedReturnContext | null }) {
  return (
    <Link
      href={contextualHref(`/artwork/${artwork.id}`, feedReturn)}
      className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] hover:border-cyan-300/35"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-black">
        <PolishedImage
          src={artwork.thumbSrc || artwork.src}
          alt={artwork.title}
          wrapperClassName="absolute inset-0"
          className="size-full object-cover transition duration-500 group-hover:scale-[1.025] motion-reduce:transition-none"
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={eager ? "high" : "low"}
        />
        {isVideoArtwork(artwork.mediaType, artwork.src) && (
          <span className="absolute right-2 top-2 rounded-full border border-white/15 bg-black/75 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.16em] text-white">
            Film
          </span>
        )}
      </div>
      <div className="p-4">
        <h2 className="text-sm font-medium text-white">{artwork.title}</h2>
        {artwork.mood && <p className="mt-1 line-clamp-1 text-xs text-zinc-600">{artwork.mood}</p>}
      </div>
    </Link>
  );
}

function LayerHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="max-w-2xl">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">{eyebrow}</p>
      <h2 className="mt-3 text-4xl font-light tracking-tight text-white sm:text-5xl">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-500 sm:text-base">{body}</p>
    </div>
  );
}

function EmptyLayer({
  icon,
  title,
  body,
  actionHref,
  actionLabel,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.025] px-6 py-16 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl border border-white/10 text-cyan-300 [&>svg]:size-5">
        {icon}
      </span>
      <h2 className="mt-5 text-2xl font-medium text-white">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-500">{body}</p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-cyan-300 px-5 text-sm font-medium text-zinc-950"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
