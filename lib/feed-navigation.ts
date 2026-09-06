import { isFeedMode, type FeedMode } from "@/lib/feed";

export type FeedLocation = { mode: FeedMode; signalId: string | null };

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** The URL is authoritative, including a missing mode after browser Back. */
export function readFeedLocation(query: Pick<URLSearchParams, "get">): FeedLocation {
  const mode = query.get("mode") ?? undefined;
  const signalId = query.get("signal");
  return {
    mode: isFeedMode(mode) ? mode : "for-you",
    signalId: signalId && uuidPattern.test(signalId) ? signalId.toLowerCase() : null,
  };
}

export function feedRestoreCount(
  entryIds: readonly string[],
  signalId: string,
  visibleCount: number
) {
  const index = entryIds.indexOf(signalId);
  return index < 0 ? visibleCount : Math.max(visibleCount, index + 1);
}

type ObserverHandle = Pick<IntersectionObserver, "observe" | "disconnect">;
export type FeedObserverFactory = (
  callback: IntersectionObserverCallback,
  options: IntersectionObserverInit
) => ObserverHandle;

type FeedViewportOptions = {
  cards: Element[];
  sentinel: Element | null;
  hasMore: boolean;
  onActive: (id: string) => void;
  onLoadMore: () => void;
  createObserver?: FeedObserverFactory;
};

/** Bind only mounted cards. The caller rebinds when readiness or card identities change. */
export function observeFeedViewport({
  cards,
  sentinel,
  hasMore,
  onActive,
  onLoadMore,
  createObserver = typeof IntersectionObserver === "undefined"
    ? undefined
    : (callback, options) => new IntersectionObserver(callback, options),
}: FeedViewportOptions): () => void {
  if (!cards.length || !createObserver) return () => {};

  let disposed = false;
  const activeObserver = createObserver((observations) => {
    if (disposed) return;
    const visible = observations
      .filter((observation) => observation.isIntersecting)
      .sort((left, right) =>
        Math.abs(left.boundingClientRect.top) - Math.abs(right.boundingClientRect.top)
      )[0];
    const id = visible?.target.getAttribute("data-feed-entry");
    if (id) onActive(id);
  }, { rootMargin: "-18% 0px -58% 0px", threshold: 0.08 });
  cards.forEach((card) => activeObserver.observe(card));

  const paginationObserver = sentinel && hasMore
    ? createObserver(([entry]) => {
        if (!disposed && entry?.isIntersecting) onLoadMore();
      }, { rootMargin: "500px 0px" })
    : null;
  if (sentinel) paginationObserver?.observe(sentinel);

  return () => {
    disposed = true;
    activeObserver.disconnect();
    paginationObserver?.disconnect();
  };
}
