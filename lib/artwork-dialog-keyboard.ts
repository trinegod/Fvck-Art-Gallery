type ArtworkDialogKey = {
  key: string;
  defaultPrevented: boolean;
  modified: boolean;
  nestedDialog: boolean;
  ownsArrowKeys: boolean;
};

/** Browsing must not consume editing, media-seeking, or a child dialog's keys. */
export function artworkDialogDirection(event: ArtworkDialogKey): -1 | 1 | null {
  if (event.defaultPrevented || event.modified || event.nestedDialog || event.ownsArrowKeys) return null;
  if (event.key === "ArrowLeft") return -1;
  if (event.key === "ArrowRight") return 1;
  return null;
}
