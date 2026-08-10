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
};

export default function ArtworkFocusView({
  src,
  posterSrc,
  mediaType,
  alt,
  onBack,
  onPrevious,
  onNext,
}: ArtworkFocusViewProps) {
  const [actualSize, setActualSize] = useState(false);
  const isVideo = isVideoArtwork(mediaType, src);

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-black">
      <div className="absolute left-3 right-3 top-3 z-20 flex items-center justify-between gap-3 sm:left-5 sm:right-5 sm:top-5">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 bg-black/80 px-3.5 py-2 text-sm text-zinc-100 backdrop-blur transition hover:border-cyan-300"
        >
          <span aria-hidden="true">←</span>
          Back to details
        </button>
        {!isVideo && (
          <button
            type="button"
            onClick={() => setActualSize((current) => !current)}
            className="inline-flex min-h-11 items-center rounded-lg border border-white/15 bg-black/80 px-3.5 py-2 text-sm text-zinc-100 backdrop-blur transition hover:border-cyan-300"
            aria-pressed={actualSize}
          >
            {actualSize ? "Fit image" : "Actual size"}
          </button>
        )}
      </div>

      {isVideo ? (
        <ArtworkMedia
          key={src}
          src={src}
          posterSrc={posterSrc}
          mediaType={mediaType}
          alt={alt}
          autoPlay
          wrapperClassName="absolute inset-0 bg-black px-4 pb-4 pt-20 sm:px-8 sm:pb-8 sm:pt-24"
          className="max-h-full max-w-full"
        />
      ) : (
        <div
          className={
            actualSize
              ? "h-full w-full overflow-auto overscroll-contain px-5 pb-8 pt-20 sm:px-8 sm:pt-24"
              : "relative h-full w-full overflow-hidden"
          }
        >
          <PolishedImage
            key={src}
            src={src}
            alt={alt}
            draggable={false}
            onClick={() => setActualSize((current) => !current)}
            wrapperClassName={
              actualSize
                ? "relative min-h-full min-w-full bg-black"
                : "absolute inset-0 bg-black"
            }
            className={
              actualSize
                ? "mx-auto block h-auto w-auto max-w-none cursor-zoom-out select-none"
                : "absolute inset-0 h-full w-full cursor-zoom-in select-none object-contain p-4 pt-20 sm:p-8 sm:pt-24"
            }
          />
        </div>
      )}

      {onPrevious && onNext && (
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
  );
}
