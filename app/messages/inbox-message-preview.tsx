export default function InboxMessagePreview({ draft, preview }: {
  draft?: string;
  preview: string;
}) {
  if (!draft?.trim()) return <span className="min-w-0 flex-1 truncate text-sm text-zinc-500">{preview}</span>;
  return <span className="flex min-w-0 flex-1 items-baseline gap-1.5 text-sm" title="Unsent text, kept only in this open app. Refreshing, closing, or signing out clears it.">
    <span className="shrink-0 font-medium text-cyan-200">Draft:</span>
    <span className="min-w-0 truncate text-zinc-400">{draft}</span>
  </span>;
}
