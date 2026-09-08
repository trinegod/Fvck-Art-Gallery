"use client";

import type { GroupMentionSuggestion } from "@/lib/group-mentions";

export default function GroupMentionSuggestions({ id, suggestions, onChoose, onDismiss }: {
  id: string;
  suggestions: readonly GroupMentionSuggestion[];
  onChoose: (username: string) => void;
  onDismiss: () => void;
}) {
  return <div id={id} role="group" aria-label="Mention suggestions"
    className="absolute bottom-full left-0 right-0 z-20 mb-2 max-h-[min(40dvh,16rem)] overflow-y-auto overscroll-contain rounded-xl border border-white/15 bg-zinc-950 p-1 shadow-xl">
    {suggestions.map(suggestion => <button type="button" key={suggestion.username}
      onMouseDown={event => event.preventDefault()}
      onClick={() => onChoose(suggestion.username)}
      onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); onDismiss(); return; }
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        event.preventDefault();
        const buttons = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button") ?? []);
        const position = buttons.indexOf(event.currentTarget);
        buttons[(position + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus();
      }}
      className="nodeine-action flex min-h-11 w-full min-w-0 flex-wrap items-center justify-between gap-x-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-100 hover:bg-cyan-300/10 focus-visible:bg-cyan-300/10 focus-visible:outline-2 focus-visible:outline-cyan-300">
      <span className="min-w-0 break-words">{suggestion.displayName}</span>
      <span className="break-all font-mono text-xs text-cyan-200">@{suggestion.username}</span>
    </button>)}
  </div>;
}
