import Link from "next/link";
import { ArrowUpRight, Waypoints } from "lucide-react";
import type { RankedSignalTrailArtwork } from "@/lib/signal-trails";
import { ArtworkMediaBadge } from "./artwork-media";
import PolishedImage from "./polished-image";

export type ArtworkSignalTrailItem = RankedSignalTrailArtwork & {
  collectionTitle: string;
};

type ArtworkSignalTrailProps = {
  items: ArtworkSignalTrailItem[];
};

export default function ArtworkSignalTrail({
  items,
}: ArtworkSignalTrailProps) {
  if (!items.length) return null;

  return (
    <section className="border-t border-white/10 px-5 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-cyan-300">
              <Waypoints className="size-4" aria-hidden="true" />
              Signal Trail
            </p>
            <h2 className="mt-3 text-3xl font-light text-white sm:text-4xl">
              Follow the visual DNA
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
              Related works connected by world, mood, and shared visual language.
            </p>
          </div>
          <Link
            href="/threads"
            className="inline-flex min-h-11 items-center gap-2 self-start rounded-lg border border-white/15 px-4 py-2.5 text-sm text-zinc-200 transition hover:border-cyan-300 hover:text-white sm:self-auto"
          >
            Explore World Threads
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/artwork/${item.id}`}
              className="group overflow-hidden rounded-xl border border-white/10 bg-black outline-none transition hover:border-cyan-300/45 focus-visible:ring-2 focus-visible:ring-cyan-300"
              aria-label={`Open ${item.title}, connected because: ${item.reason}`}
            >
              <span className="relative block aspect-[4/5] overflow-hidden">
                <PolishedImage
                  src={item.thumbSrc || item.src}
                  alt={item.title}
                  loading="lazy"
                  decoding="async"
                  wrapperClassName="size-full"
                  className="size-full object-cover transition duration-500 group-hover:scale-105"
                />
                <ArtworkMediaBadge
                  mediaType={item.mediaType}
                  src={item.src}
                />
              </span>
              <span className="block border-t border-white/10 px-3 py-3">
                <span className="block truncate text-sm text-zinc-100">
                  {item.title}
                </span>
                <span className="mt-1 block truncate text-[11px] text-zinc-500">
                  {item.collectionTitle}
                </span>
                <span className="mt-2 block text-[10px] uppercase tracking-[0.14em] text-cyan-300">
                  {item.reason}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
