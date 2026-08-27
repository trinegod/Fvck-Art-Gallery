"use client";

export default function FeedError({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-5 text-zinc-100">
      <div className="max-w-md rounded-3xl border border-rose-300/20 bg-rose-300/5 p-8 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-rose-200">
          Signal interrupted
        </p>
        <h1 className="mt-4 text-2xl font-medium text-white">
          The feed could not connect.
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Your artwork is safe. Try reconnecting to the public archive.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 min-h-11 rounded-xl bg-cyan-300 px-5 text-sm font-medium text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
