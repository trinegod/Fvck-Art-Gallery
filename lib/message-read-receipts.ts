import { checkedMessageTimestamp, compareMessageTimestamps } from "./message-timestamp";
import { isMessageViewportNearBottom } from "./message-viewport";

type ReceiptMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  created_at: string;
  removed_at?: string | null;
};
type ReceiptMember = {
  conversation_id: string;
  profile_id: string;
  joined_at?: string | null;
  last_read_at?: string | null;
};
type Rectangle = Pick<DOMRect, "top" | "right" | "bottom" | "left">;

function validTimestamp(value?: string | null): value is string {
  if (!value) return false;
  try { checkedMessageTimestamp(value); return true; } catch { return false; }
}

/** Tombstones are visible history too: viewing them must clear their unread badge. */
export function newestDisplayedMessage<T extends ReceiptMessage>(messages: readonly T[], conversationId: string | null): T | null {
  let latest: T | null = null;
  for (const message of messages) {
    if (message.conversation_id !== conversationId || !validTimestamp(message.created_at)) continue;
    if (!latest || compareMessageTimestamps(message.created_at, latest.created_at) > 0 ||
      (compareMessageTimestamps(message.created_at, latest.created_at) === 0 && message.id.localeCompare(latest.id) > 0)) latest = message;
  }
  return latest;
}

export function newestReceiptMessage<T extends ReceiptMessage>(messages: readonly T[], conversationId: string | null, senderId?: string | null): T | null {
  return newestDisplayedMessage(messages.filter(message => !message.removed_at && (senderId === undefined || message.sender_id === senderId)), conversationId);
}

/** Seen means displayed in a foreground chat, not delivery or proof that audio was listened to. */
export function getMessageReadReceipt(message: ReceiptMessage | null, members: readonly ReceiptMember[], viewerId: string | null, kind: "direct" | "group") {
  if (!message || message.removed_at || message.sender_id !== viewerId || !validTimestamp(message.created_at)) return null;
  const recipients = new Map<string, { eligible: boolean; seen: boolean; unknownJoin: boolean }>();
  for (const member of members) {
    if (member.conversation_id !== message.conversation_id || !member.profile_id || member.profile_id === viewerId) continue;
    const recipient = recipients.get(member.profile_id) ?? { eligible: false, seen: false, unknownJoin: false };
    if (!validTimestamp(member.joined_at)) recipient.unknownJoin = true;
    else if (compareMessageTimestamps(member.joined_at, message.created_at) <= 0) {
      recipient.eligible = true;
      recipient.seen ||= validTimestamp(member.last_read_at) && compareMessageTimestamps(member.last_read_at, message.created_at) >= 0;
    }
    recipients.set(member.profile_id, recipient);
  }
  const eligible = [...recipients.values()].filter(member => member.eligible);
  const seenCount = eligible.filter(member => member.seen).length;
  // Unknown membership/read data cannot turn a partial receipt into "all".
  const allSeen = eligible.length > 0 && seenCount === eligible.length &&
    ![...recipients.values()].some(member => member.unknownJoin && !member.eligible);
  return {
    messageId: message.id,
    seenCount,
    eligibleCount: eligible.length,
    label: seenCount === 0 ? "Sent" : kind === "direct" ? "Seen" : allSeen ? "Seen by all" : `Seen by ${seenCount}`,
  };
}

/** Require real message content at the end of the visible history, not its header/metadata. */
export function isLatestMessageVisible({ visible, focused, scroller, history, content, viewport }: {
  visible: boolean;
  focused: boolean;
  scroller: Pick<HTMLElement, "scrollTop" | "scrollHeight" | "clientHeight">;
  history: Rectangle;
  content: Rectangle;
  viewport: Rectangle;
}) {
  if (!visible || !focused || !isMessageViewportNearBottom(scroller)) return false;
  const top = Math.max(history.top, viewport.top);
  const bottom = Math.min(history.bottom, viewport.bottom);
  const left = Math.max(history.left, viewport.left);
  const right = Math.min(history.right, viewport.right);
  const contentHeight = content.bottom - content.top;
  return contentHeight > 0 && content.right > content.left && bottom > top && right > left &&
    content.left < right && content.right > left && content.bottom <= bottom &&
    content.bottom - Math.max(content.top, top) >= Math.min(44, contentHeight);
}

