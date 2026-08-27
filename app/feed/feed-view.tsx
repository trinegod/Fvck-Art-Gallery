"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowUpRight,
  Bookmark,
  Compass,
  FlaskConical,
  Heart,
  Home,
  Layers3,
  LoaderCircle,
  MessageCircle,
  Network,
  Radio,
  Search,
  Sparkles,
  UserCheck,
  Waypoints,
} from "lucide-react";
import { toast } from "sonner";
import ArtworkComments from "@/app/components/artwork-comments";
import ArtworkMedia, {
  isVideoArtwork,
} from "@/app/components/artwork-media";
import ArtworkShareButton from "@/app/components/artwork-share-button";
import MobileAppNavigation from "@/app/components/mobile-app-navigation";
import PolishedImage from "@/app/components/polished-image";
import {
  composeFeed,
  EMPTY_FEED_SIGNALS,
  type FeedEntry,
  type FeedInventoryItem,
  type FeedMode,
  type FeedSignals,
} from "@/lib/feed";
import {
  appendFeedReturnContext,
  buildFeedReturnHref,
} from "@/lib/feed-return";
import { supabase } from "@/lib/supabase-browser";

type FeedViewProps = {
  inventory: FeedInventoryItem[];
  initialMode: FeedMode;
  initialArtworkId?: string | null;
};

type SignalState = "loading" | "ready" | "signed-out" | "unavailable";

const feedBatchSize = 12;

const modeCopy: Record<FeedMode, { eyebrow: string; title: string; body: string }> = {
  "for-you": {
    eyebrow: "Your living signal",
    title: "For you",
    body: "A transparent mix shaped by what you follow, like, and save—without hiding why each piece arrived.",
  },
  discover: {
    eyebrow: "Across the archive",
    title: "Discover",
    body: "Move between Worlds, films, and public Chronicles without flattening them into disconnected posts.",
  },
  following: {
    eyebrow: "Your creative orbit",
    title: "Following",
    body: "A focused stream from the makers you chose to keep close.",
  },
};

function modeHref(mode: FeedMode) {
  return `/feed?mode=${mode}`;
}

function withFeedContext(href: string, mode: FeedMode, artworkId: string) {
  return appendFeedReturnContext(href, { mode, signalId: artworkId });
}

function firstThread(entry: FeedEntry) {
  return entry.threadContexts[0] ?? null;
}

