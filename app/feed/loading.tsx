import WorldLoadingScreen from "../components/world-loading-screen";

export default function FeedLoading() {
  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-20 text-zinc-100">
      <div className="mx-auto max-w-3xl">
        <WorldLoadingScreen variant="inline" label="Loading the NODEINE feed…" />
        <div aria-hidden="true" className="mt-6 aspect-[4/5] animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.04] motion-reduce:animate-none" />
      </div>
    </main>
  );
}
