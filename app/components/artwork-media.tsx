import { Play } from "lucide-react";
import type { ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import PolishedImage from "./polished-image";

type ArtworkMediaProps = {
  src: string;
  posterSrc?: string | null;
  mediaType?: string | null;
  alt: string;
  wrapperClassName?: string;
  className?: string;
  imageClassName?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  preload?: "none" | "metadata" | "auto";
  loading?: ImgHTMLAttributes<HTMLImageElement>["loading"];
  decoding?: ImgHTMLAttributes<HTMLImageElement>["decoding"];
  fetchPriority?: ImgHTMLAttributes<HTMLImageElement>["fetchPriority"];
};

export function isVideoArtwork(
  mediaType: string | null | undefined,
  src: string
) {
  return (
    mediaType === "video" ||
    /\.(?:mp4|m4v|mov|webm)(?:[?#].*)?$/i.test(src)
  );
}

export function ArtworkMediaBadge({
  mediaType,
  src,
}: {
  mediaType?: string | null;
  src: string;
}) {
  if (!isVideoArtwork(mediaType, src)) return null;

  return (
    <span className="pointer-events-none absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/75 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white shadow-lg backdrop-blur">
      <Play className="size-3 fill-current" aria-hidden="true" />
      Video
    </span>
  );
}

export default function ArtworkMedia({
  src,
  posterSrc,
  mediaType,
  alt,
  wrapperClassName,
  className,
  imageClassName,
  autoPlay = false,
  loop = false,
  muted = false,
  preload = "metadata",
  loading,
  decoding,
  fetchPriority,
}: ArtworkMediaProps) {
  if (!isVideoArtwork(mediaType, src)) {
    return (
      <PolishedImage
        src={src}
        alt={alt}
        wrapperClassName={wrapperClassName}
        className={imageClassName ?? className}
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden bg-black",
        wrapperClassName
      )}
    >
      <video
        src={src}
        poster={posterSrc ?? undefined}
        controls
        playsInline
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        preload={preload}
        aria-label={alt}
        className={cn("size-full object-contain", className)}
      >
        Your browser does not support video playback.
      </video>
    </div>
  );
}
