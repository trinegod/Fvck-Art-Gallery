"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  Bookmark,
  Compass,
  Plus,
  Search,
  Shuffle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  creatorName: string;
  creatorUsername: string | null;
};

type DiscoverViewProps = {
  artworks: DiscoverArtwork[];
};

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
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const filteredArtworks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedFilter = activeFilter.toLowerCase();

    return artworks.filter((artwork) => {
      const text = searchableText(artwork);
      const matchesQuery = !normalizedQuery || text.includes(normalizedQuery);
      const matchesFilter =
        activeFilter === "All" || text.includes(normalizedFilter);
      return matchesQuery && matchesFilter;
    });
  }, [activeFilter, artworks, query]);

  function surpriseMe() {
    const pool = filteredArtworks.length ? filteredArtworks : artworks;
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
          <nav className="flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] sm:gap-5 sm:text-xs sm:tracking-[0.18em]">
            <Link href="/" className="text-zinc-400 hover:text-white">
              Archive
            </Link>
            <Link href="/saved" className="text-zinc-400 hover:text-white">
              Saved
            </Link>
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
              Visual signal finder
            </p>
            <h1 className="mt-3 text-4xl font-light text-white sm:text-5xl">
              Discover the archive
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
              Search worlds, moods, creators, and visual ideas across NODEINE.
            </p>
          </div>
          <Button
            type="button"
            onClick={surpriseMe}
            disabled={!artworks.length}
            className="h-11 w-fit bg-cyan-300 px-4 text-zinc-950 hover:bg-cyan-200"
          >
            <Shuffle data-icon="inline-start" />
            Surprise me
          </Button>
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
              placeholder="Search artwork, worlds, moods, or creators"
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
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500" aria-live="polite">
            {filteredArtworks.length}{" "}
            {filteredArtworks.length === 1 ? "artwork" : "artworks"}
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

        {filteredArtworks.length ? (
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
                No signal found
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                Try another world, mood, or creator name.
              </p>
            </div>
          </div>
        )}
      </section>

      <nav
        aria-label="Discover navigation"
        className="fixed inset-x-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-40 grid grid-cols-4 rounded-[1.35rem] border border-white/12 bg-zinc-950/88 p-1.5 shadow-[0_18px_60px_rgba(0,0,0,.75)] backdrop-blur-2xl lg:hidden"
      >
        <Link
          href="/"
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-medium text-zinc-400 active:scale-95 hover:bg-white/5 hover:text-white"
        >
          <Archive className="size-4" />
          Archive
        </Link>
        <span className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl bg-cyan-300/10 text-[10px] font-semibold text-cyan-200">
          <Compass className="size-4" />
          Discover
        </span>
        <Link
          href="/saved"
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-medium text-zinc-400 active:scale-95 hover:bg-white/5 hover:text-white"
        >
          <Bookmark className="size-4" />
          Saved
        </Link>
        <Link
          href="/admin"
          className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-semibold text-cyan-200 active:scale-95 hover:bg-cyan-300/8"
        >
          <span className="grid size-8 place-items-center rounded-xl bg-cyan-300 text-zinc-950">
            <Plus className="size-4" />
          </span>
          Publish
        </Link>
      </nav>
    </main>
  );
}
