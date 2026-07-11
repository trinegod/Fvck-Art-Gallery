const galleryItems = Array.from({ length: 14 }, (_, index) => ({
  title: `Dystopia ${String(index + 1).padStart(2, "0")}`,
  type: "image",
  src: `/art/art-${index + 1}.jpeg`,
  series: "Dystopia",
  category: "World",
  model: "AI Generated",
  mood: "Cinematic future decay",
  tags: ["dystopia", "ai-art", "future", "worldbuilding"],
}));

export default function Home() {
  return (
    <main className="min-h-screen bg-[#08080c] px-6 py-8 text-white">
      <header className="mx-auto mb-10 max-w-7xl">
        <p className="text-sm uppercase tracking-[0.35em] text-fuchsia-300">
          AI Media Gallery
        </p>

        <h1 className="mt-4 max-w-4xl text-5xl font-bold tracking-tight md:text-7xl">
          A living gallery for AI images, videos, and prompts.
        </h1>

        <p className="mt-5 max-w-2xl text-lg text-white/60">
          Collect generated art, cinematic clips, model settings, and prompt
          ideas in one beautiful visual board.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {["Explore", "Images", "Videos", "Prompts", "Collections"].map(
            (item) => (
              <button
                key={item}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80"
              >
                {item}
              </button>
            )
          )}
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {galleryItems.map((item) => (
          <article
            key={item.title}
            className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]"
          >
            {item.type === "video" ? (
              <video
                src={item.src}
                controls
                muted
                playsInline
                className="h-72 w-full object-cover"
              />
            ) : (
              <img
                src={item.src}
                alt={item.title}
                className="h-72 w-full object-cover"
              />
            )}

            <div className="space-y-3 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                  {item.type} / {item.model}
                </p>
                <h2 className="mt-1 text-xl font-semibold">{item.title}</h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
