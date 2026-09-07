export type MessageScrollAnchor = {height: number; top: number};

type MessageViewport = Pick<HTMLElement, "scrollTop" | "scrollHeight" | "clientHeight"> & {
  scrollTo(options: ScrollToOptions): void;
};
type ViewportMessage = {id: string; sender_id: string};

export function isMessageViewportNearBottom(scroller: Pick<MessageViewport, "scrollTop" | "scrollHeight" | "clientHeight">) {
  return scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop <= 80;
}

/** Never scroll the document or another ancestor to reach a conversation row. */
export function scrollMessageViewportToEnd(scroller: MessageViewport, reducedMotion: boolean) {
  scroller.scrollTo({top: scroller.scrollHeight, behavior: reducedMotion ? "auto" : "smooth"});
}

/** Loading must not consume a marker; other people's arrivals must not displace a reader. */
export function syncMessageViewport({
  loading, scroller, anchor, messages, previousId, viewerId, following, unseenCount, reducedMotion,
}: {
  loading: boolean;
  scroller: MessageViewport | null;
  anchor: MessageScrollAnchor | null;
  messages: readonly ViewportMessage[];
  previousId: string | null;
  viewerId: string | null;
  following: boolean;
  unseenCount: number;
  reducedMotion: boolean;
}) {
  if (loading || !scroller) return {previousId, anchor, unseenCount};
  if (anchor) {
    scroller.scrollTop = anchor.top + scroller.scrollHeight - anchor.height;
  }
  const newestId = messages.at(-1)?.id ?? null;
  if (!newestId) return {previousId: null, anchor: null, unseenCount: 0};
  if (newestId === previousId) return {previousId, anchor: null, unseenCount};

  const previousIndex = messages.findIndex(message => message.id === previousId);
  // A cutoff or changed history window is not evidence of new arrivals.
  const arrivals = previousIndex < 0 ? [] : messages.slice(previousIndex + 1);
  const ownMessageArrived = arrivals.some(message => message.sender_id === viewerId);
  if (!previousId || ownMessageArrived || (following && !anchor)) {
    scrollMessageViewportToEnd(scroller, reducedMotion);
    return {previousId: newestId, anchor: null, unseenCount: 0};
  }
  return {
    previousId: newestId,
    anchor: null,
    unseenCount: unseenCount + arrivals.filter(message => message.sender_id !== viewerId).length,
  };
}
