"use client";

import { useRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { SavedWorld } from "@/lib/saved-artwork";

export default function SavedFilters({ search, worldId, worlds, shown, total, onSearch, onWorld }: {
  search: string;
  worldId: string;
  worlds: SavedWorld[];
  shown: number;
  total: number;
  onSearch: (value: string) => void;
  onWorld: (value: string) => void;
}) {
  const searchRef = useRef<HTMLInputElement>(null);
  const active = Boolean(search.trim() || worldId !== "all");
  return <section aria-label="Find saved artwork" className="mt-6">
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-[1_1_16rem]">
        <label htmlFor="saved-search" className="mb-2 block text-xs text-zinc-400">Search saved artwork</label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
          <Input id="saved-search" ref={searchRef} type="search" value={search} onChange={event => onSearch(event.target.value)}
            placeholder="Title, World, creator or tag" autoComplete="off" spellCheck={false}
            className="h-auto min-h-11 bg-black py-2.5 pl-10 text-base md:text-base" />
        </div>
      </div>
      {(worlds.length > 1 || worldId !== "all") && <div className="min-w-0 flex-[1_1_12rem] sm:max-w-xs">
        <label htmlFor="saved-world" className="mb-2 block text-xs text-zinc-400">World</label>
        <NativeSelect id="saved-world" value={worldId} onChange={event => onWorld(event.target.value)}
          className="w-full [&>select]:h-auto [&>select]:min-h-11 [&>select]:bg-black [&>select]:py-2.5 [&>select]:text-base">
          <NativeSelectOption value="all">All Worlds</NativeSelectOption>
          {worlds.map(world => <NativeSelectOption key={world.id} value={world.id}>{world.title} ({world.count})</NativeSelectOption>)}
          {worldId !== "all" && !worlds.some(world => world.id === worldId) && <NativeSelectOption value={worldId}>World with no saved pieces</NativeSelectOption>}
        </NativeSelect>
      </div>}
    </div>
    <div className="mt-2 flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <p role="status" aria-live="polite" className="text-xs text-zinc-400">
        {active ? `${shown} of ${total} saved ${total === 1 ? "piece" : "pieces"}` : `${total} saved ${total === 1 ? "piece" : "pieces"}`} · Recently saved first
      </p>
      {active && <button type="button" onClick={() => { onSearch(""); onWorld("all"); searchRef.current?.focus(); }}
        className="min-h-11 rounded-lg px-2 text-sm text-cyan-200 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300">
        Clear filters
      </button>}
    </div>
  </section>;
}
