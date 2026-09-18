"use client";

import { useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { moveViewingIndex, type ViewingArtwork } from "@/lib/artwork-viewing";
import ArtworkMedia from "./artwork-media";
import ArtworkFocusView from "./artwork-focus-view";
import styles from "./artwork-page-viewer.module.css";

export default function ArtworkPageViewer({ artwork, sequence, worldTitle }: {
  artwork: ViewingArtwork;
  sequence: ViewingArtwork[];
  worldTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const pieces = sequence.some(piece => piece.id === artwork.id) ? sequence : [artwork];
  const selected = pieces[index] ?? artwork;

  return <>
    <div ref={mediaRef} className="absolute inset-0"><ArtworkMedia src={artwork.src} posterSrc={artwork.thumb_src} mediaType={artwork.media_type}
      alt={artwork.title} wrapperClassName="absolute inset-0" className="absolute inset-0 size-full object-contain p-4 sm:p-8" />
    </div>
    <button ref={triggerRef} type="button" aria-label="View full size" onClick={() => {
      mediaRef.current?.querySelectorAll("video").forEach(video => video.pause());
      setIndex(pieces.findIndex(piece => piece.id === artwork.id)); setOpen(true);
    }} className="absolute right-4 top-4 z-10 inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/20 bg-black/85 px-3 text-sm text-white hover:border-cyan-300 focus-visible:outline-2 focus-visible:outline-cyan-300">
      <Maximize2 className="size-4" aria-hidden="true" /><span className="sm:hidden" aria-hidden="true">Enlarge</span><span className="hidden sm:inline" aria-hidden="true">View full size</span>
    </button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className={styles.viewer} showCloseButton={false} finalFocus={triggerRef}>
        <DialogTitle className="sr-only">Artwork viewer</DialogTitle>
        <DialogDescription className="sr-only">Browse {worldTitle}. Closing returns to {artwork.title}. Use Actual size to inspect image details.</DialogDescription>
        {open && <ArtworkFocusView src={selected.src} posterSrc={selected.thumb_src} mediaType={selected.media_type}
          alt={selected.title} backLabel="Close viewer" contextLabel={`${worldTitle} · ${index + 1} of ${pieces.length}`}
          onBack={() => setOpen(false)}
          onPrevious={pieces.length > 1 ? () => setIndex(current => moveViewingIndex(current, -1, pieces.length)) : undefined}
          onNext={pieces.length > 1 ? () => setIndex(current => moveViewingIndex(current, 1, pieces.length)) : undefined} />}
      </DialogContent>
    </Dialog>
  </>;
}
