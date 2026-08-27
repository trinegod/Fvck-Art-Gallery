export default function WorldLoading() {
  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-20 text-zinc-100">
      <div className="mx-auto max-w-7xl" role="status">
        <div className="h-3 w-32 animate-pulse rounded bg-cyan-300/20 motion-reduce:animate-none" />
        <div className="mt-6 h-20 max-w-xl animate-pulse rounded-2xl bg-white/[0.05] motion-reduce:animate-none" />
        <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl bg-white/[0.04] motion-reduce:animate-none" />
          ))}
        </div>
        <span className="sr-only">Loading World</span>
      </div>
    </main>
  );
}
