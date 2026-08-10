"use client";

import Link from "next/link";
import { Bookmark, ExternalLink, LoaderCircle } from "lucide-react";
import PolishedImage from "../components/polished-image";
import type { SharedArtwork } from "./messages-types";

type ChatArtworkCardProps = {
  artwork: SharedArtwork;
  saved: boolean;
  saving: boolean;
  onSave: (artworkId: string) => Promise<void>;
};

export default function ChatArtworkCard({
  artwork,
  saved,
  saving,
  onSave,
}: ChatArtworkCardProps) {
  return (
    <article className="w-[min(72vw,330px)] overflow-hidden rounded-2xl border border-white/12 bg-zinc-950 text-left shadow-2xl shadow-black/30">
      <Link
        href={`/artwork/${artwork.id}`}
        className="nodeine-action block bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300"
        aria-label={`Open ${artwork.title}`}
      >
        {artwork.media_type === "video" ? (
          <video
            src={artwork.src}
            poster={artwork.thumb_src ?? undefined}
            controls
            playsInline
            preload="metadata"
            className="aspect-[4/5] w-full object-cover"
          />
        ) : (
          <PolishedImage
            src={artwork.thumb_src ?? artwork.src}
            alt={artwork.title}
            wrapperClassName="aspect-[4/5] w-full"
            className="size-full object-cover"
          />
        )}
      </Link>

      <div className="p-3.5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300">
          Shared from the archive
        </p>
        <h3 className="mt-1.5 line-clamp-2 text-sm font-medium leading-5 text-white">
          {artwork.title}
        </h3>
        {artwork.mood && (
          <p className="mt-1 line-clamp-1 text-xs text-zinc-600">
            {artwork.mood}
          </p>
        )}

        <div className="mt-3 flex gap-2">
          <Link
            href={`/artwork/${artwork.id}`}
            className="nodeine-action inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/12 px-3 text-xs text-zinc-300 hover:border-cyan-300/40 hover:text-cyan-200"
          >
            <ExternalLink className="size-3.5" />
            Open
          </Link>
          <button
            type="button"
            onClick={() => onSave(artwork.id)}
            disabled={saved || saving}
            className={`nodeine-action inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs disabled:cursor-default ${
              saved
                ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-200"
                : "border-white/12 text-zinc-300 hover:border-cyan-300/40 hover:text-cyan-200"
            }`}
          >
            {saving ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <Bookmark
                className="size-3.5"
                fill={saved ? "currentColor" : "none"}
              />
            )}
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
    </article>
  );
}
