"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  Search,
  Shuffle,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase-browser";
import ActivityNavLink from "../components/activity-nav-link";
import MobileAppNavigation from "../components/mobile-app-navigation";
import PolishedImage from "../components/polished-image";

export type DiscoverArtwork = {
  id: string;
  title: string;
  src: string;
  thumbSrc: string | null;
  mood: string | null;
  tags: string[] | null;
  collectionTitle: string;
  worldCode: string | null;
  creatorId: string | null;
  creatorName: string;
  creatorUsername: string | null;
};

type DiscoverViewProps = {
  artworks: DiscoverArtwork[];
};

type FeedMode = "for-you" | "discover" | "following";
type FollowingState = "loading" | "signed-out" | "ready" | "unavailable";
type PersonalizationState =
  | "loading"
  | "signed-out"
  | "ready"
  | "unavailable";

const filters = ["All", "Cyberpunk", "Anime", "Fashion", "Mecha", "Dystopia"];

function searchableText(artwork: DiscoverArtwork) {
  return [
    artwork.title,
    artwork.collectionTitle,
    artwork.worldCode,
    artwork.creatorName,
    artwork.creatorUsername,
    artwork.mood,
    ...(artwork.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function normalizedFacet(value: string) {
  return value.trim().toLowerCase();
}

function addAffinity(
  affinity: Map<string, number>,
  value: string | null | undefined,
  weight: number
) {
  if (!value) return;
  const key = normalizedFacet(value);
  affinity.set(key, (affinity.get(key) ?? 0) + weight);
}

export default function DiscoverView({ artworks }: DiscoverViewProps) {
  const router = useRouter();
  const [feedMode, setFeedMode] = useState<FeedMode>("for-you");
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [followedCreatorIds, setFollowedCreatorIds] = useState<string[]>([]);
  const [likedArtworkIds, setLikedArtworkIds] = useState<string[]>([]);
  const [savedArtworkIds, setSavedArtworkIds] = useState<string[]>([]);
  const [globalLikeCounts, setGlobalLikeCounts] = useState<
    Record<string, number>
  >({});
  const [followingState, setFollowingState] = useState<FollowingState>(
    supabase ? "loading" : "unavailable"
  );
  const [personalizationState, setPersonalizationState] =
    useState<PersonalizationState>(supabase ? "loading" : "unavailable");
  const [followingError, setFollowingError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const database = client;
    let cancelled = false;
    let requestId = 0;

    async function loadFeedSignals(userId: string | null) {
      const currentRequest = ++requestId;
      setFollowingState("loading");
      setPersonalizationState("loading");
      setFollowingError(null);

      const popularityRequest = database
        .from("artwork_likes")
        .select("artwork_id");

      const [popularityResult, followsResult, likesResult, savesResult] =
        await Promise.all([
          popularityRequest,
          userId
            ? database
                .from("profile_follows")
                .select("followed_id")
                .eq("follower_id", userId)
                .order("created_at", { ascending: false })
            : Promise.resolve({ data: [], error: null }),
          userId
            ? database
                .from("artwork_likes")
                .select("artwork_id")
                .eq("user_id", userId)
            : Promise.resolve({ data: [], error: null }),
          userId
            ? database
                .from("artwork_saves")
                .select("artwork_id")
                .eq("user_id", userId)
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (cancelled || currentRequest !== requestId) return;

      const likeCounts: Record<string, number> = {};
      for (const like of popularityResult.data ?? []) {
        const artworkId = like.artwork_id as string;
        likeCounts[artworkId] = (likeCounts[artworkId] ?? 0) + 1;
      }
      setGlobalLikeCounts(likeCounts);
      setLikedArtworkIds(
        (likesResult.data ?? []).map((like) => like.artwork_id as string)
      );
      setSavedArtworkIds(
        (savesResult.data ?? []).map((save) => save.artwork_id as string)
      );

      if (!userId) {
        setFollowedCreatorIds([]);
        setFollowingState("signed-out");
        setPersonalizationState(
          popularityResult.error ? "unavailable" : "signed-out"
        );
        return;
      }

      if (followsResult.error) {
        setFollowedCreatorIds([]);
        setFollowingError(
          followsResult.error.code === "42P01" ||
            followsResult.error.code === "PGRST205"
            ? "Following is waiting for its database connection."
            : followsResult.error.message
        );
        setFollowingState("unavailable");
      } else {
        setFollowedCreatorIds(
          (followsResult.data ?? []).map(
            (follow) => follow.followed_id as string
          )
        );
        setFollowingState("ready");
      }

      setPersonalizationState(
        popularityResult.error && likesResult.error && savesResult.error
          ? "unavailable"
          : "ready"
      );
    }

    database.auth.getSession().then(({ data }) => {
      loadFeedSignals(data.session?.user.id ?? null);
    });

    const { data: authListener } = database.auth.onAuthStateChange(
      (_event, session) => loadFeedSignals(session?.user.id ?? null)
    );

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const personalizedFeed = useMemo(() => {
    const followedCreators = new Set(followedCreatorIds);
    const likedArtworks = new Set(likedArtworkIds);
    const savedArtworks = new Set(savedArtworkIds);
    const tagAffinity = new Map<string, number>();
    const moodAffinity = new Map<string, number>();
    const creatorAffinity = new Map<string, number>();

    for (const artwork of artworks) {
      const engagementWeight =
        (likedArtworks.has(artwork.id) ? 3 : 0) +
        (savedArtworks.has(artwork.id) ? 5 : 0);
      if (!engagementWeight) continue;

      for (const tag of artwork.tags ?? []) {
        addAffinity(tagAffinity, tag, engagementWeight);
      }
      addAffinity(moodAffinity, artwork.mood, engagementWeight);
      addAffinity(creatorAffinity, artwork.creatorId, engagementWeight);
    }

    const ranked = artworks
      .map((artwork, originalIndex) => {
        const tagScore = (artwork.tags ?? []).reduce(
          (score, tag) => score + (tagAffinity.get(normalizedFacet(tag)) ?? 0),
          0
        );
        const moodScore = artwork.mood
          ? moodAffinity.get(normalizedFacet(artwork.mood)) ?? 0
          : 0;
        const creatorScore = artwork.creatorId
          ? creatorAffinity.get(normalizedFacet(artwork.creatorId)) ?? 0
          : 0;
        const score =
          (globalLikeCounts[artwork.id] ?? 0) * 2 +
          (artwork.creatorId && followedCreators.has(artwork.creatorId)
            ? 24
            : 0) +
          tagScore * 1.8 +
          moodScore * 1.25 +
          creatorScore * 1.5 -
          (likedArtworks.has(artwork.id) ? 3 : 0) -
          (savedArtworks.has(artwork.id) ? 5 : 0);

        return { artwork, originalIndex, score };
      })
      .sort(
        (left, right) =>
          right.score - left.score || left.originalIndex - right.originalIndex
      );

    const diversified: DiscoverArtwork[] = [];
    const remaining = [...ranked];
    let lastCreatorId: string | null = null;
    let lastCollectionTitle: string | null = null;

    while (remaining.length) {
      const variedIndex = remaining.findIndex(
        ({ artwork }, index) =>
          index < 6 &&
          (artwork.creatorId !== lastCreatorId ||
            artwork.collectionTitle !== lastCollectionTitle)
      );
      const [next] = remaining.splice(variedIndex >= 0 ? variedIndex : 0, 1);
      diversified.push(next.artwork);
      lastCreatorId = next.artwork.creatorId;
      lastCollectionTitle = next.artwork.collectionTitle;
    }

    return diversified;
  }, [
    artworks,
    followedCreatorIds,
    globalLikeCounts,
    likedArtworkIds,
    savedArtworkIds,
  ]);

  const forYouReasons = useMemo(() => {
    const followedCreators = new Set(followedCreatorIds);
    const likedArtworks = new Set(likedArtworkIds);
    const savedArtworks = new Set(savedArtworkIds);
    const tagAffinity = new Map<string, number>();

    for (const artwork of artworks) {
      const weight =
        (likedArtworks.has(artwork.id) ? 3 : 0) +
        (savedArtworks.has(artwork.id) ? 5 : 0);
      if (!weight) continue;
      for (const tag of artwork.tags ?? []) {
        addAffinity(tagAffinity, tag, weight);
      }
    }

    return new Map<string, string>(
      artworks.map((artwork): [string, string] => {
        if (artwork.creatorId && followedCreators.has(artwork.creatorId)) {
          return [artwork.id, "From a creator you follow"];
        }

        const strongestTag = (artwork.tags ?? [])
          .map((tag) => ({
            tag,
            score: tagAffinity.get(normalizedFacet(tag)) ?? 0,
          }))
          .sort((left, right) => right.score - left.score)[0];

        if (strongestTag?.score) {
          return [artwork.id, `Because you like ${strongestTag.tag}`];
        }

        if ((globalLikeCounts[artwork.id] ?? 0) > 0) {
          return [artwork.id, "Popular on Nodeine"];
        }

        return [artwork.id, "Fresh from Nodeine"];
      })
    );
  }, [
    artworks,
    followedCreatorIds,
    globalLikeCounts,
    likedArtworkIds,
    savedArtworkIds,
  ]);

  const feedArtworks = useMemo(() => {
    if (feedMode === "for-you") return personalizedFeed;
    if (feedMode === "discover") return artworks;
    const followedCreators = new Set(followedCreatorIds);
    return artworks.filter((artwork) =>
      artwork.creatorId ? followedCreators.has(artwork.creatorId) : false
    );
  }, [artworks, feedMode, followedCreatorIds, personalizedFeed]);

  const filteredArtworks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedFilter = activeFilter.toLowerCase();

    return feedArtworks.filter((artwork) => {
      const text = searchableText(artwork);
      const matchesQuery = !normalizedQuery || text.includes(normalizedQuery);
      const matchesFilter =
        activeFilter === "All" || text.includes(normalizedFilter);
      return matchesQuery && matchesFilter;
    });
  }, [activeFilter, feedArtworks, query]);

  function surpriseMe() {
    const pool = filteredArtworks.length ? filteredArtworks : feedArtworks;
    if (!pool.length) return;
    const artwork = pool[Math.floor(Math.random() * pool.length)];
    router.push(`/artwork/${artwork.id}`);
  }

  return (
    <main className="min-h-screen bg-zinc-950 pb-[calc(7rem+env(safe-area-inset-bottom))] text-zinc-100 lg:pb-0">
      <header className="border-b border-white/10 px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link
            href="/"
            className="text-lg font-light tracking-[0.24em] text-white hover:text-cyan-200"
          >
            NODEINE
          </Link>
          <nav className="hidden items-center gap-5 text-xs uppercase tracking-[0.18em] lg:flex">
            <Link href="/" className="text-zinc-400 hover:text-white">
              Archive
            </Link>
            <Link href="/saved" className="text-zinc-400 hover:text-white">
              Saved
            </Link>
            <Link href="/messages" className="text-zinc-400 hover:text-white">
              Inbox
            </Link>
            <ActivityNavLink />
            <Link href="/admin" className="text-cyan-300 hover:text-cyan-200">
              Studio
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-9 sm:px-8 sm:py-14">
        <div className="grid gap-7 border-b border-white/10 pb-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
              {feedMode === "following"
                ? "Your creative network"
                : feedMode === "for-you"
                  ? "Personalized visual stream"
                  : "Visual signal finder"}
            </p>
            <h1 className="mt-3 text-4xl font-light text-white sm:text-5xl">
              {feedMode === "following"
                ? "From creators you follow"
                : feedMode === "for-you"
                  ? "For you"
                  : "Discover the archive"}
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
              {feedMode === "following"
                ? "A focused stream of new worlds from the people you chose to keep close."
                : feedMode === "for-you"
                  ? "A living mix shaped by what you follow, like, and save—balanced with what is moving across Nodeine."
                  : "Search worlds, moods, creators, and visual ideas across NODEINE."}
            </p>
          </div>
          <Button
            type="button"
            onClick={surpriseMe}
            disabled={
              !feedArtworks.length ||
              (feedMode === "following" && followingState !== "ready") ||
              (feedMode === "for-you" && personalizationState === "loading")
            }
            className="h-11 w-fit bg-cyan-300 px-4 text-zinc-950 hover:bg-cyan-200"
          >
            <Shuffle data-icon="inline-start" />
            Surprise me
          </Button>
        </div>

        <div
          className="mt-7 grid w-full grid-cols-3 rounded-xl border border-white/10 bg-black/40 p-1 sm:inline-grid sm:w-auto"
          role="tablist"
          aria-label="Artwork feed"
        >
          <button
            type="button"
            role="tab"
            aria-selected={feedMode === "for-you"}
            onClick={() => setFeedMode("for-you")}
            className={`nodeine-action inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:gap-2 sm:px-4 sm:text-sm ${
              feedMode === "for-you"
                ? "bg-gradient-to-r from-cyan-300/15 to-fuchsia-300/10 text-cyan-100"
                : "text-zinc-500 hover:text-zinc-200"
            }`}
          >
            <Sparkles className="size-4" aria-hidden="true" />
            For You
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={feedMode === "discover"}
            onClick={() => setFeedMode("discover")}
            className={`nodeine-action inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:gap-2 sm:px-4 sm:text-sm ${
              feedMode === "discover"
                ? "bg-white/10 text-white"
                : "text-zinc-500 hover:text-zinc-200"
            }`}
          >
            <Compass className="size-4" aria-hidden="true" />
            Discover
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={feedMode === "following"}
            onClick={() => setFeedMode("following")}
            className={`nodeine-action inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:gap-2 sm:px-4 sm:text-sm ${
              feedMode === "following"
                ? "bg-cyan-300/12 text-cyan-200"
                : "text-zinc-500 hover:text-zinc-200"
            }`}
          >
            <UserCheck className="size-4" aria-hidden="true" />
            Following
          </button>
        </div>

        {feedMode === "for-you" &&
          personalizationState === "signed-out" && (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-cyan-300/15 bg-cyan-300/5 px-4 py-3 text-sm text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
              <p>
                This is the community mix. Sign in and your likes, saves, and
                follows will tune it to you.
              </p>
              <Link
                href="/admin"
                className="shrink-0 font-medium text-cyan-300 hover:text-cyan-200"
              >
                Sign in to personalize
              </Link>
            </div>
          )}

        {feedMode === "for-you" &&
          personalizationState === "unavailable" && (
            <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-500">
              Personal signals are temporarily unavailable, so you are seeing
              the wider Nodeine mix.
            </p>
          )}

        <div className="mt-7">
          <label className="relative block">
            <span className="sr-only">Search artwork</span>
            <Search
              aria-hidden="true"
              className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-zinc-500"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={
                feedMode === "following"
                  ? "Search your following feed"
                  : feedMode === "for-you"
                    ? "Search your personalized feed"
                  : "Search artwork, worlds, moods, or creators"
              }
              className="h-14 rounded-xl border-white/12 bg-black/50 pl-12 pr-4 text-base text-white placeholder:text-zinc-600 focus-visible:border-cyan-300 focus-visible:ring-cyan-300/20"
            />
          </label>

          <div
            className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:flex-wrap sm:px-0"
            aria-label="Discover filters"
          >
            {filters.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  aria-pressed={isActive}
                  className={`min-h-10 shrink-0 rounded-full border px-4 text-xs uppercase tracking-[0.13em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                    isActive
                      ? "border-cyan-300/40 bg-cyan-300/12 text-cyan-200"
                      : "border-white/10 bg-black/30 text-zinc-500 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-7 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
          <p
            className="text-xs uppercase tracking-[0.18em] text-zinc-500"
            aria-live="polite"
          >
            {feedMode === "for-you" && personalizationState === "loading"
              ? "Tuning your feed"
              : feedMode === "following" && followingState === "loading"
              ? "Loading your feed"
              : `${filteredArtworks.length} ${
                  filteredArtworks.length === 1 ? "artwork" : "artworks"
                }`}
          </p>
          {(query || activeFilter !== "All") && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setActiveFilter("All");
              }}
              className="min-h-10 text-xs uppercase tracking-[0.16em] text-cyan-300 hover:text-cyan-200"
            >
              Clear search
            </button>
          )}
        </div>

        {feedMode === "for-you" && personalizationState === "loading" ? (
          <div className="grid min-h-72 place-items-center text-center">
            <div>
              <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-white/10 border-t-fuchsia-300" />
              <p className="mt-4 text-sm text-zinc-500">
                Reading the signals that make this feed yours...
              </p>
            </div>
          </div>
        ) : feedMode === "following" && followingState === "loading" ? (
          <div className="grid min-h-72 place-items-center text-center">
            <div>
              <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-white/10 border-t-cyan-300" />
              <p className="mt-4 text-sm text-zinc-500">
                Tuning your following feed...
              </p>
            </div>
          </div>
        ) : feedMode === "following" && followingState === "signed-out" ? (
          <div className="grid min-h-72 place-items-center text-center">
            <div className="max-w-md">
              <UserCheck className="mx-auto size-9 text-cyan-300" />
              <h2 className="mt-4 text-xl font-light text-white">
                Sign in to see your following feed
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Follow creators and their newest artwork will collect here.
              </p>
              <Link
                href="/admin"
                className="nodeine-action mt-6 inline-flex min-h-11 items-center rounded-lg bg-cyan-300 px-5 py-3 text-sm font-medium text-zinc-950 hover:bg-cyan-200"
              >
                Sign in to NODEINE
              </Link>
            </div>
          </div>
        ) : feedMode === "following" && followingState === "unavailable" ? (
          <div className="grid min-h-72 place-items-center text-center">
            <div className="max-w-md">
              <UserCheck className="mx-auto size-9 text-rose-300" />
              <h2 className="mt-4 text-xl font-light text-white">
                Following is unavailable
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                {followingError ?? "Please try again in a moment."}
              </p>
            </div>
          </div>
        ) : feedMode === "following" &&
          followingState === "ready" &&
          !followedCreatorIds.length ? (
          <div className="grid min-h-72 place-items-center text-center">
            <div className="max-w-md">
              <UserCheck className="mx-auto size-9 text-cyan-300" />
              <h2 className="mt-4 text-xl font-light text-white">
                Your feed starts with a follow
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Explore the archive, open a creator profile, and follow the
                worlds you want to see here.
              </p>
              <button
                type="button"
                onClick={() => setFeedMode("discover")}
                className="nodeine-action mt-6 inline-flex min-h-11 items-center rounded-lg border border-white/15 px-5 py-3 text-sm text-zinc-200 hover:border-cyan-300/50 hover:text-cyan-200"
              >
                Find creators
              </button>
            </div>
          </div>
        ) : filteredArtworks.length ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filteredArtworks.map((artwork) => (
              <Link
                key={artwork.id}
                href={`/artwork/${artwork.id}`}
                className="group overflow-hidden rounded-xl border border-white/10 bg-black outline-none transition hover:-translate-y-0.5 hover:border-cyan-300/30 focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                <PolishedImage
                  src={artwork.thumbSrc || artwork.src}
                  alt={artwork.title}
                  loading="lazy"
                  decoding="async"
                  wrapperClassName="aspect-[4/5] w-full"
                  className="size-full object-cover transition duration-500 group-hover:scale-105"
                />
                <span className="block border-t border-white/10 px-3 py-3">
                  <span className="block truncate text-sm text-zinc-100">
                    {artwork.title}
                  </span>
                  <span className="mt-1 block truncate text-xs text-cyan-300">
                    {artwork.collectionTitle}
                  </span>
                  <span className="mt-2 block truncate text-[11px] text-zinc-600">
                    {artwork.creatorUsername
                      ? `@${artwork.creatorUsername}`
                      : artwork.creatorName}
                  </span>
                  {feedMode === "for-you" && (
                    <span className="mt-2 block truncate text-[10px] uppercase tracking-[0.12em] text-fuchsia-300/70">
                      {forYouReasons.get(artwork.id)}
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center text-center">
            <div>
              <Compass className="mx-auto size-9 text-zinc-700" />
              <h2 className="mt-4 text-xl font-light text-white">
                {feedMode === "following"
                  ? "No new work here yet"
                  : "No signal found"}
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                {feedMode === "following"
                  ? "Try clearing the search, or check back after creators publish."
                  : "Try another world, mood, or creator name."}
              </p>
            </div>
          </div>
        )}
      </section>

      <MobileAppNavigation />
    </main>
  );
}
