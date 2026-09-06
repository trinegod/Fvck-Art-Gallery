export type MessageScrollAnchor = {height: number; top: number};

/** Synchronize only a mounted conversation: loading must not consume its scroll marker. */
export function syncMessageViewport({
  loading, target, scroller, anchor, newestId, previousId, reducedMotion,
}: {
  loading: boolean;
  target: Pick<HTMLElement, "scrollIntoView"> | null;
  scroller: Pick<HTMLElement, "scrollTop" | "scrollHeight"> | null;
  anchor: MessageScrollAnchor | null;
  newestId: string | null;
  previousId: string | null;
  reducedMotion: boolean;
}) {
  if (loading || !target) return {previousId, anchor};
  if (anchor && scroller) {
    scroller.scrollTop = anchor.top + scroller.scrollHeight - anchor.height;
    return {previousId, anchor: null};
  }
  if (newestId && newestId !== previousId) {
    target.scrollIntoView({behavior: reducedMotion ? "auto" : "smooth", block: "end"});
    return {previousId: newestId, anchor};
  }
  return {previousId, anchor};
}
