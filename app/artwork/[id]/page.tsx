import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Waypoints } from "lucide-react";
import {
  buildFeedReturnHref,
  parseFeedReturn,
  type FeedReturnQuery,
} from "@/lib/feed-return";
import {
  rankSignalTrail,
  type SignalTrailArtwork,
} from "@/lib/signal-trails";
import ArtworkSignalTrail, {
  type ArtworkSignalTrailItem,
} from "../../components/artwork-signal-trail";
import ArtworkComments from "../../components/artwork-comments";
import ArtworkLikeButton from "../../components/artwork-like-button";
import ArtworkMedia from "../../components/artwork-media";
import ArtworkSaveButton from "../../components/artwork-save-button";
import ArtworkShareButton from "../../components/artwork-share-button";
import ActivityNavLink from "../../components/activity-nav-link";
import MobileAppNavigation from "../../components/mobile-app-navigation";
import PolishedImage from "../../components/polished-image";
import ProfileFollowControl from "../../components/profile-follow-control";

type ArtworkPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<FeedReturnQuery>;
};

type ArtworkRecord = {
  id: string;
  collection_id: string;
  title: string;
  src: string;
  thumb_src: string | null;
  media_type: string | null;
  mood: string | null;
  tags: string[] | null;
  sort_order: number | null;
};

type CollectionRecord = {
  id: string;
  owner_id: string;
  title: string;
  summary: string | null;
  world_code: string | null;
};

type CreatorRecord = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

type ArtworkPageData = {
  artwork: ArtworkRecord;
  collection: CollectionRecord;
  creator: CreatorRecord | null;
  signalTrail: ArtworkSignalTrailItem[];
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const dynamic = "force-dynamic";

function getSiteOrigin() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000";
}

const getArtworkPageData = cache(
  async (artworkId: string): Promise<ArtworkPageData | null> => {
    if (!supabaseUrl || !supabaseKey || !uuidPattern.test(artworkId)) {
      return null;
    }

    const database = createClient(supabaseUrl, supabaseKey);
    const { data: artworkData, error: artworkError } = await database
      .from("artworks")
      .select(
        "id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order"
      )
      .eq("id", artworkId)
      .maybeSingle();

    if (artworkError) throw artworkError;
    if (!artworkData) return null;

    const artwork = artworkData as ArtworkRecord;
    const { data: collectionData, error: collectionError } = await database
      .from("collections")
      .select("id, owner_id, title, summary, world_code")
      .eq("id", artwork.collection_id)
      .maybeSingle();

    if (collectionError) throw collectionError;
    if (!collectionData) return null;

    const collection = collectionData as CollectionRecord;
    const { data: creatorData, error: creatorError } = await database
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", collection.owner_id)
      .maybeSingle();

    if (creatorError) throw creatorError;

    const candidateSelect =
      "id, collection_id, title, src, thumb_src, media_type, mood, tags";
    const candidateRequests = [
      database
        .from("artworks")
        .select(candidateSelect)
        .eq("collection_id", artwork.collection_id)
        .neq("id", artwork.id)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true })
        .limit(16),
    ];

    if (artwork.tags?.length) {
      candidateRequests.push(
        database
          .from("artworks")
          .select(candidateSelect)
          .overlaps("tags", artwork.tags)
          .neq("id", artwork.id)
          .order("sort_order", { ascending: true })
          .order("id", { ascending: true })
          .limit(32)
      );
    }

    if (artwork.mood) {
      candidateRequests.push(
        database
          .from("artworks")
          .select(candidateSelect)
          .eq("mood", artwork.mood)
          .neq("id", artwork.id)
          .order("sort_order", { ascending: true })
          .order("id", { ascending: true })
          .limit(16)
      );
    }

    const candidateResults = await Promise.all(candidateRequests);
    const candidateRows = candidateResults.flatMap((result) =>
      result.error ? [] : ((result.data ?? []) as ArtworkRecord[])
    );
    const currentSignalArtwork: SignalTrailArtwork = {
      id: artwork.id,
      collectionId: artwork.collection_id,
      title: artwork.title,
      src: artwork.src,
      thumbSrc: artwork.thumb_src,
      mediaType: artwork.media_type,
      mood: artwork.mood,
      tags: artwork.tags,
    };
    const rankedSignalTrail = rankSignalTrail(
      currentSignalArtwork,
      candidateRows.map((candidate) => ({
        id: candidate.id,
        collectionId: candidate.collection_id,
        title: candidate.title,
        src: candidate.src,
        thumbSrc: candidate.thumb_src,
        mediaType: candidate.media_type,
        mood: candidate.mood,
        tags: candidate.tags,
      }))
    );
    const signalCollectionIds = Array.from(
      new Set(rankedSignalTrail.map((candidate) => candidate.collectionId))
    );
    const { data: signalCollectionData } = signalCollectionIds.length
      ? await database
          .from("collections")
          .select("id, title")
          .in("id", signalCollectionIds)
      : { data: [] };
    const signalCollectionTitles = new Map(
      (signalCollectionData ?? []).map((candidateCollection) => [
        candidateCollection.id as string,
        candidateCollection.title as string,
      ])
    );

    return {
      artwork,
      collection,
      creator: (creatorData as CreatorRecord | null) ?? null,
      signalTrail: rankedSignalTrail.map((candidate) => ({
        ...candidate,
        collectionTitle:
          signalCollectionTitles.get(candidate.collectionId) ?? "NODEINE",
      })),
    };
  }
);

function getDescription(data: ArtworkPageData) {
  return (
    data.artwork.mood ||
    data.collection.summary ||
    `${data.artwork.title}, a piece from ${data.collection.title} on NODEINE.`
  );
}

