import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { persistConversationRead } from "../lib/message-history";
import { createReadAcknowledgement, getMessageReadReceipt, isLatestMessageVisible, newestDisplayedMessage, newestReceiptMessage, observeLatestMessageVisibility } from "../lib/message-read-receipts";

const before = "2026-09-07T12:00:00.123100+00:00";
const sentAt = "2026-09-07T12:00:00.123900+00:00";
const after = "2026-09-07T12:00:00.123901+00:00";
const message = { id: "message", conversation_id: "chat", sender_id: "me", created_at: sentAt, removed_at: null as string | null };
const member = (profile_id: string, last_read_at: string | null = null, joined_at: string | null = before) => ({ conversation_id: "chat", profile_id, last_read_at, joined_at });

test("direct receipts use precise stored watermarks, not delivery or millisecond rounding", () => {
  assert.equal(getMessageReadReceipt(message, [member("other")], "me", "direct")?.label, "Sent");
  assert.equal(getMessageReadReceipt(message, [member("other", before)], "me", "direct")?.label, "Sent");
  assert.equal(getMessageReadReceipt(message, [member("other", sentAt)], "me", "direct")?.label, "Seen");
  assert.equal(getMessageReadReceipt(message, [member("other", "2026-09-07T05:00:00.123900-07:00")], "me", "direct")?.label, "Seen");
});

test("group receipts count unique eligible other profiles and preserve unknown readers", () => {
  const members = [member("me", after), member("one", after), member("one", after), member("two"), member("late", after, after)];
  assert.deepEqual(getMessageReadReceipt(message, members, "me", "group"), { messageId: "message", label: "Seen by 1", seenCount: 1, eligibleCount: 2 });
  assert.equal(getMessageReadReceipt(message, [...members, member("two", after)], "me", "group")?.label, "Seen by all");
  assert.equal(getMessageReadReceipt(message, [member("late", after, after)], "me", "group")?.label, "Sent");
});

test("missing, invalid, and foreign membership data never invents Seen or Seen by all", () => {
  assert.equal(getMessageReadReceipt(message, [], "me", "direct")?.label, "Sent");
  assert.equal(getMessageReadReceipt(message, [member("one", "not-a-date")], "me", "group")?.label, "Sent");
  assert.equal(getMessageReadReceipt(message, [member("one", after), member("unknown", after, null)], "me", "group")?.label, "Seen by 1");
  assert.equal(getMessageReadReceipt(message, [{ ...member("one", after), conversation_id: "different" }, member("", after)], "me", "group")?.label, "Sent");
});

test("only the newest own nonremoved row gets a receipt, independent of arrival ordering", () => {
  const later = { ...message, id: "later", created_at: after };
  const received = { ...later, id: "incoming", sender_id: "other" };
  const removed = { ...later, id: "removed", removed_at: after };
  const foreign = { ...later, id: "foreign", conversation_id: "old-chat" };
  assert.equal(newestReceiptMessage([later, message, received, removed, foreign], "chat", "me")?.id, "later");
  assert.equal(newestReceiptMessage([message, removed, foreign], "chat")?.id, "message");
  assert.equal(newestReceiptMessage([], "chat", "me"), null);
  assert.equal(getMessageReadReceipt(removed, [member("other", after)], "me", "direct"), null);
  assert.equal(getMessageReadReceipt(received, [member("other", after)], "me", "direct"), null);
});

test("invalid timestamps cannot create a receipt and exact ties use deterministic message IDs", () => {
  assert.equal(getMessageReadReceipt({ ...message, created_at: "invalid" }, [], "me", "direct"), null);
  assert.equal(newestReceiptMessage([{ ...message, created_at: "invalid" }], "chat"), null);
  assert.equal(newestReceiptMessage([{ ...message, id: "b" }, { ...message, id: "a" }], "chat")?.id, "b");
});

test("visible tombstones advance read position without receiving a Seen label", async () => {
  const removed = { ...message, id: "removed", created_at: after, removed_at: after };
  const writes: string[] = [];
  const acknowledgement = createReadAcknowledgement({
    isCurrent: () => true,
    persist: async through => { writes.push(through); return true; },
    onSaved() {}, onError() { assert.fail("No failure expected"); },
  });
  for (const history of [[message, removed], [removed]]) {
    const visibleRow = newestDisplayedMessage(history, "chat");
    assert.equal(visibleRow?.id, "removed");
    await acknowledgement.acknowledge(visibleRow!.created_at);
    assert.equal(getMessageReadReceipt(visibleRow, [member("other", after)], "me", "direct"), null);
  }
  assert.deepEqual(writes, [after]);
  assert.equal(newestReceiptMessage([removed], "chat", "me"), null);
  assert.equal(newestDisplayedMessage([removed], "another-chat"), null);
  acknowledgement.dispose();
});

