import assert from "node:assert/strict";
import test from "node:test";
import {syncMessageViewport} from "../lib/message-viewport";

test("realtime rows while history is loading do not consume the first mounted scroll", () => {
  const scrolls: (boolean | ScrollIntoViewOptions | undefined)[] = [];
  const target = {scrollIntoView(options?: boolean | ScrollIntoViewOptions) {scrolls.push(options);}};
  const base = {loading: true, target: null, scroller: null, anchor: null, newestId: "incoming", previousId: null, reducedMotion: true};
  const buffered = syncMessageViewport(base);
  assert.equal(buffered.previousId, null);
  assert.deepEqual(scrolls, []);
  const mounted = syncMessageViewport({...base, loading: false, target, previousId: buffered.previousId});
  assert.equal(mounted.previousId, "incoming");
  assert.deepEqual(scrolls, [{behavior: "auto", block: "end"}]);
  syncMessageViewport({...base, loading: false, target, previousId: mounted.previousId});
  assert.equal(scrolls.length, 1);
});

test("a missing scroll target cannot consume a marker even after loading ends", () => {
  const result = syncMessageViewport({loading: false, target: null, scroller: null, anchor: null, newestId: "new", previousId: "old", reducedMotion: false});
  assert.equal(result.previousId, "old");
});

test("prepending older history preserves the visible offset rather than jumping to the newest message", () => {
  const scroller = {scrollHeight: 1800, scrollTop: 20};
  const result = syncMessageViewport({loading: false, target: {scrollIntoView(){assert.fail("Must preserve the reading anchor");}}, scroller, anchor: {height: 1000, top: 20}, newestId: "newest", previousId: "newest", reducedMotion: false});
  assert.equal(scroller.scrollTop, 820);
  assert.equal(result.anchor, null);
});