export default function FeedView({
  inventory,
  initialMode,
  initialArtworkId = null,
}: FeedViewProps) {
  const [feedMode, setFeedMode] = useState<FeedMode>(initialMode);
  const [signals, setSignals] = useState<FeedSignals>(EMPTY_FEED_SIGNALS);
  const [signalState, setSignalState] = useState<SignalState>(
    supabase ? "loading" : "unavailable"
  );
  const [followingState, setFollowingState] = useState<SignalState>(
    supabase ? "loading" : "unavailable"
  );
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [signalError, setSignalError] = useState<string | null>(null);
  const [followingError, setFollowingError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(feedBatchSize);
  const [discussionId, setDiscussionId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(initialArtworkId);
  const [busyEngagements, setBusyEngagements] = useState<Set<string>>(
    () => new Set()
  );
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const restoredArtworkRef = useRef(false);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const database = client;
    let cancelled = false;
    let requestVersion = 0;

    async function loadSignals(userId: string | null) {
      const version = ++requestVersion;
      setSignalState("loading");
      setFollowingState("loading");
      setSignalError(null);
      setFollowingError(null);
      setViewerId(userId);

      const [popularity, follows, likes, saves] = await Promise.all([
        database.from("artwork_likes").select("artwork_id"),
        userId
          ? database
              .from("profile_follows")
              .select("followed_id")
              .eq("follower_id", userId)
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

      if (cancelled || version !== requestVersion) return;

      const globalLikeCounts: Record<string, number> = {};
      for (const row of popularity.data ?? []) {
        const artworkId = row.artwork_id as string;
        globalLikeCounts[artworkId] = (globalLikeCounts[artworkId] ?? 0) + 1;
      }

      setSignals({
        followedCreatorIds: (follows.data ?? []).map(
          (row) => row.followed_id as string
        ),
        likedArtworkIds: (likes.data ?? []).map(
          (row) => row.artwork_id as string
        ),
        savedArtworkIds: (saves.data ?? []).map(
          (row) => row.artwork_id as string
        ),
        globalLikeCounts,
      });

      const personalizationErrors = [popularity.error, likes.error, saves.error]
        .filter(Boolean)
        .map((error) => error?.message)
        .filter(Boolean);
      if (personalizationErrors.length) {
        setSignalError(
          personalizationErrors[0] ?? "Personalization is temporarily unavailable."
        );
        setSignalState("unavailable");
      } else {
        setSignalState(userId ? "ready" : "signed-out");
      }

      if (!userId) {
        setFollowingState("signed-out");
      } else if (follows.error) {
        setFollowingError(follows.error.message);
        setFollowingState("unavailable");
      } else {
        setFollowingState("ready");
      }
    }

    database.auth.getSession().then(({ data }) => {
      loadSignals(data.session?.user.id ?? null);
    });
    const { data: listener } = database.auth.onAuthStateChange(
      (_event, session) => loadSignals(session?.user.id ?? null)
    );

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const entries = useMemo(
    () => composeFeed(inventory, feedMode, signals),
    [feedMode, inventory, signals]
  );
  const visibleEntries = entries.slice(0, visibleCount);
  const hasMore = visibleCount < entries.length;
  const activeEntry =
    entries.find((entry) => entry.id === activeId) ?? entries[0] ?? null;
  const worldInterlude = entries[3] ?? entries[0] ?? null;
  const chronicleInterlude =
    entries.find((entry) => entry.threadContexts.length > 0) ?? null;
  const copy =
    feedMode === "for-you" && signalState === "signed-out"
      ? {
          eyebrow: "The public signal",
          title: "For you",
          body: "Sign in to tune this mix with the creators, artwork, and Worlds you choose. Until then, NODEINE keeps the public logic visible.",
        }
      : modeCopy[feedMode];

  useEffect(() => {
    function restoreModeFromHistory() {
      const requested = new URL(window.location.href).searchParams.get("mode");
      if (requested === "for-you" || requested === "discover" || requested === "following") {
        setFeedMode(requested);
        setVisibleCount(feedBatchSize);
        setDiscussionId(null);
      }
    }
    window.addEventListener("popstate", restoreModeFromHistory);
    return () => window.removeEventListener("popstate", restoreModeFromHistory);
  }, []);

  useEffect(() => {
    if (
      !initialArtworkId ||
      restoredArtworkRef.current ||
      !entries.length ||
      signalState === "loading" ||
      (feedMode === "following" && followingState === "loading")
    ) {
      return;
    }
    const index = entries.findIndex((entry) => entry.id === initialArtworkId);
    if (index < 0) return;
    let scrollFrame = 0;
    const revealFrame = requestAnimationFrame(() => {
      setVisibleCount((count) => Math.max(count, index + 1));
      scrollFrame = requestAnimationFrame(() => {
        document.getElementById(`signal-${initialArtworkId}`)?.scrollIntoView({
          block: "start",
        });
        restoredArtworkRef.current = true;
      });
    });
    return () => {
      cancelAnimationFrame(revealFrame);
      cancelAnimationFrame(scrollFrame);
    };
  }, [entries, feedMode, followingState, initialArtworkId, signalState]);

  function changeMode(mode: FeedMode) {
    if (mode === feedMode) return;
    setFeedMode(mode);
    setVisibleCount(feedBatchSize);
    setDiscussionId(null);
    setActiveId(null);
    restoredArtworkRef.current = true;
    window.history.pushState(null, "", modeHref(mode));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleEngagement(
    kind: "like" | "save",
    artworkId: string
  ) {
    const client = supabase;
    if (!client || !viewerId) return;
    const key = `${kind}:${artworkId}`;
    if (busyEngagements.has(key)) return;

    const listKey = kind === "like" ? "likedArtworkIds" : "savedArtworkIds";
    const wasActive = signals[listKey].includes(artworkId);
    setBusyEngagements((current) => new Set(current).add(key));
    setSignals((current) => ({
      ...current,
      [listKey]: wasActive
        ? current[listKey].filter((id) => id !== artworkId)
        : [...current[listKey], artworkId],
      globalLikeCounts:
        kind === "like"
          ? {
              ...current.globalLikeCounts,
              [artworkId]: Math.max(
                0,
                (current.globalLikeCounts[artworkId] ?? 0) +
                  (wasActive ? -1 : 1)
              ),
            }
          : current.globalLikeCounts,
    }));

    const table = kind === "like" ? "artwork_likes" : "artwork_saves";
    const result = wasActive
      ? await client
          .from(table)
          .delete()
          .eq("artwork_id", artworkId)
          .eq("user_id", viewerId)
      : await client
          .from(table)
          .insert({ artwork_id: artworkId, user_id: viewerId });

    if (result.error) {
      setSignals((current) => ({
        ...current,
        [listKey]: wasActive
          ? [...current[listKey], artworkId]
          : current[listKey].filter((id) => id !== artworkId),
        globalLikeCounts:
          kind === "like"
            ? {
                ...current.globalLikeCounts,
                [artworkId]: Math.max(
                  0,
                  (current.globalLikeCounts[artworkId] ?? 0) +
                    (wasActive ? 1 : -1)
                ),
              }
            : current.globalLikeCounts,
      }));
      toast.error(`${kind === "like" ? "Like" : "Save"} wasn't updated`, {
        description: result.error.message,
      });
    } else {
      toast.success(
        kind === "like"
          ? wasActive
            ? "Like removed"
            : "Artwork liked"
          : wasActive
            ? "Removed from saved artwork"
            : "Saved to your collection"
      );
    }
    setBusyEngagements((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  }

  useEffect(() => {
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-feed-entry]")
    );
    if (!targets.length || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (observations) => {
        const visible = observations
          .filter((observation) => observation.isIntersecting)
          .sort(
            (left, right) =>
              Math.abs(left.boundingClientRect.top) -
              Math.abs(right.boundingClientRect.top)
          )[0];
        if (visible?.target instanceof HTMLElement) {
          const nextId = visible.target.dataset.feedEntry ?? null;
          setActiveId(nextId);
          if (nextId) {
            window.history.replaceState(
              null,
              "",
              buildFeedReturnHref({ mode: feedMode, signalId: nextId })
            );
          }
        }
      },
      { rootMargin: "-18% 0px -58% 0px", threshold: 0.08 }
    );
    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, [feedMode, visibleEntries.length]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMore || typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisibleCount((count) =>
          Math.min(count + feedBatchSize, entries.length)
        );
      },
      { rootMargin: "500px 0px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [entries.length, hasMore]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_-10%,rgba(34,211,238,.10),transparent_28%),#09090b] pb-[calc(7rem+env(safe-area-inset-bottom))] text-zinc-100 lg:pb-0">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/82 px-4 py-3 backdrop-blur-2xl lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <Link href="/feed" className="inline-flex min-h-11 items-center text-base font-light tracking-[0.24em] text-white">
            NODEINE
          </Link>
          <Link
            href="/discover"
            className="grid size-11 place-items-center rounded-xl border border-white/10 text-zinc-300"
            aria-label="Search NODEINE"
          >
            <Search className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-0 lg:grid-cols-[220px_minmax(0,780px)_280px] xl:grid-cols-[250px_minmax(0,800px)_310px]">
        <aside className="hidden min-h-screen border-r border-white/8 px-5 py-8 lg:block">
          <div className="sticky top-8">
            <Link href="/feed" className="inline-flex min-h-11 items-center text-lg font-light tracking-[0.26em] text-white">
              NODEINE
            </Link>
            <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">
              Worlds in motion
            </p>

            <nav className="mt-10 space-y-1" aria-label="Feed navigation">
              <LeftRailLink href="/feed" icon={<Home />} label="Feed" active />
              <LeftRailLink href="/" icon={<Archive />} label="Archive" />
              <LeftRailLink href="/discover" icon={<Compass />} label="Discover" />
              <LeftRailLink href="/threads" icon={<Waypoints />} label="Threads" />
              <LeftRailLink href="/forge" icon={<FlaskConical />} label="Forge" />
            </nav>

            <div className="mt-10 rounded-2xl border border-white/8 bg-white/[0.025] p-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">
                Feed logic
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Every signal says why it appears. Worlds and creator credits stay attached.
              </p>
            </div>
          </div>
        </aside>

        <section className="min-w-0 border-r border-white/8">
          <div className="border-b border-white/8 px-4 pb-5 pt-8 sm:px-7 sm:pb-7 sm:pt-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300">
              {copy.eyebrow}
            </p>
            <h1 className="mt-3 text-4xl font-light tracking-[-0.04em] text-white sm:text-5xl">
              {copy.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7">
              {copy.body}
            </p>

            <nav
              className="mt-7 grid grid-cols-3 rounded-2xl border border-white/10 bg-black/35 p-1"
              aria-label="Feed mode"
            >
              <ModeTab mode="for-you" activeMode={feedMode} icon={<Sparkles />} onSelect={changeMode}>
                For You
              </ModeTab>
              <ModeTab mode="discover" activeMode={feedMode} icon={<Radio />} onSelect={changeMode}>
                Discover
              </ModeTab>
              <ModeTab mode="following" activeMode={feedMode} icon={<UserCheck />} onSelect={changeMode}>
                Following
              </ModeTab>
            </nav>

            {signalState === "loading" && (
              <p className="mt-3 text-xs text-zinc-500" role="status">
                Tuning your signal from follows, likes, and saves…
              </p>
            )}
            {signalError && feedMode !== "following" && (
              <p className="mt-3 text-xs text-amber-200" role="status">
                {signalError} Showing the public signal instead.
              </p>
            )}
            {followingError && feedMode === "following" && (
              <p className="mt-3 text-xs text-amber-200" role="status">
                {followingError}
              </p>
            )}
          </div>

          {feedMode !== "following" && signalState === "loading" ? (
            <FeedStatus
              title={feedMode === "for-you" ? "Tuning your living signal…" : "Reading the public signal…"}
              body={feedMode === "for-you" ? "Reading your follows, likes, saves, and the public archive before the order settles." : "Measuring public momentum and Chronicle crossings before the order settles."}
            />
          ) : feedMode === "following" && followingState === "loading" ? (
            <FeedStatus
              title="Gathering your creative orbit…"
              body="Reading the creators you follow and assembling their published signals."
            />
          ) : feedMode === "following" && followingState === "signed-out" ? (
            <EmptyFeed
              title="Your orbit begins after sign-in."
              body="Follow creators and their new work will gather here."
              actionHref="/admin"
              actionLabel="Sign in"
            />
          ) : feedMode === "following" && followingState === "unavailable" ? (
            <EmptyFeed
              title="Following is temporarily unavailable."
              body="Nothing has been erased. Explore the public stream while the connection recovers."
              actionHref="/feed?mode=discover"
              actionLabel="Open Discover"
            />
          ) : !inventory.length ? (
            <EmptyFeed
              title="The public signal is quiet."
              body="The feed needs its Supabase connection and at least one published artwork."
              actionHref="/"
              actionLabel="Open archive"
            />
          ) : !entries.length ? (
            <EmptyFeed
              title="No signals in this lane yet."
              body="Follow a creator, or explore the complete public stream."
              actionHref="/feed?mode=discover"
              actionLabel="Discover Worlds"
            />
          ) : (
            <div className="space-y-5 px-3 py-5 sm:space-y-7 sm:px-6 sm:py-7">
              {visibleEntries.map((entry, index) => (
                <div key={entry.id}>
                  <FeedCard
                    entry={entry}
                    index={index}
                    discussionOpen={discussionId === entry.id}
                    onToggleDiscussion={() =>
                      setDiscussionId((current) =>
                        current === entry.id ? null : entry.id
                      )
                    }
                    canForge={viewerId === entry.creator?.id}
                    feedMode={feedMode}
                    viewerId={viewerId}
                    liked={signals.likedArtworkIds.includes(entry.id)}
                    saved={signals.savedArtworkIds.includes(entry.id)}
                    likeCount={signals.globalLikeCounts[entry.id] ?? 0}
                    liking={busyEngagements.has(`like:${entry.id}`)}
                    saving={busyEngagements.has(`save:${entry.id}`)}
                    onToggleLike={() => toggleEngagement("like", entry.id)}
                    onToggleSave={() => toggleEngagement("save", entry.id)}
                  />

                  {index === 2 && worldInterlude && (
                    <WorldInterlude entry={worldInterlude} feedMode={feedMode} />
                  )}
                  {index === 6 && chronicleInterlude && (
                    <ChronicleInterlude entry={chronicleInterlude} feedMode={feedMode} />
                  )}
                </div>
              ))}

              <div ref={loadMoreRef} className="py-4 text-center">
                {hasMore ? (
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCount((count) =>
                        Math.min(count + feedBatchSize, entries.length)
                      )
                    }
                    className="min-h-11 rounded-xl border border-white/12 px-5 text-sm text-zinc-300 hover:border-cyan-300/50 hover:text-white"
                  >
                    Load {Math.min(feedBatchSize, entries.length - visibleCount)} more signals
                  </button>
                ) : (
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    Signal complete · {entries.length} pieces
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        <aside className="hidden min-h-screen px-5 py-8 lg:block xl:px-6">
          <div className="sticky top-8">
            <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-cyan-300">
              Signal context
            </p>
            {activeEntry ? (
              <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]">
                <div className="relative aspect-[4/3] overflow-hidden bg-black">
                  <PolishedImage
                    src={activeEntry.thumbSrc || activeEntry.src}
                    alt=""
                    wrapperClassName="absolute inset-0"
                    className="size-full object-cover opacity-75"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
                </div>
                <div className="p-5">
                  <p className="text-xs leading-5 text-cyan-200">
                    {activeEntry.reason}
                  </p>
                  <h2 className="mt-3 text-xl font-medium text-white">
                    {activeEntry.title}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-500">
                    {activeEntry.collection.worldCode || "Visual World"} · {activeEntry.collection.title}
                  </p>
                  <div className="mt-5 space-y-2">
                    <ContextLink
                      href={withFeedContext(`/worlds/${activeEntry.collection.id}`, feedMode, activeEntry.id)}
                      label="Enter World"
                      icon={<Layers3 />}
                    />
                    {firstThread(activeEntry) && (
                      <ContextLink
                        href={withFeedContext(`/threads/${firstThread(activeEntry)?.slug}#piece-${activeEntry.id}`, feedMode, activeEntry.id)}
                        label="Open Chronicle"
                        icon={<Network />}
                      />
                    )}
                    {viewerId === activeEntry.creator?.id && (
                      <ContextLink
                        href={`/forge?artwork=${activeEntry.id}`}
                        label="Analyze in Forge"
                        icon={<FlaskConical />}
                      />
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <MobileAppNavigation />
    </main>
  );
}

function LeftRailLink({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition ${
        active
          ? "bg-cyan-300/10 text-cyan-100"
          : "text-zinc-500 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span className="[&>svg]:size-4" aria-hidden="true">
        {icon}
      </span>
      {label}
    </Link>
  );
}

function ModeTab({
  mode,
  activeMode,
  icon,
  onSelect,
  children,
}: {
  mode: FeedMode;
  activeMode: FeedMode;
  icon: React.ReactNode;
  onSelect: (mode: FeedMode) => void;
  children: React.ReactNode;
}) {
  const active = mode === activeMode;
  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:gap-2 sm:text-sm ${
        active
          ? "bg-gradient-to-r from-cyan-300/15 to-violet-300/10 text-white"
          : "text-zinc-500 hover:text-zinc-200"
      }`}
    >
      <span className="[&>svg]:size-4" aria-hidden="true">
        {icon}
      </span>
      {children}
    </button>
  );
}

function FeedCard({
  entry,
  index,
  discussionOpen,
  onToggleDiscussion,
  canForge,
  feedMode,
  viewerId,
  liked,
  saved,
  likeCount,
  liking,
  saving,
  onToggleLike,
  onToggleSave,
}: {
  entry: FeedEntry;
  index: number;
  discussionOpen: boolean;
  onToggleDiscussion: () => void;
  canForge: boolean;
  feedMode: FeedMode;
  viewerId: string | null;
  liked: boolean;
  saved: boolean;
  likeCount: number;
  liking: boolean;
  saving: boolean;
  onToggleLike: () => void;
  onToggleSave: () => void;
}) {
  const thread = firstThread(entry);
  const mediaIsVideo = isVideoArtwork(entry.mediaType, entry.src);

  return (
    <article
      id={`signal-${entry.id}`}
      data-feed-entry={entry.id}
      className="scroll-mt-28 overflow-hidden rounded-[1.75rem] border border-white/10 bg-zinc-950/72 shadow-[0_24px_90px_rgba(0,0,0,.22)]"
    >
      <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
        {entry.creator?.username ? (
          <Link
            href={`/creator/${entry.creator.username}`}
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <CreatorAvatar entry={entry} />
            <CreatorLabel entry={entry} />
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <CreatorAvatar entry={entry} />
            <CreatorLabel entry={entry} />
          </div>
        )}
        <span className="max-w-[46%] rounded-full border border-cyan-300/15 bg-cyan-300/7 px-2.5 py-1 text-right font-mono text-[8px] uppercase tracking-[0.14em] text-cyan-200 sm:text-[9px]">
          {entry.reason}
        </span>
      </div>

      <div className="relative bg-black">
        {mediaIsVideo ? (
          <div>
            <ArtworkMedia
              src={entry.src}
              posterSrc={entry.thumbSrc}
              mediaType={entry.mediaType}
              alt={entry.title}
              preload="none"
              wrapperClassName="min-h-[52svh] max-h-[82svh]"
              className="max-h-[82svh] w-full object-contain"
            />
            <Link
              href={withFeedContext(`/artwork/${entry.id}`, feedMode, entry.id)}
              className="absolute bottom-3 right-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 bg-black/80 px-4 text-xs text-white backdrop-blur hover:border-cyan-300/60"
            >
              Open artwork
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <Link
            href={withFeedContext(`/artwork/${entry.id}`, feedMode, entry.id)}
            className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300"
            aria-label={`Open ${entry.title}`}
          >
            <ArtworkMedia
              src={entry.thumbSrc || entry.src}
              mediaType={entry.mediaType}
              alt={entry.title}
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={index === 0 ? "high" : "low"}
              wrapperClassName="min-h-[52svh] max-h-[82svh]"
              imageClassName="max-h-[82svh] w-full object-contain transition duration-500 group-hover:scale-[1.008] motion-reduce:transition-none"
            />
          </Link>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300">
              {entry.collection.worldCode || "Visual World"} · {entry.collection.title}
            </p>
            <h2 className="mt-2 text-2xl font-medium tracking-tight text-white">
              {entry.title}
            </h2>
          </div>
          <Link
            href={withFeedContext(`/worlds/${entry.collection.id}`, feedMode, entry.id)}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-white/12 px-3 text-xs text-zinc-300 hover:border-cyan-300/50 hover:text-white"
          >
            Enter World
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>

        {entry.mood && (
          <p className="mt-4 text-sm leading-6 text-zinc-400">{entry.mood}</p>
        )}

        {!!entry.tags.length && (
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Artwork signals">
            {entry.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1 text-[10px] text-zinc-500"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-start gap-2" aria-label="Artwork actions">
          <FeedEngagementButton
            kind="like"
            active={liked}
            count={likeCount}
            viewerId={viewerId}
            busy={liking}
            onToggle={onToggleLike}
          />
          <button
            type="button"
            onClick={onToggleDiscussion}
            aria-expanded={discussionOpen}
            aria-controls={`discussion-${entry.id}`}
            className={`nodeine-action inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
              discussionOpen
                ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-100"
                : "border-white/15 text-zinc-200 hover:border-cyan-300/70"
            }`}
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            Discuss
          </button>
          <FeedEngagementButton
            kind="save"
            active={saved}
            viewerId={viewerId}
            busy={saving}
            onToggle={onToggleSave}
          />
          <ArtworkShareButton artworkId={entry.id} artworkTitle={entry.title} />
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 border-t border-white/8 pt-4 text-xs">
          {thread && (
            <Link
              href={withFeedContext(`/threads/${thread.slug}#piece-${entry.id}`, feedMode, entry.id)}
              className="inline-flex min-h-11 items-center gap-2 text-violet-200 hover:text-white"
            >
              <Network className="size-4" aria-hidden="true" />
              Open “{thread.title}”
            </Link>
          )}
          {canForge && (
            <Link
              href={`/forge?artwork=${entry.id}`}
              className="inline-flex min-h-11 items-center gap-2 text-cyan-200 hover:text-white"
            >
              <FlaskConical className="size-4" aria-hidden="true" />
              Build creation prompt
            </Link>
          )}
        </div>

        {discussionOpen && (
          <div id={`discussion-${entry.id}`}>
            <ArtworkComments artworkId={entry.id} />
          </div>
        )}
      </div>
    </article>
  );
}

function FeedEngagementButton({
  kind,
  active,
  count,
  viewerId,
  busy,
  onToggle,
}: {
  kind: "like" | "save";
  active: boolean;
  count?: number;
  viewerId: string | null;
  busy: boolean;
  onToggle: () => void;
}) {
  const isLike = kind === "like";
  const Icon = isLike ? Heart : Bookmark;
  const label = isLike ? (active ? "Liked" : "Like") : active ? "Saved" : "Save";
  const baseClassName =
    "nodeine-action inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

  if (!viewerId) {
    return (
      <Link
        href="/admin"
        className={`${baseClassName} border-white/15 text-zinc-200 hover:border-cyan-300/70 hover:text-cyan-200`}
        aria-label={`Sign in to ${kind} this artwork`}
      >
        <Icon className="size-4" aria-hidden="true" />
        {isLike ? "Like" : "Save"}
        {isLike && <span className="text-xs text-zinc-500">{count ?? 0}</span>}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={busy}
      aria-pressed={active}
      className={`${baseClassName} disabled:cursor-wait disabled:opacity-70 ${
        active
          ? isLike
            ? "border-rose-300/50 bg-rose-300/10 text-rose-200"
            : "border-cyan-300/50 bg-cyan-300/10 text-cyan-200"
          : isLike
            ? "border-white/15 text-zinc-200 hover:border-rose-300/70 hover:text-rose-200"
            : "border-white/15 text-zinc-200 hover:border-cyan-300/70 hover:text-cyan-200"
      }`}
    >
      {busy ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Icon
          className="size-4"
          fill={active ? "currentColor" : "none"}
          aria-hidden="true"
        />
      )}
      {label}
      {isLike && <span className="text-xs opacity-70">{count ?? 0}</span>}
    </button>
  );
}

function CreatorAvatar({ entry }: { entry: FeedEntry }) {
  const initial = entry.creator?.displayName.charAt(0).toUpperCase() || "N";
  return (
    <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/12 bg-white/[0.04] text-sm text-cyan-200">
      {entry.creator?.avatarUrl ? (
        <PolishedImage
          src={entry.creator.avatarUrl}
          alt=""
          wrapperClassName="size-full"
          className="size-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  );
}

function CreatorLabel({ entry }: { entry: FeedEntry }) {
  return (
    <span className="min-w-0">
      <span className="block truncate text-sm font-medium text-zinc-100">
        {entry.creator?.displayName || "NODEINE"}
      </span>
      <span className="block truncate text-xs text-zinc-500">
        {entry.creator?.username ? `@${entry.creator.username}` : "Visual archive"}
      </span>
    </span>
  );
}

function WorldInterlude({
  entry,
  feedMode,
}: {
  entry: FeedEntry;
  feedMode: FeedMode;
}) {
  return (
    <aside className="my-5 overflow-hidden rounded-[1.75rem] border border-amber-200/15 bg-[radial-gradient(circle_at_90%_0%,rgba(251,191,36,.16),transparent_45%),rgba(255,255,255,.025)] p-6 sm:my-7 sm:p-8">
      <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-amber-200">
        World invitation
      </p>
      <div className="mt-4 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <h2 className="text-3xl font-light tracking-tight text-white">
            Don’t just scroll past {entry.collection.title}.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
            {entry.collection.summary ||
              "Enter the World to see its complete gallery, films, public Chronicles, and neighboring signals."}
          </p>
        </div>
        <Link
          href={withFeedContext(`/worlds/${entry.collection.id}`, feedMode, entry.id)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-200 px-4 text-sm font-medium text-zinc-950 hover:bg-amber-100"
        >
          <Layers3 className="size-4" aria-hidden="true" />
          Enter the layer
        </Link>
      </div>
    </aside>
  );
}

function ChronicleInterlude({
  entry,
  feedMode,
}: {
  entry: FeedEntry;
  feedMode: FeedMode;
}) {
  const thread = firstThread(entry);
  if (!thread) return null;
  return (
    <aside className="my-5 rounded-[1.75rem] border border-violet-300/18 bg-[linear-gradient(135deg,rgba(139,92,246,.13),rgba(34,211,238,.04))] p-6 sm:my-7 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-violet-200/20 bg-violet-300/10 text-violet-100">
          <Network className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-violet-200">
            Chronicle crossing
          </p>
          <h2 className="mt-2 text-2xl font-medium text-white">{thread.title}</h2>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            This piece is one step in a credit-preserving visual path. Open it where the relationship is visible.
          </p>
          <Link
            href={withFeedContext(`/threads/${thread.slug}#piece-${entry.id}`, feedMode, entry.id)}
            className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm text-violet-100 hover:text-white"
          >
            Open at this piece
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </aside>
  );
}

function ContextLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center justify-between rounded-xl border border-white/10 px-3 text-xs text-zinc-300 hover:border-cyan-300/40 hover:text-white"
    >
      <span className="flex items-center gap-2">
        <span className="[&>svg]:size-3.5" aria-hidden="true">
          {icon}
        </span>
        {label}
      </span>
      <ArrowUpRight className="size-3.5" aria-hidden="true" />
    </Link>
  );
}

function EmptyFeed({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string;
  body: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="px-5 py-20 text-center sm:px-8">
      <Sparkles className="mx-auto size-6 text-cyan-300" aria-hidden="true" />
      <h2 className="mt-4 text-2xl font-medium text-white">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500">{body}</p>
      <Link
        href={actionHref}
        className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-cyan-300 px-5 text-sm font-medium text-zinc-950"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

function FeedStatus({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-5 py-20 text-center sm:px-8" role="status" aria-live="polite">
      <Radio className="mx-auto size-6 animate-pulse text-cyan-300 motion-reduce:animate-none" aria-hidden="true" />
      <h2 className="mt-4 text-2xl font-medium text-white">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500">{body}</p>
    </div>
  );
}
