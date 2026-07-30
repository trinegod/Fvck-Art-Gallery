"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  Search,
  Shuffle,
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

type FeedMode = "discover" | "following";
type FollowingState = "loading" | "signed-out" | "ready" | "unavailable";

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

export default function DiscoverView({ artworks }: DiscoverViewProps) {
  const router = useRouter();
  const [feedMode, setFeedMode] = useState<FeedMode>("discover");
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [followedCreatorIds, setFollowedCreatorIds] = useState<string[]>([]);
  const [followingState, setFollowingState] = useState<FollowingState>(
    supabase ? "loading" : "unavailable"
  );
  const [followingError, setFollowingError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const database = client;
    let cancelled = false;
    let requestId = 0;

    async function loadFollowing(userId: string | null) {
      const currentRequest = ++requestId;

      if (!userId) {
        if (!cancelled) {
          setFollowedCreatorIds([]);
          setFollowingError(null);
          setFollowingState("signed-out");
        }
        return;
      }

      setFollowingState("loading");
      setFollowingError(null);

      const { data, error } = await database
        .from("profile_follows")
        .select("followed_id")
        .eq("follower_id", userId)
        .order("created_at", { ascending: false });

      if (cancelled || currentRequest !== requestId) return;

      if (error) {
        setFollowedCreatorIds([]);
        setFollowingError(
          error.code === "42P01" || error.code === "PGRST205"
            ? "Following is waiting for its database connection."
            : error.message
        );
        setFollowingState("unavailable");
      } else {
        setFollowedCreatorIds(
          (data ?? []).map((follow) => follow.followed_id as string)
        );
        setFollowingState("ready");
      }
    }

    database.auth.getSession().then(({ data }) => {
      loadFollowing(data.session?.user.id ?? null);
    });

    const { data: authListener } = database.auth.onAuthStateChange(
      (_event, session) => loadFollowing(session?.user.id ?? null)
    );

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const feedArtworks = useMemo(() => {
    if (feedMode === "discover") return artworks;
    const followedCreators = new Set(followedCreatorIds);
    return artworks.filter((artwork) =>
      artwork.creatorId ? followedCreators.has(artwork.creatorId) : false
    );
  }, [artworks, feedMode, followedCreatorIds]);

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
                : "Visual signal finder"}
            </p>
            <h1 className="mt-3 text-4xl font-light text-white sm:text-5xl">
              {feedMode === "following"
                ? "From creators you follow"
                : "Discover the archive"}
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
              {feedMode === "following"
                ? "A focused stream of new worlds from the people you chose to keep close."
                : "Search worlds, moods, creators, and visual ideas across NODEINE."}
            </p>
          </div>
          <Button
            type="button"
            onClick={surpriseMe}
            disabled={
              !feedArtworks.length ||
              (feedMode === "following" && followingState !== "ready")
            }
            className="h-11 w-fit bg-cyan-300 px-4 text-zinc-950 hover:bg-cyan-200"
          >
            <Shuffle data-icon="inline-start" />
            Surprise me
          </Button>
        </div>

        <div
          className="mt-7 inline-flex rounded-xl border border-white/10 bg-black/40 p-1"
          role="tablist"
          aria-label="Artwork feed"
        >
          <button
            type="button"
            role="tab"
            aria-selected={feedMode === "discover"}
            onClick={() => setFeedMode("discover")}
            className={`nodeine-action inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
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
            className={`nodeine-action inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
              feedMode === "following"
                ? "bg-cyan-300/12 text-cyan-200"
                : "text-zinc-500 hover:text-zinc-200"
            }`}
          >
            <UserCheck className="size-4" aria-hidden="true" />
            Following
          </button>
        </div>

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
            {feedMode === "following" && followingState === "loading"
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

        {feedMode === "following" && followingState === "loading" ? (
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
