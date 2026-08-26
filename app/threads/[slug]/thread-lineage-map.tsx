import Link from "next/link";
import { ArrowRight, Play, Waypoints } from "lucide-react";
import { isVideoArtwork } from "@/app/components/artwork-media";
import PolishedImage from "@/app/components/polished-image";
import {
  worldThreadItemAnchor,
  worldThreadRelationLabel,
  type WorldThread,
} from "@/lib/world-threads";

export default function ThreadLineageMap({ thread }: { thread: WorldThread }) {
  const videoCount = thread.items.filter((item) =>
    isVideoArtwork(item.artwork.mediaType, item.artwork.src)
  ).length;
  const mapLabel = videoCount === thread.items.length
    ? "Film continuity map"
    : videoCount > 0
      ? "Lineage & continuity map"
      : "Lineage map";

  return (
    <section
      aria-labelledby="lineage-map-title"
      className="border-b border-white/8 bg-white/[0.015] px-5 py-8 sm:px-8 sm:py-10"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300">
              <Waypoints className="size-3.5" aria-hidden="true" />
              {mapLabel}
            </p>
            <h2 id="lineage-map-title" className="mt-2 text-xl font-medium tracking-tight text-white sm:text-2xl">
              See the whole path before you walk it.
            </h2>
          </div>
          <p className="max-w-md text-xs leading-5 text-zinc-500">
            Open any node to jump to that moment. Its step stays in the URL, ready to share.
          </p>
        </div>

        <div className="mt-6 overflow-x-auto pb-3 [scrollbar-color:rgba(255,255,255,.18)_transparent]">
          <ol className="flex min-w-max items-center" aria-label={`${thread.title} lineage map`}>
            {thread.items.map((item, index) => {
              const isVideo = isVideoArtwork(
                item.artwork.mediaType,
                item.artwork.src
              );
              const relation = index === 0
                ? "Origin"
                : worldThreadRelationLabel(item.relationType);

              return (
                <li key={item.id} className="flex items-center">
                  {index > 0 && (
                    <div className="flex w-12 items-center px-1 text-zinc-700 sm:w-16" aria-hidden="true">
                      <span className="h-px flex-1 bg-white/12" />
                      <ArrowRight className="size-3 shrink-0" />
                    </div>
                  )}
                  <Link
                    href={`#${worldThreadItemAnchor(item.artwork.id)}`}
                    aria-label={`Go to step ${index + 1}, ${item.artwork.title}, connected by ${relation}`}
                    className="group grid w-44 grid-cols-[3.25rem_1fr] items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950/80 p-2.5 transition hover:border-cyan-300/35 hover:bg-cyan-300/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  >
                    <span className="relative block size-[3.25rem]">
                      <PolishedImage
                        src={item.artwork.thumbSrc || (isVideo ? "/video-placeholder.svg" : item.artwork.src)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        wrapperClassName="size-[3.25rem] overflow-hidden rounded-xl bg-black"
                        className="size-full object-cover transition duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      />
                      {isVideo && (
                        <span className="absolute bottom-1 right-1 grid size-5 place-items-center rounded-full border border-white/20 bg-black/80 text-white">
                          <Play className="size-2.5 fill-current" aria-hidden="true" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-300/75">
                        {String(index + 1).padStart(2, "0")} · {relation}
                      </span>
                      <span className="mt-1 block truncate text-xs font-medium text-zinc-200">
                        {item.artwork.title}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
