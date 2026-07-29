export default function MessagesLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-5 text-zinc-500">
      <div className="text-center">
        <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-white/10 border-t-cyan-300" />
        <p className="mt-4 text-sm">Opening your conversations...</p>
      </div>
    </main>
  );
}