/** Coalesce foreground observations; failed idempotent writes can retry on the next observation. */
export function createReadAcknowledgement({ isCurrent, persist, onSaved, onError }: {
  isCurrent(): boolean;
  persist(through: string, isCurrent: () => boolean): Promise<boolean>;
  onSaved(): void;
  onError(): void;
}) {
  let disposed = false;
  let saved: string | null = null;
  let pending: string | null = null;
  let running: Promise<void> | null = null;
  const current = () => !disposed && isCurrent();
  async function flush() {
    while (pending && current()) {
      const through = pending;
      pending = null;
      if (saved && compareMessageTimestamps(through, saved) <= 0) continue;
      try {
        if (!await persist(through, current) || !current()) return;
        saved = through;
        onSaved();
      } catch {
        if (current()) onError();
        // Do not spin on an unavailable backend. A later focus/scroll/online
        // event retries the latest visible row; SQL makes that retry monotonic.
        pending = null;
        return;
      }
    }
  }
  return {
    acknowledge(through: string): Promise<void> {
      if (!current() || !validTimestamp(through) || (saved && compareMessageTimestamps(through, saved) <= 0)) return Promise.resolve();
      if (!pending || compareMessageTimestamps(through, pending) > 0) pending = through;
      if (!running) running = flush().finally(() => { running = null; });
      return running;
    },
    dispose() { disposed = true; pending = null; },
  };
}

/** Browser events schedule one geometry check after layout; every listener/observer is released. */
export function observeLatestMessageVisibility({ scroller, content, isCurrent, onVisible }: {
  scroller: HTMLElement;
  content: HTMLElement;
  isCurrent(): boolean;
  onVisible(): void;
}) {
  const document = scroller.ownerDocument;
  const window = document.defaultView;
  if (!window) return () => {};
  let disposed = false;
  let frame: number | null = null;
  function check() {
    frame = null;
    if (disposed || !isCurrent() || !content.isConnected || !scroller.contains(content)) return;
    const history = scroller.getBoundingClientRect();
    const rectangle = content.getBoundingClientRect();
    const visual = window!.visualViewport;
    const viewport = {
      top: visual?.offsetTop ?? 0, left: visual?.offsetLeft ?? 0,
      bottom: (visual?.offsetTop ?? 0) + (visual?.height ?? window!.innerHeight),
      right: (visual?.offsetLeft ?? 0) + (visual?.width ?? window!.innerWidth),
    };
    if (!isLatestMessageVisible({ visible: document.visibilityState === "visible", focused: document.hasFocus(), scroller, history, content: rectangle, viewport })) return;
    const x = (Math.max(rectangle.left, history.left, viewport.left) + Math.min(rectangle.right, history.right, viewport.right)) / 2;
    const y = (Math.max(rectangle.top, history.top, viewport.top) + rectangle.bottom) / 2;
    // A dialog or another overlay covering the bubble is not a viewed message.
    const hit = document.elementFromPoint(x, y);
    if (hit && content.contains(hit)) onVisible();
  }
  function schedule() {
    if (!disposed && frame === null) frame = window!.requestAnimationFrame(check);
  }
  scroller.addEventListener("scroll", schedule, { passive: true });
  document.addEventListener("visibilitychange", schedule);
  document.addEventListener("focusin", schedule);
  window.addEventListener("focus", schedule);
  window.addEventListener("resize", schedule);
  window.addEventListener("online", schedule);
  window.visualViewport?.addEventListener("resize", schedule);
  window.visualViewport?.addEventListener("scroll", schedule);
  const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
  resize?.observe(scroller);
  resize?.observe(content);
  schedule();
  return () => {
    disposed = true;
    if (frame !== null) window.cancelAnimationFrame(frame);
    resize?.disconnect();
    scroller.removeEventListener("scroll", schedule);
    document.removeEventListener("visibilitychange", schedule);
    document.removeEventListener("focusin", schedule);
    window.removeEventListener("focus", schedule);
    window.removeEventListener("resize", schedule);
    window.removeEventListener("online", schedule);
    window.visualViewport?.removeEventListener("resize", schedule);
    window.visualViewport?.removeEventListener("scroll", schedule);
  };
}
