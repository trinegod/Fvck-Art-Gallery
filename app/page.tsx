"use client";

import { useEffect, useMemo, useState } from "react";

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

const galleryItems = [
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

export default function Home() {
  const [activeSeries, setActiveSeries] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const seriesList = useMemo(
    () => Array.from(new Set(galleryItems.map((item) => item.series))),
    []
  );

  const collections = useMemo(
    () =>
      seriesList.map((series, index) => {
        const items = galleryItems.filter((item) => item.series === series);
        const coverItem = items[0];

        return {
          series,
          world: `World ${String(index + 1).padStart(3, "0")}`,
          count: items.length,
          category: coverItem.category,
          mood: coverItem.mood,
          cover: coverItem.src,
          tags: coverItem.tags,
        };
      }),
    [seriesList]
  );

  const filteredItems = activeSeries
    ? galleryItems.filter((item) => item.series === activeSeries)
    : [];

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
    setSelectedId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    if (!selectedItem) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedId(null);
      if (event.key === "ArrowLeft") showPrevious();
      if (event.key === "ArrowRight") showNext();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItem, selectedIndex, filteredItems]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <header className="mb-8 flex flex-col gap-6 border-b border-white/10 pb-8">
          <div className="text-center">
            <h1 className="text-4xl font-medium uppercase tracking-[0.18em] text-white sm:text-6xl">
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
            <div className="flex flex-col items-center gap-4">
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

              <div className="flex flex-wrap justify-center gap-2">
                {seriesList.map((series) => (
                  <button
                    key={series}
                    type="button"
                    onClick={() => openCollection(series)}
                    className={`rounded-lg border px-4 py-2 text-center text-sm transition ${
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

        {!activeSeries ? (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <button
                key={collection.series}
                type="button"
                onClick={() => openCollection(collection.series)}
                className="group overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] text-left transition hover:-translate-y-1 hover:border-cyan-300/60"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-zinc-900">
                  <img
                    src={collection.cover}
                    alt={collection.series}
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
                  <p className="text-sm text-zinc-400">{collection.mood}</p>
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className="group overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] text-left transition hover:-translate-y-1 hover:border-cyan-300/60"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900">
                    <img
                      src={item.src}
                      alt={item.title}
                      className="h-full w-full object-cover object-[center_38%] transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">
                        {item.series}
                      </p>
                      <h2 className="mt-1 text-lg font-semibold text-white">
                        {item.title}
                      </h2>
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
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

      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-black/90 p-4 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="mx-auto grid h-full max-w-7xl gap-4 lg:grid-cols-[1fr_360px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative min-h-0 overflow-hidden rounded-lg border border-white/10 bg-black">
              <img
                src={selectedItem.src}
                alt={selectedItem.title}
                className="h-full w-full object-contain"
              />
            </div>

            <aside className="overflow-y-auto rounded-lg border border-white/10 bg-zinc-950 p-5">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
                    {selectedItem.series}
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold text-white">
                    {selectedItem.title}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-300 hover:border-cyan-300 hover:text-white"
                >
                  Close
                </button>
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
            </aside>
          </div>
        </div>
      )}
    </main>
  );
}