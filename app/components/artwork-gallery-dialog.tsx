"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { artworkDialogDirection } from "@/lib/artwork-dialog-keyboard";
import styles from "./artwork-gallery-dialog.module.css";

type Props = {
  open: boolean;
  title: string;
  position: string;
  focusMode: boolean;
  onBackToDetails: () => void;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  returnFocus: RefObject<HTMLElement | null>;
  fallbackFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
};

/** One managed focus/scroll boundary for Archive, creator galleries and Saved. */
export default function ArtworkGalleryDialog({ open, title, position, focusMode,
  onBackToDetails, onClose, onPrevious, onNext, returnFocus, fallbackFocus, children }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusMode = useRef(focusMode);

  useEffect(() => {
    // Either view switch removes its activating control. Keep keyboard focus on
    // a stable control, without scrolling the gallery underneath.
    if (open && previousFocusMode.current !== focusMode) closeRef.current?.focus({ preventScroll: true });
    previousFocusMode.current = focusMode;
  }, [open, focusMode]);

  return <Dialog open={open} onOpenChange={(next, details) => {
    if (next) return;
    if (focusMode && details.reason === "escape-key") {
      details.cancel();
      onBackToDetails();
    } else onClose();
  }}>
    <DialogContent showCloseButton={false} className={styles.dialog}
      initialFocus={closeRef}
      finalFocus={() => returnFocus.current?.isConnected ? returnFocus.current : fallbackFocus?.current ?? true}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={event => {
        const target = event.target instanceof Element ? event.target : null;
        const direction = artworkDialogDirection({
          key: event.key, defaultPrevented: event.defaultPrevented,
          modified: event.altKey || event.ctrlKey || event.metaKey || event.shiftKey,
          nestedDialog: target?.closest('[role="dialog"]') !== event.currentTarget,
          ownsArrowKeys: Boolean(target?.closest('input, textarea, select, video, audio, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="slider"], [role="combobox"], [role="listbox"], [role="menu"], [role="tablist"]')),
        });
        if (direction === null) return;
        event.preventDefault();
        event.stopPropagation();
        if (direction === -1) onPrevious(); else onNext();
      }}>
      <DialogTitle className="sr-only">{title}</DialogTitle>
      <DialogDescription className="sr-only">Browse artwork with Previous and Next. Close returns to the artwork you opened. Escape returns from full size to details, then closes the viewer.</DialogDescription>
      <div className="mx-auto grid h-full max-w-7xl grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden border-white/10 bg-zinc-950 sm:rounded-lg sm:border">
        <div className="flex min-h-14 items-center justify-between gap-4 border-b border-white/10 px-4 sm:px-5">
          <p className="min-w-0 truncate text-xs uppercase tracking-[0.18em] text-zinc-500">{position}</p>
          <DialogClose ref={closeRef} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-2xl text-zinc-400 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300" aria-label="Close artwork" title="Close">×</DialogClose>
        </div>
        {children}
      </div>
    </DialogContent>
  </Dialog>;
}