const visible = {
  visible: true, focused: true,
  scroller: { scrollTop: 1200, scrollHeight: 1600, clientHeight: 400 },
  history: { top: 100, bottom: 500, left: 0, right: 390 },
  content: { top: 380, bottom: 450, left: 70, right: 350 },
  viewport: { top: 0, bottom: 700, left: 0, right: 390 },
};

test("a rendered latest message is readable only in a visible focused history near its end", () => {
  assert.equal(isLatestMessageVisible(visible), true);
  assert.equal(isLatestMessageVisible({ ...visible, visible: false }), false);
  assert.equal(isLatestMessageVisible({ ...visible, focused: false }), false);
  assert.equal(isLatestMessageVisible({ ...visible, scroller: { ...visible.scroller, scrollTop: 800 } }), false);
});

test("a header, clipped row, metadata-only edge, or offscreen panel is not the message", () => {
  assert.equal(isLatestMessageVisible({ ...visible, content: { ...visible.content, top: 520, bottom: 580 } }), false);
  assert.equal(isLatestMessageVisible({ ...visible, content: { ...visible.content, top: 10, bottom: 110 } }), false);
  assert.equal(isLatestMessageVisible({ ...visible, content: { ...visible.content, top: 90, bottom: 100 } }), false);
  assert.equal(isLatestMessageVisible({ ...visible, content: { ...visible.content, left: 400, right: 550 } }), false);
  assert.equal(isLatestMessageVisible({ ...visible, content: { ...visible.content, top: 450 } }), false);
  assert.equal(isLatestMessageVisible({ ...visible, viewport: { ...visible.viewport, bottom: 350 } }), false);
});

test("long multiline content can be displayed at its bottom and the visual keyboard viewport is respected", () => {
  assert.equal(isLatestMessageVisible({ ...visible, content: { ...visible.content, top: -500 } }), true);
  assert.equal(isLatestMessageVisible({ ...visible, viewport: { top: 420, bottom: 700, left: 0, right: 390 } }), false);
  assert.equal(isLatestMessageVisible({ ...visible, content: { ...visible.content, top: 425 } }), true);
});

test("acknowledgement coalesces duplicate observations and preserves microsecond progress", async () => {
  const writes: string[] = [];
  let release!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  const tracker = createReadAcknowledgement({ isCurrent: () => true, persist: async through => { writes.push(through); if (writes.length === 1) await blocked; return true; }, onSaved() {}, onError() { assert.fail("No failure expected"); } });
  const first = tracker.acknowledge(before);
  tracker.acknowledge(before);
  tracker.acknowledge(after);
  tracker.acknowledge(sentAt);
  release();
  await first;
  await tracker.acknowledge(after);
  await tracker.acknowledge(before);
  assert.deepEqual(writes, [before, after]);
});

test("a failed write is not remembered as saved and a later foreground observation retries safely", async () => {
  let writes = 0;
  const feedback: string[] = [];
  const tracker = createReadAcknowledgement({ isCurrent: () => true, persist: async () => { if (++writes === 1) throw new Error("offline"); return true; }, onSaved() { feedback.push("saved"); }, onError() { feedback.push("failed"); } });
  await tracker.acknowledge(sentAt);
  assert.deepEqual(feedback, ["failed"]);
  await tracker.acknowledge(sentAt);
  assert.deepEqual(feedback, ["failed", "saved"]);
  await tracker.acknowledge(sentAt);
  assert.equal(writes, 2);
});

test("account/chat changes and disposal suppress late UI changes and pending writes", async () => {
  let current = true;
  let release!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  const writes: string[] = [];
  const tracker = createReadAcknowledgement({ isCurrent: () => current, persist: async through => { writes.push(through); await blocked; return true; }, onSaved() { assert.fail("Stale success"); }, onError() { assert.fail("Stale failure"); } });
  const first = tracker.acknowledge(sentAt);
  tracker.acknowledge(after);
  current = false;
  release();
  await first;
  await tracker.acknowledge(after);
  tracker.dispose();
  current = true;
  await tracker.acknowledge(after);
  assert.deepEqual(writes, [sentAt]);
});

test("a persisted foreground observation sends the exact SQL timestamp and monotonic account-scoped filter", async () => {
  const requests: { url: URL; body: unknown }[] = [];
  const database = createClient("https://fixture.invalid", "fixture", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input, init) => {
      requests.push({ url: new URL(String(input)), body: JSON.parse(String(init?.body)) });
      return new Response(null, { status: 204 });
    } },
  });
  const tracker = createReadAcknowledgement({ isCurrent: () => true, persist: (through, current) => persistConversationRead(database, "me", "chat", through, current), onSaved() {}, onError() { assert.fail("Unexpected persistence error"); } });
  await tracker.acknowledge(sentAt);
  await tracker.acknowledge(before);
  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].body, { last_read_at: sentAt });
  assert.equal(requests[0].url.searchParams.get("profile_id"), "eq.me");
  assert.equal(requests[0].url.searchParams.get("conversation_id"), "eq.chat");
  assert.equal(requests[0].url.searchParams.get("or"), `(last_read_at.is.null,last_read_at.lt.${sentAt})`);
});