export async function generateMetadata({
  params,
}: ArtworkPageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getArtworkPageData(id);

  if (!data) {
    return {
      title: "Artwork not found — NODEINE",
      robots: { index: false, follow: false },
    };
  }

  const title = `${data.artwork.title} — NODEINE`;
  const description = getDescription(data);
  const origin = getSiteOrigin();
  const canonicalUrl = `${origin}/artwork/${data.artwork.id}`;
  const imageUrl = new URL(
    data.artwork.thumb_src || data.artwork.src,
    origin
  ).toString();

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      type: "article",
      url: canonicalUrl,
      siteName: "NODEINE",
      images: [{ url: imageUrl, alt: data.artwork.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ArtworkPage({ params, searchParams }: ArtworkPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const data = await getArtworkPageData(id);
  if (!data) notFound();

  const { artwork, collection, creator, signalTrail } = data;
  const feedReturn = parseFeedReturn(query);
  const backHref = feedReturn ? buildFeedReturnHref(feedReturn) : "/";
  const backLabel = feedReturn ? "Back to feed" : "Back to archive";

  return (
    <main className="min-h-screen bg-zinc-950 pb-[calc(7rem+env(safe-area-inset-bottom))] text-zinc-100 lg:pb-0">
      <header className="border-b border-white/10 px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link
            href={backHref}
            className="text-lg font-light tracking-[0.24em] text-white hover:text-cyan-200"
          >
            NODEINE
          </Link>
          <nav className="hidden items-center gap-5 text-xs uppercase tracking-[0.18em] lg:flex">
            <Link href="/" className="text-zinc-400 hover:text-white">
              Archive
            </Link>
            <Link href="/discover" className="text-zinc-400 hover:text-white">
              Discover
            </Link>
            <Link href="/saved" className="text-zinc-400 hover:text-white">
              Saved
            </Link>
            <Link href="/threads" className="text-zinc-400 hover:text-white">
              Threads
            </Link>
            <Link href="/messages" className="text-zinc-400 hover:text-white">
              Inbox
            </Link>
            <ActivityNavLink />
            {creator && (
              <Link
                href={`/creator/${creator.username}`}
                className="text-cyan-300 hover:text-cyan-200"
              >
                Creator
              </Link>
            )}
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-0 lg:min-h-[calc(100svh-73px)] lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="relative grid min-h-[58svh] place-items-center overflow-hidden bg-black p-4 sm:min-h-[70svh] sm:p-8 lg:min-h-0">
          <ArtworkMedia
            src={artwork.src}
            posterSrc={artwork.thumb_src}
            mediaType={artwork.media_type}
            alt={artwork.title}
            wrapperClassName="absolute inset-0"
            className="absolute inset-0 size-full object-contain p-4 sm:p-8"
          />
          <Link
            href={backHref}
            className="absolute left-4 top-4 z-10 inline-flex min-h-10 items-center rounded-lg border border-white/15 bg-black/70 px-3 py-2 text-xs text-zinc-200 backdrop-blur hover:border-cyan-300 hover:text-white"
          >
            ← {backLabel}
          </Link>
        </section>

        <aside className="border-t border-white/10 p-5 lg:max-h-[calc(100svh-73px)] lg:overflow-y-auto lg:border-l lg:border-t-0 lg:p-7">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">
            {collection.world_code || "Visual world"}
          </p>
          <p className="mt-2 text-sm text-zinc-500">{collection.title}</p>
          <h1 className="mt-6 text-3xl font-light text-white">
            {artwork.title}
          </h1>

          {creator && (
            <div className="mt-4 flex items-center gap-3 border-y border-white/10 py-4 text-sm text-zinc-400">
              <Link
                href={`/creator/${creator.username}`}
                className="flex min-w-0 flex-1 items-center gap-3 hover:text-cyan-200"
              >
                <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/15 bg-black text-xs text-cyan-300">
                  {creator.avatar_url ? (
                    <PolishedImage
                      src={creator.avatar_url}
                      alt=""
                      wrapperClassName="size-full"
                      className="size-full object-cover"
                    />
                  ) : (
                    creator.display_name.charAt(0).toUpperCase()
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-zinc-200">
                    {creator.display_name}
                  </span>
                  <span className="block truncate text-xs text-zinc-500">
                    @{creator.username}
                  </span>
                </span>
              </Link>
              <ProfileFollowControl
                profileId={creator.id}
                creatorName={creator.display_name}
                variant="compact"
              />
            </div>
          )}

          {artwork.mood && (
            <div className="mt-7">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Mood
              </p>
              <p className="mt-2 leading-7 text-zinc-300">{artwork.mood}</p>
            </div>
          )}

          {!!artwork.tags?.length && (
            <div className="mt-7 border-t border-white/10 pt-5">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                Tags
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {artwork.tags.map((tag) => (
                  <span
                    key={tag}
                    className="border border-white/15 px-2.5 py-1.5 text-xs text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div
            className="mt-7 flex flex-wrap items-start gap-3"
            aria-label="Artwork actions"
          >
            <ArtworkLikeButton artworkId={artwork.id} />
            <ArtworkSaveButton artworkId={artwork.id} />
            <ArtworkShareButton
              artworkId={artwork.id}
              artworkTitle={artwork.title}
            />
            <Link
              href={`/threads/new?artwork=${artwork.id}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-violet-300/25 bg-violet-300/8 px-4 py-2.5 text-sm text-violet-100 transition hover:border-violet-300/60 hover:bg-violet-300/12"
            >
              <Waypoints className="size-4" aria-hidden="true" />
              Thread it
            </Link>
          </div>

          <ArtworkComments artworkId={artwork.id} />
        </aside>
      </div>
      <ArtworkSignalTrail items={signalTrail} />
      <MobileAppNavigation />
    </main>
  );
}
