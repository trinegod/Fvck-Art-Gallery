"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type CreatorCollection = {
  id: string;
  title: string;
  summary: string | null;
  world_code: string | null;
  sort_order: number | null;
};

export type CreatorArtwork = {
  id: string;
  collection_id: string;
  title: string;
  src: string;
  thumb_src: string | null;
  mood: string | null;
  tags: string[] | null;
  sort_order: number | null;
};

type CreatorGalleryProps = {
  collections: CreatorCollection[];
  artworks: CreatorArtwork[];
};

export default function CreatorGallery({
  collections,
  artworks,
}: CreatorGalleryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const collectionsById = useMemo(
    () => new Map(collections.map((collection) => [collection.id, collection])),
    [collections]
  );

  const artworksByCollection = useMemo(() => {
    const grouped = new Map<string, CreatorArtwork[]>();

    for (const artwork of artworks) {
      const collectionArtworks = grouped.get(artwork.collection_id);
      if (collectionArtworks) {
        collectionArtworks.push(artwork);
      } else {
        grouped.set(artwork.collection_id, [artwork]);
      }
    }

    return grouped;
  }, [artworks]);

  const selectedIndex = selectedId
    ? artworks.findIndex((artwork) => artwork.id === selectedId)
    : -1;
  const selectedArtwork = selectedIndex >= 0 ? artworks[selectedIndex] : null;
  const selectedCollection = selectedArtwork
    ? collectionsById.get(selectedArtwork.collection_id)
    : null;

  const moveSelection = useCallback(
    (direction: -1 | 1) => {
      setSelectedId((currentId) => {
        if (!currentId || !artworks.length) return currentId;
        const currentIndex = artworks.findIndex(
          (artwork) => artwork.id === currentId
        );
        if (currentIndex < 0) return currentId;
        const nextIndex =
          (currentIndex + direction + artworks.length) % artworks.length;
        return artworks[nextIndex].id;
      });
    },
    [artworks]
  );

  useEffect(() => {
    if (!selectedId) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedId(null);
      if (event.key === "ArrowLeft") moveSelection(-1);
      if (event.key === "ArrowRight") moveSelection(1);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [moveSelection, selectedId]);

  if (!collections.length) {
    return (
      <div className="border-y border-white/10 py-20 text-center">
        <p className="text-sm text-zinc-500">
          This creator has not published a collection yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-20">
        {collections.map((collection) => {
          const collectionArtworks =
            artworksByCollection.get(collection.id) ?? [];

          return (
            <section key={collection.id}>
              <div className="mb-7 flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">
                    {collection.world_code || "Visual world"}
                  </p>
                  <h2 className="mt-2 text-2xl font-light text-white sm:text-3xl">
                    {collection.title}
                  </h2>
                  {collection.summary && (
                    <p className="mt-2 max-w-2xl leading-7 text-zinc-400">
                      {collection.summary}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-sm text-zinc-500">
                  {collectionArtworks.length} pieces
                </p>
              </div>

              {collectionArtworks.length ? (
                <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">
                  {collectionArtworks.map((artwork) => (
                    <button
                      key={artwork.id}
                      type="button"
                      onClick={() => setSelectedId(artwork.id)}
                      className="group mb-3 w-full break-inside-avoid overflow-hidden border border-white/10 bg-black text-left outline-none transition focus:border-cyan-300"
                      aria-label={`Open ${artwork.title}`}
                    >
                      <img
                        src={artwork.thumb_src || artwork.src}
                        alt={artwork.title}
                        loading="lazy"
                        decoding="async"
                        className="h-auto w-full transition duration-300 group-hover:opacity-90"
                      />
                      <span className="block border-t border-white/10 px-3 py-3">
                        <span className="block text-sm text-zinc-200">
                          {artwork.title}
                        </span>
                        {artwork.mood && (
                          <span className="mt-1 block text-xs leading-5 text-zinc-500">
                            {artwork.mood}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="py-10 text-sm text-zinc-500">
                  This collection is waiting for its first piece.
                </p>
              )}
            </section>
          );
        })}
      </div>

      {selectedArtwork && (
        <div
          className="fixed inset-0 z-50 bg-black/95 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={selectedArtwork.title}
          onClick={() => setSelectedId(null)}
        >
          <div
            className="mx-auto grid h-full max-w-7xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden border border-white/15 bg-zinc-950"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex min-h-14 items-center justify-between gap-4 border-b border-white/10 px-4 sm:px-5">
              <p className="min-w-0 truncate text-xs uppercase tracking-[0.18em] text-zinc-500">
                {selectedIndex + 1} / {artworks.length}
              </p>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="grid h-10 w-10 shrink-0 place-items-center text-2xl text-zinc-400 hover:text-white"
                aria-label="Close artwork"
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="grid min-h-0 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="relative grid min-h-0 place-items-center bg-black p-4 sm:p-8">
                <img
                  src={selectedArtwork.src}
                  alt={selectedArtwork.title}
                  className="max-h-full max-w-full object-contain"
                />

                {artworks.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => moveSelection(-1)}
                      className="absolute left-2 grid h-11 w-11 place-items-center bg-black/70 text-3xl text-white hover:bg-black sm:left-4"
                      aria-label="Previous artwork"
                      title="Previous"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSelection(1)}
                      className="absolute right-2 grid h-11 w-11 place-items-center bg-black/70 text-3xl text-white hover:bg-black sm:right-4"
                      aria-label="Next artwork"
                      title="Next"
                    >
                      ›
                    </button>
                  </>
                )}
              </div>

              <aside className="overflow-y-auto border-t border-white/10 p-5 lg:border-l lg:border-t-0 lg:p-7">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">
                  {selectedCollection?.world_code || "Visual world"}
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  {selectedCollection?.title}
                </p>
                <h3 className="mt-6 text-2xl font-light text-white">
                  {selectedArtwork.title}
                </h3>
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
              </aside>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
