import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { WorldThread } from "@/lib/world-threads";
import { appendFeedReturnContext, type FeedReturnContext } from "@/lib/feed-return";
import PolishedImage from "./polished-image";
import { ArtworkMediaBadge } from "./artwork-media";

export default function ArtworkThreadStrip({ thread, artworkId, feedReturn }: {
  thread: WorldThread;
  artworkId: string;
  feedReturn: FeedReturnContext | null;
}) {
  const href = (path: string) => feedReturn ? appendFeedReturnContext(path, feedReturn) : path;
  // Show the distinguishing detail name only when every title shares a literal
  // title prefix. Accessible link names still retain the complete artwork title.
  const sharedTitle = thread.items.map(item => item.artwork.title).find(title =>
    thread.items.every(item => item.artwork.title === title || item.artwork.title.startsWith(`${title} — `))
  );
  return <section aria-label="Creator-connected artwork" className="mt-4 min-w-0 border-b border-white/10 pb-3">
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-xs font-medium text-zinc-300">Connected by the creator</h2>
      <Link href={href(`/threads/${thread.slug}`)} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-xs text-cyan-200 hover:text-white">
        View Thread<ArrowUpRight className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
    <p className="mb-3 text-xs leading-5 text-zinc-400">{thread.title}</p>
    <nav aria-label="Pieces in this Thread" className="flex gap-2 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]">
      {[...thread.items].sort((a, b) => a.position - b.position).map(item => {
        const current = item.artwork.id === artworkId;
        const title = sharedTitle && item.artwork.title !== sharedTitle
          ? item.artwork.title.slice(sharedTitle.length + 3) : item.artwork.title;
        const content = <><span className="relative block aspect-square overflow-hidden rounded-lg border border-white/15">
          <PolishedImage src={item.artwork.thumbSrc || item.artwork.src} alt="" loading="lazy" wrapperClassName="size-full" className="size-full object-cover" />
          <ArtworkMediaBadge mediaType={item.artwork.mediaType} src={item.artwork.src} />
        </span><span className="mt-1.5 line-clamp-2 text-[11px] leading-4" title={item.artwork.title}>{title}</span></>;
        return current
          ? <span key={item.id} aria-current="true" aria-label={`${item.artwork.title}, current artwork`} className="w-20 shrink-0 text-cyan-200 [&>span:first-child]:border-cyan-300">{content}</span>
          : <Link key={item.id} href={href(`/artwork/${item.artwork.id}`)} aria-label={`View ${item.artwork.title}`} className="w-20 shrink-0 rounded-lg text-zinc-400 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300">{content}</Link>;
      })}
    </nav>
  </section>;
}
