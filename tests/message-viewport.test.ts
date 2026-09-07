import assert from "node:assert/strict";
import test from "node:test";
import {isMessageViewportNearBottom, scrollMessageViewportToEnd, syncMessageViewport} from "../lib/message-viewport";

function historyPane() {
  const scrolls: ScrollToOptions[] = [];
  return {
    scrolls,
    scrollTop: 0,
    scrollHeight: 2400,
    clientHeight: 440,
    scrollTo(options: ScrollToOptions) { scrolls.push(options); },
  };
}

const previous = {id: "previous", sender_id: "other"};
const incoming = {id: "incoming", sender_id: "other"};
const reading = {
  loading: false,
  anchor: null,
  messages: [previous, incoming],
  previousId: previous.id,
  viewerId: "viewer",
  following: false,
  unseenCount: 0,
  reducedMotion: true,
};

test("realtime rows while history is loading do not consume the first mounted scroll", () => {
  const scroller = historyPane();
  const base = {...reading, loading: true, scroller: null, previousId: null};
  const buffered = syncMessageViewport(base);
  assert.equal(buffered.previousId, null);
  assert.deepEqual(scroller.scrolls, []);
  const mounted = syncMessageViewport({...base, loading: false, scroller, previousId: buffered.previousId});
  assert.equal(mounted.previousId, "incoming");
  assert.deepEqual(scroller.scrolls, [{behavior: "auto", top: 2400}]);
  syncMessageViewport({...base, loading: false, scroller, previousId: mounted.previousId});
  assert.equal(scroller.scrolls.length, 1);
});

test("a missing history container cannot consume a marker even after loading ends", () => {
  const result = syncMessageViewport({...reading, scroller: null});
  assert.equal(result.previousId, previous.id);
});

test("prepending older history preserves the visible offset rather than jumping to the newest message", () => {
  const scroller = {...historyPane(), scrollHeight: 1800, scrollTop: 20};
  const result = syncMessageViewport({...reading, messages: [previous], scroller, anchor: {height: 1000, top: 20}});
  assert.equal(scroller.scrollTop, 820);
  assert.equal(result.anchor, null);
  assert.deepEqual(scroller.scrolls, []);
  assert.equal(result.unseenCount, 0);
});

test("a new message preserves a reader's position and exposes one unseen arrival", () => {
  const scroller = historyPane();
  const result = syncMessageViewport({...reading, scroller});
  assert.equal(scroller.scrollTop, 0);
  assert.deepEqual(scroller.scrolls, []);
  assert.equal(result.unseenCount, 1);
  assert.equal(result.previousId, incoming.id);
});

test("batched group arrivals accumulate once and edits do not inflate the affordance", () => {
  const scroller = historyPane();
  const messages = [previous, incoming, {id: "second", sender_id: "another-member"}];
  const first = syncMessageViewport({...reading, messages, scroller, unseenCount: 2});
  assert.equal(first.unseenCount, 4);
  const edited = syncMessageViewport({...reading, messages: [...messages], scroller, previousId: first.previousId, unseenCount: first.unseenCount});
  assert.equal(edited.unseenCount, 4);
  assert.deepEqual(scroller.scrolls, []);
});

test("a reader following the conversation stays at the newest message", () => {
  const scroller = historyPane();
  const result = syncMessageViewport({...reading, scroller, following: true, unseenCount: 3});
  assert.deepEqual(scroller.scrolls, [{top: 2400, behavior: "auto"}]);
  assert.equal(result.unseenCount, 0);
});

test("the viewer's own send scrolls the history even while reading older messages", () => {
  const scroller = historyPane();
  const result = syncMessageViewport({...reading, scroller, reducedMotion: false, unseenCount: 3, messages: [previous, {id: "mine", sender_id: "viewer"}, incoming]});
  assert.deepEqual(scroller.scrolls, [{top: 2400, behavior: "smooth"}]);
  assert.equal(result.unseenCount, 0);
});

test("an arrival concurrent with older-history loading preserves the anchor and still updates its count", () => {
  const scroller = {...historyPane(), scrollTop: 20};
  const result = syncMessageViewport({...reading, scroller, anchor: {height: 1600, top: 20}});
  assert.equal(scroller.scrollTop, 820);
  assert.equal(result.unseenCount, 1);
  assert.equal(result.previousId, incoming.id);
  assert.deepEqual(scroller.scrolls, []);
});

test("the jump action scrolls only its supplied history container and respects reduced motion", () => {
  const scroller = historyPane();
  scrollMessageViewportToEnd(scroller, true);
  scrollMessageViewportToEnd(scroller, false);
  assert.deepEqual(scroller.scrolls, [{top: 2400, behavior: "auto"}, {top: 2400, behavior: "smooth"}]);
});

test("following uses a bounded bottom threshold, including overscroll", () => {
  const scroller = historyPane();
  assert.equal(isMessageViewportNearBottom(scroller), false);
  assert.equal(isMessageViewportNearBottom({...scroller, scrollTop: 1880}), true);
  assert.equal(isMessageViewportNearBottom({...scroller, scrollTop: 1879}), false);
  assert.equal(isMessageViewportNearBottom({...scroller, scrollTop: 1970}), true);
});

test("an empty history clears stale unseen counts without moving another scroll container", () => {
  const scroller = historyPane();
  const result = syncMessageViewport({...reading, scroller, messages: [], unseenCount: 3});
  assert.equal(result.previousId, null);
  assert.equal(result.unseenCount, 0);
  assert.deepEqual(scroller.scrolls, []);
});

test("a changed history window does not invent an unseen arrival when its prior marker is absent", () => {
  const scroller = historyPane();
  const result = syncMessageViewport({...reading, scroller, messages: [{id: "different-window", sender_id: "other"}]});
  assert.equal(result.unseenCount, 0);
  assert.equal(result.previousId, "different-window");
  assert.deepEqual(scroller.scrolls, []);
});
