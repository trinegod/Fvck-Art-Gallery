import Link from "next/link";
import { Plus } from "lucide-react";
import DesktopAppNavigation from "@/app/components/desktop-app-navigation";

export default function ThreadHeader() {
  return (
    <header className="border-b border-white/10 bg-zinc-950/90 px-5 py-4 backdrop-blur-xl sm:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Link
          href="/feed"
          className="inline-flex min-h-11 items-center text-lg font-light tracking-[0.24em] text-white transition-colors hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          NODEINE
        </Link>
        <div className="flex items-center gap-2">
          <DesktopAppNavigation />
          <Link
            href="/threads/new"
            className="nodeine-action inline-flex min-h-11 items-center gap-2 rounded-full bg-cyan-300 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-950 hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100"
          >
            <Plus className="size-4" aria-hidden="true" />
            New thread
          </Link>
        </div>
      </div>
    </header>
  );
}
