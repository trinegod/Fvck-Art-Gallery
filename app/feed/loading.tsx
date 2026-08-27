export default function FeedLoading() {
  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-20 text-zinc-100">
      <div className="mx-auto max-w-3xl" role="status" aria-live="polite">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300">
          Tuning the signal
        </p>
        <div className="mt-6 aspect-[4/5] animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.04] motion-reduce:animate-none" />
        <span className="sr-only">Loading the NODEINE feed</span>
      </div>
    </main>
  );
}
