"use client";

import { useEffect, useMemo, useState } from "react";

const galleryItems = Array.from({ length: 14 }, (_, index) => ({
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

export default function Home() {
  const [activeSeries, setActiveSeries] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const seriesList = useMemo(
    () => ["All", ...Array.from(new Set(galleryItems.map((item) => item.series)))],
    []
  );

  const filteredItems =
    activeSeries === "All"
      ? galleryItems
      : galleryItems.filter((item) => item.series === activeSeries);

  const selectedItem =
    galleryItems.find((item) => item.id === selectedId) ?? null;

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
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
              TRINE Archive / World 001
            </p>
            <h1 className="text-4xl font-semibold tracking-normal text-white sm:text-6xl">
              Dystopia
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
              A living gallery for AI images, videos, prompts, and visual worlds.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {seriesList.map((series) => (
              <button
                key={series}
                type="button"
                onClick={() => setActiveSeries(series)}
                className={`rounded-lg border px-4 py-2 text-sm transition ${
                  activeSeries === series
                    ? "border-cyan-300 bg-cyan-300 text-zinc-950"
                    : "border-white/15 bg-white/5 text-zinc-300 hover:border-cyan-300/70 hover:text-white"
                }`}
              >
                {series}
              </button>
            ))}
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
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
        </section>
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