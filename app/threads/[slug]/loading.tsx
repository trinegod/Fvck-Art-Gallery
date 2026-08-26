export default function WorldThreadLoading() {
  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-10 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-6xl animate-pulse motion-reduce:animate-none">
        <div className="h-9 w-36 rounded-full bg-white/8" />
        <div className="mt-24 h-3 w-44 rounded bg-cyan-300/10" />
        <div className="mt-5 h-16 max-w-3xl rounded-xl bg-white/8 sm:h-24" />
        <div className="mt-5 h-5 max-w-2xl rounded bg-white/5" />
        <div className="mt-24 h-[65svh] rounded-[1.75rem] border border-white/8 bg-white/[0.035]" />
      </div>
    </main>
  );
}
