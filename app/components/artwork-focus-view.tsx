"use client";

import { useState } from "react";
import ArtworkMedia, { isVideoArtwork } from "./artwork-media";
import PolishedImage from "./polished-image";

type ArtworkFocusViewProps = {
  src: string;
  posterSrc?: string | null;
  mediaType?: string | null;
  alt: string;
  onBack: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  backLabel?: string;
  contextLabel?: string;
};

export default function ArtworkFocusView({
  src,
  posterSrc,
  mediaType,
  alt,
  onBack,
  onPrevious,
  onNext,
  backLabel = "Back to details",
  contextLabel,
}: ArtworkFocusViewProps) {
  const [actualSize, setActualSize] = useState(false);
  const isVideo = isVideoArtwork(mediaType, src);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-black"
      onKeyDown={event => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        // Native video seeking and enlarged-image panning keep their arrow keys.
        event.stopPropagation();
        if (actualSize || isVideo) return;
        const move = event.key === "ArrowLeft" ? onPrevious : onNext;
        if (move) { event.preventDefault(); move(); }
      }}>
      <div className="z-20 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-zinc-950 px-3 pb-3 pt-[max(.75rem,env(safe-area-inset-top))] sm:px-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 bg-black/80 px-3.5 py-2 text-sm text-zinc-100 hover:border-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-300"
        >
          <span aria-hidden="true">←</span>
          {backLabel}
        </button>
        {contextLabel && <p role="status" className="order-last w-full min-w-0 text-center text-xs text-zinc-400 sm:order-none sm:w-auto sm:flex-1">
          <span className="block truncate text-zinc-100">{alt}</span><span>{contextLabel}</span>
        </p>}
        {!isVideo && (
          <button
            type="button"
            onClick={() => setActualSize((current) => !current)}
            className="inline-flex min-h-11 items-center rounded-lg border border-white/15 bg-black/80 px-3.5 py-2 text-sm text-zinc-100 hover:border-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-300"
            aria-pressed={actualSize}
          >
            {actualSize ? "Fit image" : "Actual size"}
          </button>
        )}
      </div>

      <div className="relative min-h-0 flex-1">
      {isVideo ? (
        <ArtworkMedia
          key={src}
          src={src}
          posterSrc={posterSrc}
          mediaType={mediaType}
          alt={alt}
          wrapperClassName="absolute inset-0 bg-black p-4 sm:p-8"
          className="max-h-full max-w-full"
        />
      ) : (
        <div
          className={
            actualSize
                ? "h-full w-full overflow-auto overscroll-contain p-4 sm:p-8"
                : "relative h-full w-full overflow-hidden"
          }
          tabIndex={actualSize ? 0 : undefined}
          role={actualSize ? "region" : undefined}
          aria-label={actualSize ? "Enlarged artwork; scroll to inspect" : undefined}
        >
          <PolishedImage
            key={src}
            src={src}
            alt={alt}
            draggable={false}
            onClick={() => setActualSize((current) => !current)}
            wrapperClassName={
              actualSize
                ? "relative block h-fit w-max min-h-full min-w-full overflow-visible! bg-black"
                : "absolute inset-0 bg-black"
            }
            className={
              actualSize
                ? "mx-auto block h-auto w-auto max-w-none cursor-zoom-out select-none"
                : "absolute inset-0 h-full w-full cursor-zoom-in select-none object-contain p-4 sm:p-8"
            }
          />
        </div>
      )}

      {onPrevious && onNext && !actualSize && (
        <>
          <button
            type="button"
            onClick={onPrevious}
            className="absolute left-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg bg-black/75 text-3xl text-white backdrop-blur hover:bg-black sm:left-4"
            aria-label="Previous artwork"
            title="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onNext}
            className="absolute right-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg bg-black/75 text-3xl text-white backdrop-blur hover:bg-black sm:right-4"
            aria-label="Next artwork"
            title="Next"
          >
            ›
          </button>
        </>
      )}
      </div>
    </div>
  );
}
