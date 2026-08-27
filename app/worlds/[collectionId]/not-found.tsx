import Link from "next/link";

export default function WorldNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-5 text-center text-zinc-100">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Unknown World</p>
        <h1 className="mt-4 text-3xl font-light text-white">This portal does not exist.</h1>
        <Link href="/feed" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-cyan-300 px-5 text-sm font-medium text-zinc-950">
          Return to feed
        </Link>
      </div>
    </main>
  );
}
