"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { supabase } from "@/lib/supabase-browser";
import ArtworkComments from "../components/artwork-comments";
import ArtworkFocusView from "../components/artwork-focus-view";
import ArtworkLikeButton from "../components/artwork-like-button";
import ArtworkSaveButton from "../components/artwork-save-button";
import ArtworkShareButton from "../components/artwork-share-button";
import MobileAppNavigation from "../components/mobile-app-navigation";
import PolishedImage from "../components/polished-image";

type SavedRow = {
  artwork_id: string;
  created_at: string;
};

type ArtworkRow = {
  id: string;
  collection_id: string;
  title: string;
  src: string;
  thumb_src: string | null;
  mood: string | null;
  tags: string[] | null;
};

type CollectionRow = {
  id: string;
  owner_id: string;
  title: string;
  world_code: string | null;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
};

type SavedArtwork = ArtworkRow & {
  saved_at: string;
  collection: CollectionRow | null;
  creator: ProfileRow | null;
};

type LoadState = "loading" | "ready" | "signed-out" | "unavailable";

function formatSavedDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function isMissingTableError(code?: string) {
  return code === "42P01" || code === "PGRST205";
}

export default function SavedArtworkView() {
  const [savedArtworks, setSavedArtworks] = useState<SavedArtwork[]>([]);
  const [viewerProfile, setViewerProfile] = useState<ProfileRow | null>(null);
  const [loadState, setLoadState] = useState<LoadState>(
    supabase ? "loading" : "unavailable"
  );
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const database = client;
    let cancelled = false;
    let authRefreshTimer: number | null = null;

    async function loadSavedArtwork(userId: string | null) {
      if (!userId) {
        if (!cancelled) {
          setSavedArtworks([]);
          setViewerProfile(null);
          setLoadState("signed-out");
          setError(null);
        }
        return;
      }

      if (!cancelled) {
        setLoadState("loading");
        setError(null);
      }

      const [savesResult, viewerProfileResult] = await Promise.all([
        database
          .from("artwork_saves")
          .select("artwork_id, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        database
          .from("profiles")
          .select("id, username, display_name")
          .eq("id", userId)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      if (savesResult.error) {
        setLoadState("unavailable");
        setError(
          isMissingTableError(savesResult.error.code)
            ? "Saved artwork is waiting for its database connection."
            : savesResult.error.message
        );
        return;
      }

      const saves = (savesResult.data ?? []) as SavedRow[];
      setViewerProfile(
        (viewerProfileResult.data as ProfileRow | null) ?? null
      );

      if (!saves.length) {
        setSavedArtworks([]);
        setLoadState("ready");
        return;
      }

      const artworkIds = saves.map((save) => save.artwork_id);
      const { data: artworkData, error: artworkError } = await database
        .from("artworks")
        .select("id, collection_id, title, src, thumb_src, mood, tags")
        .in("id", artworkIds);

      if (cancelled) return;
      if (artworkError) {
        setLoadState("unavailable");
        setError(artworkError.message);
        return;
      }

      const artworks = (artworkData ?? []) as ArtworkRow[];
      const collectionIds = Array.from(
        new Set(artworks.map((artwork) => artwork.collection_id))
      );
      const { data: collectionData, error: collectionError } = await database
        .from("collections")
        .select("id, owner_id, title, world_code")
        .in("id", collectionIds);

      if (cancelled) return;
      if (collectionError) {
        setLoadState("unavailable");
        setError(collectionError.message);
        return;
      }

      const collections = (collectionData ?? []) as CollectionRow[];
      const ownerIds = Array.from(
        new Set(collections.map((collection) => collection.owner_id))
      );
      const { data: profileData, error: profileError } = await database
        .from("profiles")
        .select("id, username, display_name")
        .in("id", ownerIds);

      if (cancelled) return;
      if (profileError) {
        setLoadState("unavailable");
        setError(profileError.message);
        return;
      }

      const profiles = (profileData ?? []) as ProfileRow[];
      const artworkById = new Map(
        artworks.map((artwork) => [artwork.id, artwork])
      );
      const collectionById = new Map(
        collections.map((collection) => [collection.id, collection])
      );
      const profileById = new Map(
        profiles.map((profile) => [profile.id, profile])
      );

      const assembledArtwork = saves.flatMap((save) => {
        const artwork = artworkById.get(save.artwork_id);
        if (!artwork) return [];
        const collection = collectionById.get(artwork.collection_id) ?? null;

        return [
          {
            ...artwork,
            saved_at: save.created_at,
            collection,
            creator: collection
              ? profileById.get(collection.owner_id) ?? null
              : null,
          },
        ];
      });

      setSavedArtworks(assembledArtwork);
      setLoadState("ready");
    }

    database.auth.getUser().then(({ data }) => {
      loadSavedArtwork(data.user?.id ?? null);
    });

    const { data: authListener } = database.auth.onAuthStateChange(
      (_event, session) => {
        if (authRefreshTimer) window.clearTimeout(authRefreshTimer);
        authRefreshTimer = window.setTimeout(() => {
          loadSavedArtwork(session?.user.id ?? null);
        }, 0);
      }
    );

    return () => {
      cancelled = true;
      if (authRefreshTimer) window.clearTimeout(authRefreshTimer);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const selectedArtwork = selectedId
    ? savedArtworks.find((artwork) => artwork.id === selectedId) ?? null
    : null;
  const selectedIndex = selectedArtwork
    ? savedArtworks.findIndex((artwork) => artwork.id === selectedArtwork.id)
    : -1;

  const moveSelection = useCallback(
    (direction: -1 | 1) => {
      setSelectedId((currentId) => {
        if (!currentId || !savedArtworks.length) return currentId;
        const currentIndex = savedArtworks.findIndex(
          (artwork) => artwork.id === currentId
        );
        if (currentIndex < 0) return currentId;
        const nextIndex =
          (currentIndex + direction + savedArtworks.length) %
          savedArtworks.length;
        return savedArtworks[nextIndex].id;
      });
    },
    [savedArtworks]
  );

  useEffect(() => {
    if (!selectedArtwork) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (focusMode) {
          setFocusMode(false);
        } else {
          setSelectedId(null);
        }
      }
      if (event.key === "ArrowLeft") moveSelection(-1);
      if (event.key === "ArrowRight") moveSelection(1);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [focusMode, moveSelection, selectedArtwork]);

  function removeFromView(artworkId: string) {
    setSavedArtworks((current) =>
      current.filter((artwork) => artwork.id !== artworkId)
    );
    setFocusMode(false);
    setSelectedId(null);
  }

  const profileHref = viewerProfile
    ? `/creator/${viewerProfile.username}`
    : "/admin";

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
            <Link href="/discover" className="text-zinc-400 hover:text-white">
              Discover
            </Link>
            <Link href={profileHref} className="hidden text-zinc-400 hover:text-white sm:inline">
              Profile
            </Link>
            <Link href="/admin" className="text-cyan-300 hover:text-cyan-200">
              Studio
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
              Private collection
            </p>
            <h1 className="mt-3 text-4xl font-light text-white sm:text-5xl">
              Saved Artwork
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
              Keep the worlds and visual ideas you want to return to.
            </p>
          </div>
          {loadState === "ready" && (
            <p className="text-sm text-zinc-500">
              {savedArtworks.length}{" "}
              {savedArtworks.length === 1 ? "saved piece" : "saved pieces"}
            </p>
          )}
        </div>

        {loadState === "loading" && (
          <div className="grid min-h-80 place-items-center text-sm text-zinc-500">
            Loading your saved artwork...
          </div>
        )}

        {loadState === "signed-out" && (
          <div className="mx-auto grid min-h-96 max-w-xl place-items-center text-center">
            <div>
              <Bookmark className="mx-auto size-10 text-cyan-300" />
              <h2 className="mt-5 text-2xl font-light text-white">
                Your saves are private
              </h2>
              <p className="mt-3 leading-7 text-zinc-400">
                Sign in to save artwork and find it here whenever you return.
              </p>
              <Link
                href="/admin"
                className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-cyan-300 px-5 py-3 text-sm font-medium text-zinc-950"
              >
                Sign in to NODEINE
              </Link>
            </div>
          </div>
        )}

        {loadState === "unavailable" && (
          <div className="mt-8 border border-rose-300/20 bg-rose-300/5 px-4 py-4 text-sm leading-6 text-rose-200">
            {error ?? "Saved artwork is unavailable right now."}
          </div>
        )}

        {loadState === "ready" && !savedArtworks.length && (
          <div className="mx-auto grid min-h-96 max-w-xl place-items-center text-center">
            <div>
              <span className="mx-auto grid size-16 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/8">
                <Bookmark className="size-7 text-cyan-300" />
              </span>
              <h2 className="mt-5 text-2xl font-light text-white">
                Your collection starts here
              </h2>
              <p className="mt-3 leading-7 text-zinc-400">
                Open any artwork and tap Save to build your private collection.
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex min-h-11 items-center rounded-lg border border-white/15 px-5 py-3 text-sm text-zinc-200 hover:border-cyan-300 hover:text-white"
              >
                Browse the archive
              </Link>
            </div>
          </div>
        )}

        {loadState === "ready" && savedArtworks.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {savedArtworks.map((artwork) => (
              <article
                key={artwork.id}
                className="group overflow-hidden rounded-xl border border-white/10 bg-black sm:rounded-lg"
              >
                <button
                  type="button"
                  onClick={() => {
                    setFocusMode(false);
                    setSelectedId(artwork.id);
                  }}
                  className="block w-full text-left outline-none transition active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300"
                  aria-label={`Open saved artwork ${artwork.title}`}
                >
                  <PolishedImage
                    src={artwork.thumb_src || artwork.src}
                    alt={artwork.title}
                    loading="lazy"
                    decoding="async"
                    wrapperClassName="aspect-[4/5] w-full"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <span className="block border-t border-white/10 px-3 py-3">
                    <span className="block truncate text-sm text-zinc-100">
                      {artwork.title}
                    </span>
                    <span className="mt-1 block truncate text-xs text-cyan-300">
                      {artwork.collection?.title ?? "NODEINE artwork"}
                    </span>
                  </span>
                </button>
                <div className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-2.5 text-xs text-zinc-500">
                  {artwork.creator ? (
                    <Link
                      href={`/creator/${artwork.creator.username}`}
                      className="truncate hover:text-cyan-200"
                    >
                      @{artwork.creator.username}
                    </Link>
                  ) : (
                    <span>NODEINE</span>
                  )}
                  <time dateTime={artwork.saved_at} className="shrink-0">
                    {formatSavedDate(artwork.saved_at)}
                  </time>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <MobileAppNavigation profileHref={profileHref} />

      {selectedArtwork && (
        <div
          className="fixed inset-0 z-50 bg-black/95 p-0 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={selectedArtwork.title}
          onClick={() => {
            setFocusMode(false);
            setSelectedId(null);
          }}
        >
          <div
            className="mx-auto grid h-full max-w-7xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-zinc-950 sm:rounded-lg sm:border sm:border-white/15"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex min-h-14 items-center justify-between gap-4 border-b border-white/10 px-4 sm:px-5">
              <p className="min-w-0 truncate text-xs uppercase tracking-[0.18em] text-zinc-500">
                Saved {selectedIndex + 1} of {savedArtworks.length}
              </p>
              <button
                type="button"
                onClick={() => {
                  setFocusMode(false);
                  setSelectedId(null);
                }}
                className="grid size-10 shrink-0 place-items-center text-2xl text-zinc-400 hover:text-white"
                aria-label="Close artwork"
                title="Close"
              >
                ×
              </button>
            </div>

            {focusMode ? (
              <ArtworkFocusView
                key={selectedArtwork.id}
                src={selectedArtwork.src}
                alt={selectedArtwork.title}
                onBack={() => setFocusMode(false)}
                onPrevious={
                  savedArtworks.length > 1 ? () => moveSelection(-1) : undefined
                }
                onNext={
                  savedArtworks.length > 1 ? () => moveSelection(1) : undefined
                }
              />
            ) : (
              <div className="min-h-0 overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-hidden">
                <div className="relative h-[60svh] min-h-80 overflow-hidden bg-black lg:h-auto lg:min-h-0">
                  <PolishedImage
                    key={selectedArtwork.src}
                    src={selectedArtwork.src}
                    alt={selectedArtwork.title}
                    wrapperClassName="absolute inset-0"
                    className="absolute inset-0 size-full object-contain p-3 sm:p-6"
                  />

                  {savedArtworks.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => moveSelection(-1)}
                        className="absolute left-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center bg-black/70 text-3xl text-white hover:bg-black sm:left-4"
                        aria-label="Previous saved artwork"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSelection(1)}
                        className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center bg-black/70 text-3xl text-white hover:bg-black sm:right-4"
                        aria-label="Next saved artwork"
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>

                <aside className="border-t border-white/10 p-5 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0 lg:p-7">
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">
                    {selectedArtwork.collection?.world_code || "Saved world"}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    {selectedArtwork.collection?.title}
                  </p>
                  <h2 className="mt-6 text-3xl font-light text-white">
                    {selectedArtwork.title}
                  </h2>
                  {selectedArtwork.creator && (
                    <Link
                      href={`/creator/${selectedArtwork.creator.username}`}
                      className="mt-3 inline-flex text-sm text-zinc-400 hover:text-cyan-200"
                    >
                      By {selectedArtwork.creator.display_name} · @
                      {selectedArtwork.creator.username}
                    </Link>
                  )}
                  {selectedArtwork.mood && (
                    <div className="mt-7 border-t border-white/10 pt-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                        Mood
                      </p>
                      <p className="mt-2 leading-7 text-zinc-300">
                        {selectedArtwork.mood}
                      </p>
                    </div>
                  )}
                  {!!selectedArtwork.tags?.length && (
                    <div className="mt-7 border-t border-white/10 pt-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                        Tags
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedArtwork.tags.map((tag) => (
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
                    <ArtworkLikeButton
                      key={`like-${selectedArtwork.id}`}
                      artworkId={selectedArtwork.id}
                    />
                    <ArtworkSaveButton
                      key={`save-${selectedArtwork.id}`}
                      artworkId={selectedArtwork.id}
                      onSavedChange={(isSaved) => {
                        if (!isSaved) removeFromView(selectedArtwork.id);
                      }}
                    />
                    <ArtworkShareButton
                      key={`share-${selectedArtwork.id}`}
                      artworkId={selectedArtwork.id}
                      artworkTitle={selectedArtwork.title}
                    />
                    <button
                      type="button"
                      onClick={() => setFocusMode(true)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-sm text-zinc-200 transition hover:border-cyan-300 hover:text-white"
                    >
                      View full artwork
                      <span aria-hidden="true">⛶</span>
                    </button>
                  </div>

                  <ArtworkComments
                    key={selectedArtwork.id}
                    artworkId={selectedArtwork.id}
                  />
                </aside>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