function browserFixture() {
  const frames = new Map<number, FrameRequestCallback>();
  let frameId = 0;
  let focused = true;
  let covered = false;
  const window = Object.assign(new EventTarget(), {
    innerWidth: 390, innerHeight: 700,
    visualViewport: Object.assign(new EventTarget(), { offsetTop: 0, offsetLeft: 0, height: 700, width: 390 }),
    requestAnimationFrame(callback: FrameRequestCallback) { const id = ++frameId; frames.set(id, callback); return id; },
    cancelAnimationFrame(id: number) { frames.delete(id); },
  });
  const content = { isConnected: true, getBoundingClientRect: () => visible.content, contains: (element: unknown) => element === content };
  const document = Object.assign(new EventTarget(), { defaultView: window, visibilityState: "visible", hasFocus: () => focused, elementFromPoint: () => covered ? {} : content });
  const scroller = Object.assign(new EventTarget(), { ...visible.scroller, ownerDocument: document, contains: (element: unknown) => element === content, getBoundingClientRect: () => visible.history });
  const flush = () => { const callbacks = [...frames.values()]; frames.clear(); for (const callback of callbacks) callback(1); };
  return { window, document, content, scroller, frames, flush, focus(value: boolean) { focused = value; }, cover(value: boolean) { covered = value; } };
}

test("visibility observer waits for render, foreground/focus and scrolling to latest; overlays block Seen", () => {
  const fixture = browserFixture();
  fixture.document.visibilityState = "hidden";
  let observations = 0;
  const stop = observeLatestMessageVisibility({ scroller: fixture.scroller as unknown as HTMLElement, content: fixture.content as unknown as HTMLElement, isCurrent: () => true, onVisible() { observations++; } });
  assert.equal(observations, 0);
  fixture.flush();
  assert.equal(observations, 0);
  fixture.document.visibilityState = "visible";
  fixture.focus(false);
  fixture.document.dispatchEvent(new Event("visibilitychange"));
  fixture.flush();
  assert.equal(observations, 0);
  fixture.focus(true);
  fixture.scroller.scrollTop = 500;
  fixture.window.dispatchEvent(new Event("focus"));
  fixture.flush();
  assert.equal(observations, 0);
  fixture.scroller.scrollTop = 1200;
  fixture.cover(true);
  fixture.scroller.dispatchEvent(new Event("scroll"));
  fixture.flush();
  assert.equal(observations, 0);
  fixture.cover(false);
  fixture.document.dispatchEvent(new Event("focusin"));
  fixture.flush();
  assert.equal(observations, 1, "Restored focus after an overlay closes rechecks the displayed bubble");
  stop();
});

test("observer cancellation discards scheduled stale work and removes listeners", () => {
  const fixture = browserFixture();
  let current = true;
  let observations = 0;
  const stop = observeLatestMessageVisibility({ scroller: fixture.scroller as unknown as HTMLElement, content: fixture.content as unknown as HTMLElement, isCurrent: () => current, onVisible() { observations++; } });
  current = false;
  fixture.flush();
  assert.equal(observations, 0);
  current = true;
  fixture.window.dispatchEvent(new Event("focus"));
  assert.equal(fixture.frames.size, 1);
  stop();
  assert.equal(fixture.frames.size, 0);
  for (const event of ["focus", "resize", "online"]) fixture.window.dispatchEvent(new Event(event));
  fixture.document.dispatchEvent(new Event("visibilitychange"));
  fixture.document.dispatchEvent(new Event("focusin"));
  fixture.scroller.dispatchEvent(new Event("scroll"));
  fixture.window.visualViewport.dispatchEvent(new Event("resize"));
  assert.equal(fixture.frames.size, 0);
  fixture.flush();
  assert.equal(observations, 0);
});

test("foreground observation recovery uses online and visual viewport events without background writes", () => {
  const fixture = browserFixture();
  let observations = 0;
  const stop = observeLatestMessageVisibility({ scroller: fixture.scroller as unknown as HTMLElement, content: fixture.content as unknown as HTMLElement, isCurrent: () => true, onVisible() { observations++; } });
  fixture.flush();
  fixture.window.visualViewport.height = 350;
  fixture.window.visualViewport.dispatchEvent(new Event("resize"));
  fixture.window.dispatchEvent(new Event("online"));
  assert.equal(fixture.frames.size, 1, "Multiple events share one layout observation");
  fixture.flush();
  assert.equal(observations, 1);
  fixture.window.visualViewport.height = 700;
  fixture.window.visualViewport.dispatchEvent(new Event("resize"));
  fixture.flush();
  assert.equal(observations, 2);
  fixture.content.isConnected = false;
  fixture.window.dispatchEvent(new Event("online"));
  fixture.flush();
  assert.equal(observations, 2);
  stop();
});
