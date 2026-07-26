"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import ArtworkComments from "./components/artwork-comments";
import ArtworkFocusView from "./components/artwork-focus-view";
import ArtworkLikeButton from "./components/artwork-like-button";
import ArtworkSaveButton from "./components/artwork-save-button";
import ArtworkShareButton from "./components/artwork-share-button";
import CreatorNavigation from "./components/creator-navigation";
import PolishedImage from "./components/polished-image";

type CollectionRow = {
  id: string;
  owner_id: string;
  title: string;
  summary: string | null;
  world_code: string | null;
  sort_order: number | null;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

type ArtworkRow = {
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

const dystopiaItems = Array.from({ length: 14 }, (_, index) => ({
  id: `dystopia-${index + 1}`,
  title: `Dystopia ${String(index + 1).padStart(2, "0")}`,
  type: "image",
  src: `/art/art-${index + 1}.jpeg`,
  series: "Dystopia",
  category: "Original World",
  mood: "Cinematic future decay",
  model: "AI Generated",
  description:
    "A fragment from a collapsing future, preserved inside the Dystopia archive.",
  tags: ["dystopia", "future", "worldbuilding", "ai-art"],
}));

const renaissanceItems = Array.from({ length: 18 }, (_, index) => ({
  id: `renaissance-${index + 1}`,
  title: `Renaissance ${String(index + 1).padStart(2, "0")}`,
  type: "image",
  src: `/art/ren-${index + 1}.PNG`,
  series: "Renaissance",
  category: "Character World",
  mood: "Neo-renaissance character study",
  model: "AI Generated",
  description:
    "A character study from the Renaissance collection, archived as part of the TRINE visual worlds.",
  tags: ["renaissance", "character", "portrait", "ai-art"],
}));
const fashionItems = Array.from({ length: 60 }, (_, index) => ({
  id: `anime-fashion-${index + 1}`,
  title: `Anime, Girls & Fashion ${String(index + 1).padStart(2, "0")}`,
  type: "image",
  src: `/art/fash-${index + 1}.PNG`,
  series: "Anime, Girls & Fashion",
  category: "Style World",
  mood: "Expressive anime fashion study",
  model: "AI Generated",
  description:
    "A fashion-forward character study from the Anime, Girls & Fashion collection inside the TRINE Archive.",
  tags: ["anime", "girls", "fashion", "ai-art"],
}));
const cyberXItems = Array.from({ length: 5 }, (_, index) => ({
  id: `cyber-x-${index + 1}`,
  title: `Cyber X ${String(index + 1).padStart(2, "0")}`,
  type: "image",
  src: `/art/cyber-${index + 1}.PNG`,
  series: "Cyber X",
  category: "Cyber Retro",
  mood: "Retro cyberpunk doll study",
  model: "AI Generated",
  description:
    "A cyber-retro figure study from the Cyber X collection inside the TRINE Archive.",
  tags: ["cyberpunk", "retro", "figure", "ai-art"],
}));
const evangelionItems = Array.from({ length: 19 }, (_, index) => ({
  id: `evangelion-${index + 1}`,
  title: `Evangelion ${String(index + 1).padStart(2, "0")}`,
  type: "image",
  src: `/art/eva-${index + 1}.PNG`,
  series: "Evangelion",
  category: "Mecha World",
  mood: "Apocalyptic anime mecha study",
  model: "AI Generated",
  description:
    "A dramatic mecha-inspired study from the Evangelion collection inside the TRINE Archive.",
  tags: ["evangelion", "mecha", "anime", "ai-art"],
}));
const jojoItems = Array.from({ length: 16 }, (_, index) => ({
  id: `jojo-golden-wind-${index + 1}`,
  title: `JoJo: Golden Wind ${String(index + 1).padStart(2, "0")}`,
  type: "image",
  src: `/art/jojo-${index + 1}.PNG`,
  series: "JoJo: Golden Wind",
  category: "Anime World",
  mood: "Stylized golden action portrait",
  model: "AI Generated",
  description:
    "A stylized anime-inspired study from the JoJo: Golden Wind collection inside the TRINE Archive.",
  tags: ["jojo", "golden-wind", "anime", "ai-art"],
}));
const sailorScoutItems = Array.from({ length: 18 }, (_, index) => ({
  id: `sailor-scouts-${index + 1}`,
  title: `Sailor Scouts ${String(index + 1).padStart(2, "0")}`,
  type: "image",
  src: `/art/scout-${index + 1}.PNG`,
  series: "Sailor Scouts",
  category: "Sailor Moon",
  mood: "Moonlit magical guardian study",
  model: "AI Generated",
  description:
    "A moonlit magical guardian study of the Sailor Scouts from the Sailor Moon collection inside the TRINE Archive.",
  tags: ["sailor-moon", "sailor-scouts", "magical-girl", "ai-art"],
}));
const gundamWingItems = Array.from({ length: 27 }, (_, index) => ({
  id: `gundam-wing-${index + 1}`,
  title: `Gundam Wing ${String(index + 1).padStart(2, "0")}`,
  type: "image",
  src: `/art/gun-${index + 1}.${index + 1 === 12 ? "JPG" : "PNG"}`,
  series: "Gundam Wing",
  category: "Mecha World",
  mood: "Armored anime mecha study",
  model: "AI Generated",
  description:
    "An armored anime mecha study from the Gundam Wing collection inside the TRINE Archive.",
  tags: ["gundam-wing", "mecha", "anime", "ai-art"],
}));
const streetLifeItems = Array.from({ length: 28 }, (_, index) => ({
  id: `street-life-${index + 1}`,
  title: `Street Life ${String(index + 1).padStart(2, "0")}`,
  type: "image",
  src: `/art/ots-${index + 1}.PNG`,
  series: "Street Life",
  category: "Original World",
  mood: "Gritty urban survival study",
  model: "AI Generated",
  description:
    "A gritty urban story study from the Street Life collection inside the TRINE Archive.",
  tags: ["street-life", "urban", "survival", "ai-art"],
}));
const edgeRunnersItems = Array.from({ length: 38 }, (_, index) => ({
  id: `edge-runners-${index + 1}`,
  title: `Edge Runners ${String(index + 1).padStart(2, "0")}`,
  type: "image",
  src: `/art/edge-${index + 1}.PNG`,
  series: "Edge Runners",
  category: "Cyberpunk World",
  mood: "Neon street-runner anime study",
  model: "AI Generated",
  description:
    "A neon cyberpunk anime study from the Edge Runners collection inside the TRINE Archive.",
  tags: ["edge-runners", "cyberpunk", "anime", "ai-art"],
}));

const fallbackGalleryItems = [
  ...dystopiaItems,
  ...renaissanceItems,
  ...fashionItems,
  ...cyberXItems,
  ...evangelionItems,
  ...jojoItems,
  ...sailorScoutItems,
  ...gundamWingItems,
  ...streetLifeItems,
  ...edgeRunnersItems,
];

type GalleryItem = (typeof fallbackGalleryItems)[number];

function getThumbnail(src: string) {
  return src.replace("/art/", "/thumbs/");
}
const collectionDetails: Record<string, { order: number; summary: string }> = {
  "Edge Runners": {
    order: 1,
    summary: "Neon cyberpunk studies from a future built on speed, style, and survival.",
  },
  "Street Life": {
    order: 2,
    summary: "Original urban story studies shaped by pressure, ambition, and escape.",
  },
  Dystopia: {
    order: 3,
    summary: "Cinematic fragments from a collapsing future world.",
  },
  "Anime, Girls & Fashion": {
    order: 4,
    summary: "Stylized anime fashion portraits with expressive character energy.",
  },
  "Gundam Wing": {
    order: 5,
    summary: "Armored mecha studies inspired by war machines and anime futurism.",
  },
  Evangelion: {
    order: 6,
    summary: "Apocalyptic mecha studies with dramatic anime scale.",
  },
  "JoJo: Golden Wind": {
    order: 7,
    summary: "Golden action portraits with stylized anime attitude.",
  },
  "Sailor Scouts": {
    order: 8,
    summary: "Moonlit magical guardian studies from the Sailor Moon collection.",
  },
  Renaissance: {
    order: 9,
    summary: "Neo-renaissance character studies with portrait archive energy.",
  },
  "Cyber X": {
    order: 10,
    summary: "Cyber-retro figure studies with doll-like future styling.",
  },
};

export default function Home() {
  const [activeSeries, setActiveSeries] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [galleryItems, setGalleryItems] =
    useState<GalleryItem[]>(fallbackGalleryItems);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [databaseCollections, setDatabaseCollections] =
    useState<CollectionRow[]>([]);
  const [creatorProfiles, setCreatorProfiles] = useState<ProfileRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadGalleryFromSupabase() {
      if (!supabase) {
        setGalleryError("Missing Supabase environment variables.");
        return;
      }

      try {
        const [collectionsResult, artworksResult, profilesResult] =
          await Promise.all([
          supabase
            .from("collections")
            .select("id, owner_id, title, summary, world_code, sort_order")
            .order("sort_order"),
          supabase
            .from("artworks")
            .select(
              "id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order"
            )
            .order("sort_order"),
          supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url"),
          ]);

        if (collectionsResult.error) throw collectionsResult.error;
        if (artworksResult.error) throw artworksResult.error;
        if (profilesResult.error) throw profilesResult.error;

        const collectionRows =
          (collectionsResult.data ?? []) as CollectionRow[];
        const artworkRows = (artworksResult.data ?? []) as ArtworkRow[];
        const profileRows = (profilesResult.data ?? []) as ProfileRow[];
        const collectionById = new Map(
          collectionRows.map((collection) => [collection.id, collection])
        );
        const fallbackBySeries = new Map(
          fallbackGalleryItems.map((item) => [item.series, item])
        );

        const databaseGalleryItems = artworkRows
          .map((artwork) => {
            const collection = collectionById.get(artwork.collection_id);
            const series = collection?.title ?? "Unknown Collection";
            const fallbackItem = fallbackBySeries.get(series);
            const tags = artwork.tags ?? fallbackItem?.tags ?? [];

            return {
              id: artwork.id,
              title: artwork.title,
              type: artwork.media_type ?? "image",
              src: artwork.src,
              series,
              category: fallbackItem?.category ?? "AI World",
              mood:
                artwork.mood ??
                fallbackItem?.mood ??
                "AI-generated archive study",
              model: fallbackItem?.model ?? "AI Generated",
              description: `${artwork.title} from the ${series} collection inside The TRINE Archive.`,
              tags,
            };
          })
          .sort((a, b) => {
            const aCollection = collectionRows.find(
              (collection) => collection.title === a.series
            );
            const bCollection = collectionRows.find(
              (collection) => collection.title === b.series
            );

            return (
              (aCollection?.sort_order ?? 0) -
              (bCollection?.sort_order ?? 0)
            );
          });

        if (!cancelled && databaseGalleryItems.length) {
          setGalleryItems(databaseGalleryItems);
          setDatabaseCollections(collectionRows);
          setCreatorProfiles(profileRows);
          setGalleryError(null);
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Could not load Supabase gallery data.";
          setGalleryError(message);
        }
      }
    }

    loadGalleryFromSupabase();

    return () => {
      cancelled = true;
    };
  }, []);

  const seriesList = useMemo(
    () => Array.from(new Set(galleryItems.map((item) => item.series))),
    [galleryItems]
  );

  const collections = useMemo(
  () =>
    seriesList
      .map((series, index) => {
        const items = galleryItems.filter((item) => item.series === series);
        const coverItem = items[0];
        const databaseCollection = databaseCollections.find(
          (collection) => collection.title === series
        );
        const details = collectionDetails[series] ?? {
          order: index + 1,
          summary: coverItem.mood,
        };

        return {
          series,
          world:
            databaseCollection?.world_code ??
            `World ${String(details.order).padStart(3, "0")}`,
          order: databaseCollection?.sort_order ?? details.order,
          count: items.length,
          category: coverItem.category,
          mood: coverItem.mood,
          summary: databaseCollection?.summary ?? details.summary,
          cover: coverItem.src,
          tags: coverItem.tags,
          creator: databaseCollection
            ? creatorProfiles.find(
                (profile) => profile.id === databaseCollection.owner_id
              ) ?? null
            : null,
        };
      })
      .sort((a, b) => a.order - b.order),
  [seriesList, galleryItems, databaseCollections, creatorProfiles]
);

  const filteredItems = useMemo(
    () =>
      activeSeries
        ? galleryItems.filter((item) => item.series === activeSeries)
        : [],
    [activeSeries, galleryItems]
  );

  const selectedItem =
    galleryItems.find((item) => item.id === selectedId) ?? null;

  const activeCollection =
    collections.find((collection) => collection.series === activeSeries) ?? null;

  const activeTitle = "NODEINE";

  const activeSubtitle = activeSeries
    ? `${activeCollection?.count ?? 0} pieces from the ${activeSeries} collection.`
    : "Choose a collection from the archive.";

  const selectedIndex = selectedItem
    ? filteredItems.findIndex((item) => item.id === selectedItem.id)
    : -1;

  function showPrevious() {
    if (!filteredItems.length) return;
    const previousIndex =
      selectedIndex > 0 ? selectedIndex - 1 : filteredItems.length - 1;
    setSelectedId(filteredItems[previousIndex].id);
  }

  function showNext() {
    if (!filteredItems.length) return;
    const nextIndex =
      selectedIndex >= 0 ? (selectedIndex + 1) % filteredItems.length : 0;
    setSelectedId(filteredItems[nextIndex].id);
  }

  function openCollection(series: string) {
    setActiveSeries(series);
    setFocusMode(false);
    setSelectedId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToArchiveHome() {
    setActiveSeries(null);
    setFocusMode(false);
    setSelectedId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function browseWorlds() {
    setActiveSeries(null);
    setFocusMode(false);
    setSelectedId(null);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document
          .getElementById("archive-worlds")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  useEffect(() => {
    if (!selectedItem || !filteredItems.length) return;

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
      if (event.key === "ArrowLeft") {
        const previousIndex =
          selectedIndex > 0 ? selectedIndex - 1 : filteredItems.length - 1;
        setSelectedId(filteredItems[previousIndex].id);
      }
      if (event.key === "ArrowRight") {
        const nextIndex =
          selectedIndex >= 0 ? (selectedIndex + 1) % filteredItems.length : 0;
        setSelectedId(filteredItems[nextIndex].id);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [focusMode, selectedItem, selectedIndex, filteredItems]);

  return (
    <main
      id="archive-home"
      className="min-h-screen bg-zinc-950 pb-[calc(7rem+env(safe-area-inset-bottom))] text-zinc-100 lg:pb-0"
    >
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <header className="relative mb-7 flex flex-col gap-5 border-b border-white/10 pb-7 sm:mb-8 sm:gap-6 sm:pb-8">
          <CreatorNavigation
            hidden={Boolean(selectedItem)}
            onBrowseWorlds={browseWorlds}
            onGoHome={goToArchiveHome}
          />
          <div className="text-center">
            <h1 className="text-4xl font-light uppercase tracking-[0.22em] text-white sm:text-6xl">
              {activeTitle}
            </h1>
            <p className="mx-auto mt-3 w-fit text-xs font-medium uppercase tracking-[0.32em] text-cyan-200">
              The TRINE Archive
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-zinc-400">
              {activeSubtitle}
            </p>
          </div>

          {activeSeries && (
            <div className="flex min-w-0 flex-col items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setActiveSeries(null);
                  setSelectedId(null);
                }}
                className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:border-cyan-300 hover:text-white"
              >
                Back to collections
              </button>

              <div className="-mx-5 flex w-[calc(100%+2.5rem)] snap-x gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:w-auto sm:flex-wrap sm:justify-center sm:px-0">
                {seriesList.map((series) => (
                  <button
                    key={series}
                    type="button"
                    onClick={() => openCollection(series)}
                    className={`shrink-0 snap-start rounded-lg border px-4 py-2.5 text-center text-sm transition ${
                      activeSeries === series
                        ? "border-cyan-300 bg-cyan-300 text-zinc-950"
                        : "border-white/15 bg-white/5 text-zinc-300 hover:border-cyan-300/70 hover:text-white"
                    }`}
                  >
                    {series}
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        {galleryError && (
          <div className="mb-6 rounded-xl border border-amber-300/25 bg-amber-300/8 px-4 py-3 text-sm leading-6 text-amber-100/90">
            Using local fallback data while Supabase is unavailable:
            {" "}{galleryError}
          </div>
        )}

        {!activeSeries && (
  <section className="mb-8 grid gap-5 border-b border-white/10 pb-8 md:grid-cols-[1.2fr_0.8fr]">
    <div>
      <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
        Manifesto
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-white">
        Digital worlds, archived before they disappear.
      </h2>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
        NODEINE is a visual archive of AI-generated worlds, characters,
        fashion studies, street mythologies, and animated futures.
      </p>
    </div>

    <div className="grid grid-cols-3 gap-2.5 text-center sm:gap-3">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-4 sm:p-4">
        <p className="text-2xl font-semibold text-white">{collections.length}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
          Worlds
        </p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-4 sm:p-4">
        <p className="text-2xl font-semibold text-white">{galleryItems.length}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
          Pieces
        </p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-2 py-4 sm:p-4">
        <p className="text-2xl font-semibold text-white">AI</p>
        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
          Medium
        </p>
      </div>
    </div>
  </section>
)}
        {!activeSeries ? (
          <section
            id="archive-worlds"
            className="scroll-mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {collections.map((collection) => (
              <article
                key={collection.series}
                className="group overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] transition hover:-translate-y-1 hover:border-cyan-300/60"
              >
                <button
                  type="button"
                  onClick={() => openCollection(collection.series)}
                  className="block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-zinc-900">
                    <PolishedImage
                      src={getThumbnail(collection.cover)}
                      alt={collection.series}
                      loading="lazy"
                      decoding="async"
                      wrapperClassName="absolute inset-0"
                      className="h-full w-full object-cover object-[center_35%] transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">
                        {collection.world}
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">
                        {collection.series}
                      </h2>
                      <p className="mt-2 text-sm text-zinc-300">
                        {collection.count} pieces / {collection.category}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    <p className="text-sm text-zinc-400">
                      {collection.summary}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {collection.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-lg border border-white/10 px-2 py-1 text-xs text-zinc-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>

                {collection.creator && (
                  <Link
                    href={`/creator/${collection.creator.username}`}
                    className="flex items-center gap-3 border-t border-white/10 px-4 py-3 text-sm text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-black text-xs text-cyan-300">
                      {collection.creator.avatar_url ? (
                        <PolishedImage
                          src={collection.creator.avatar_url}
                          alt=""
                          wrapperClassName="h-full w-full"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        collection.creator.display_name
                          .charAt(0)
                          .toUpperCase()
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-zinc-200">
                        {collection.creator.display_name}
                      </span>
                      <span className="block truncate text-xs text-zinc-500">
                        @{collection.creator.username}
                      </span>
                    </span>
                    <span className="ml-auto text-xs uppercase tracking-[0.16em] text-cyan-300">
                      Profile
                    </span>
                  </Link>
                )}
              </article>
            ))}
          </section>
        ) : (
          <section>
            <div className="mb-5 text-center">
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
                {activeCollection?.world}
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-white">
                {activeSeries}
              </h2>
              {activeCollection?.creator && (
                <Link
                  href={`/creator/${activeCollection.creator.username}`}
                  className="mt-3 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-cyan-200"
                >
                  <span>By {activeCollection.creator.display_name}</span>
                  <span className="text-cyan-300">
                    @{activeCollection.creator.username}
                  </span>
                </Link>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setFocusMode(false);
                    setSelectedId(item.id);
                  }}
                  className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] text-left transition active:scale-[0.985] sm:rounded-lg sm:hover:-translate-y-1 sm:hover:border-cyan-300/60"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900">
                    <PolishedImage
                      src={getThumbnail(item.src)}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      wrapperClassName="absolute inset-0"
                      className="h-full w-full object-cover object-[center_38%] transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
                      <p className="text-[10px] uppercase tracking-[0.17em] text-cyan-200 sm:text-xs sm:tracking-[0.2em]">
                        {item.series}
                      </p>
                      <h2 className="mt-1 text-sm font-semibold leading-5 text-white sm:text-lg">
                        {item.title}
                      </h2>
                    </div>
                  </div>

                  <div className="hidden space-y-3 p-4 sm:block">
                    <p className="text-sm text-zinc-400">{item.mood}</p>
                    <div className="flex flex-wrap gap-2">
                      {item.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-lg border border-white/10 px-2 py-1 text-xs text-zinc-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </section>

            <footer className="mx-auto max-w-7xl border-t border-white/10 px-5 py-8 text-center sm:px-8">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-white">
          NODEINE
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.22em] text-cyan-200">
          The TRINE Archive
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-zinc-500">
          A visual archive of AI-generated worlds, characters, fashion studies,
          street mythologies, and animated futures. Built with Next.js, Vercel,
          and generative AI workflows.
        </p>
      </footer>
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-black/95 p-0 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={selectedItem.title}
          onClick={() => {
            setFocusMode(false);
            setSelectedId(null);
          }}
        >
          <div
            className="mx-auto grid h-full max-w-7xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden border-white/10 bg-zinc-950 sm:rounded-lg sm:border"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex min-h-14 items-center justify-between gap-4 border-b border-white/10 px-4 sm:px-5">
              <p className="min-w-0 truncate text-xs uppercase tracking-[0.18em] text-zinc-500">
                Artwork {selectedIndex + 1} of {filteredItems.length} · {selectedItem.series}
              </p>
              <button
                type="button"
                onClick={() => {
                  setFocusMode(false);
                  setSelectedId(null);
                }}
                className="grid h-10 w-10 shrink-0 place-items-center text-2xl text-zinc-400 hover:text-white"
                aria-label="Close artwork"
                title="Close"
              >
                ×
              </button>
            </div>

            {focusMode ? (
              <ArtworkFocusView
                key={selectedItem.id}
                src={selectedItem.src}
                alt={selectedItem.title}
                onBack={() => setFocusMode(false)}
                onPrevious={filteredItems.length > 1 ? showPrevious : undefined}
                onNext={filteredItems.length > 1 ? showNext : undefined}
              />
            ) : (
              <div className="min-h-0 overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-hidden">
                <div className="relative h-[60svh] min-h-80 overflow-hidden bg-black lg:h-auto lg:min-h-0">
                  <PolishedImage
                    key={selectedItem.src}
                    src={selectedItem.src}
                    alt={selectedItem.title}
                    wrapperClassName="absolute inset-0"
                    className="absolute inset-0 h-full w-full object-contain p-3 sm:p-6"
                  />
                </div>

                <aside className="border-t border-white/10 bg-zinc-950 p-5 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0">
              <div className="mb-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
                    {selectedItem.series}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                    Artwork {selectedIndex + 1} of {filteredItems.length}
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold text-white">
                    {selectedItem.title}
                  </h2>
                </div>
              </div>

              <p className="mb-6 text-sm leading-6 text-zinc-400">
                {selectedItem.description}
              </p>

              <div className="grid gap-3 border-y border-white/10 py-5 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-500">Category</span>
                  <span className="text-zinc-200">{selectedItem.category}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-500">Mood</span>
                  <span className="text-zinc-200">{selectedItem.mood}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-zinc-500">Model</span>
                  <span className="text-zinc-200">{selectedItem.model}</span>
                </div>
              </div>

              <div className="mt-5">
                <p className="mb-3 text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Tags
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div
                className="mt-6 flex flex-wrap items-start gap-3"
                aria-label="Artwork actions"
              >
                <ArtworkLikeButton
                  key={selectedItem.id}
                  artworkId={selectedItem.id}
                />
                <ArtworkSaveButton
                  key={`save-${selectedItem.id}`}
                  artworkId={selectedItem.id}
                />
                <ArtworkShareButton
                  key={`share-${selectedItem.id}`}
                  artworkId={selectedItem.id}
                  artworkTitle={selectedItem.title}
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
                key={selectedItem.id}
                artworkId={selectedItem.id}
              />

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={showPrevious}
                  className="rounded-lg border border-white/15 px-4 py-3 text-sm text-zinc-200 hover:border-cyan-300"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  className="rounded-lg border border-white/15 px-4 py-3 text-sm text-zinc-200 hover:border-cyan-300"
                >
                  Next
                </button>
              </div>
              <p className="mt-3 text-center text-xs text-zinc-600">
                Use ← → to browse · Esc to close
              </p>
                </aside>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
