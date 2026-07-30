export default function ActivityLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-100">
      <div className="text-center">
        <div className="mx-auto size-9 animate-pulse rounded-full border border-cyan-300/30 bg-cyan-300/10" />
        <p className="mt-4 text-sm text-zinc-500">Reading the signal...</p>
      </div>
    </main>
  );
}
