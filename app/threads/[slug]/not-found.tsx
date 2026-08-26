import Link from "next/link";
import { Network } from "lucide-react";

export default function WorldThreadNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-5 text-zinc-100">
      <div className="max-w-md text-center">
        <Network className="mx-auto size-8 text-zinc-600" aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-medium">World Thread not found</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          This visual path may have moved, remained a private draft, or ended.
        </p>
        <Link href="/threads" className="mt-6 inline-flex min-h-10 items-center rounded-full bg-cyan-300 px-5 text-sm font-semibold text-zinc-950 hover:bg-cyan-200">
          Browse World Threads
        </Link>
      </div>
    </main>
  );
}
