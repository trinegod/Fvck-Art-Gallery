import Link from "next/link";
import { Network, Plus } from "lucide-react";

export default function ThreadHeader() {
  return (
    <header className="border-b border-white/10 bg-zinc-950/90 px-5 py-4 backdrop-blur-xl sm:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Link
          href="/"
          className="text-lg font-light tracking-[0.24em] text-white transition-colors hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          NODEINE
        </Link>
        <nav
          aria-label="World Threads navigation"
          className="flex items-center gap-2 text-xs uppercase tracking-[0.16em]"
        >
          <Link
            href="/discover"
            className="hidden rounded-full px-3 py-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white sm:inline-flex"
          >
            Discover
          </Link>
          <Link
            href="/threads"
            className="hidden items-center gap-2 rounded-full px-3 py-2 text-cyan-200 transition-colors hover:bg-cyan-300/10 sm:inline-flex"
          >
            <Network className="size-3.5" aria-hidden="true" />
            Threads
          </Link>
          <Link
            href="/threads/new"
            className="nodeine-action inline-flex min-h-10 items-center gap-2 rounded-full bg-cyan-300 px-4 font-semibold text-zinc-950 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100"
          >
            <Plus className="size-4" aria-hidden="true" />
            New thread
          </Link>
        </nav>
      </div>
    </header>
  );
}
