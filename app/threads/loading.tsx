export default function ThreadsLoading() {
  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-8 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-7xl animate-pulse motion-reduce:animate-none">
        <div className="h-10 w-36 rounded-full bg-white/8" />
        <div className="mt-20 h-4 w-40 rounded bg-cyan-300/10" />
        <div className="mt-6 h-14 max-w-2xl rounded-xl bg-white/8 sm:h-20" />
        <div className="mt-4 h-5 max-w-xl rounded bg-white/5" />
        <div className="mt-24 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="aspect-[4/3] rounded-[1.75rem] border border-white/8 bg-white/[0.035]"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
