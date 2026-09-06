import assert from "node:assert/strict";
import test from "node:test";
import {
  feedRestoreCount,
  observeFeedViewport,
  readFeedLocation,
  type FeedObserverFactory,
} from "../lib/feed-navigation";

const signalId = "f9cd5733-0aa3-44d5-b88b-f0fd63719945";

function observerFixture() {
  const observers: {
    callback: IntersectionObserverCallback;
    targets: Element[];
    disconnected: boolean;
  }[] = [];
  const createObserver: FeedObserverFactory = (callback) => {
    const state = { callback, targets: [] as Element[], disconnected: false };
    observers.push(state);
    return {
      observe: (target) => state.targets.push(target),
      disconnect: () => { state.disconnected = true; },
    };
  };
  return { observers, createObserver };
}

function card(id: string) {
  return { getAttribute: (name: string) => name === "data-feed-entry" ? id : null } as Element;
}

function observation(target: Element, isIntersecting = true, top = 0) {
  return { target, isIntersecting, boundingClientRect: { top } } as IntersectionObserverEntry;
}

test("Back to a missing or invalid mode restores For You; same-route URLs select their lane", () => {
  for (const query of ["", "mode=invalid", "mode="]) {
    assert.deepEqual(readFeedLocation(new URLSearchParams(query)), {
      mode: "for-you", signalId: null,
    });
  }
  for (const mode of ["discover", "following", "for-you"] as const) {
    assert.deepEqual(readFeedLocation(new URLSearchParams(`mode=${mode}&signal=${signalId}`)), {
      mode, signalId,
    });
  }
  assert.equal(readFeedLocation(new URLSearchParams("signal=not-an-id")).signalId, null);
});

test("a loaded viewport attaches both observers after a cold empty render", () => {
  const { observers, createObserver } = observerFixture();
  const active: string[] = [];
  let pagesRequested = 0;
  const callbacks = { createObserver, onActive: (id: string) => active.push(id), onLoadMore: () => { pagesRequested++; } };
  const stopLoading = observeFeedViewport({ ...callbacks, cards: [], sentinel: null, hasMore: true });
  assert.equal(observers.length, 0);
  stopLoading();
  const first = card(signalId);
  const sentinel = card("sentinel");
  const stopReady = observeFeedViewport({ ...callbacks, cards: [first], sentinel, hasMore: true });
  assert.equal(observers.length, 2);
  assert.deepEqual(observers[0].targets, [first]);
  assert.deepEqual(observers[1].targets, [sentinel]);
  observers[0].callback([observation(first)], {} as IntersectionObserver);
  observers[1].callback([observation(sentinel)], {} as IntersectionObserver);
  assert.deepEqual(active, [signalId]);
  assert.equal(pagesRequested, 1);
  stopReady();
  observers[0].callback([observation(first)], {} as IntersectionObserver);
  observers[1].callback([observation(sentinel)], {} as IntersectionObserver);
  assert.deepEqual(active, [signalId], "queued callbacks cannot rewrite navigation after cleanup");
  assert.equal(pagesRequested, 1);
  assert.ok(observers.every((observer) => observer.disconnected));
});

test("replacing a same-sized lane observes its new cards and stops the old lane", () => {
  const { observers, createObserver } = observerFixture();
  const active: string[] = [];
  const oldCard = card("old"), newCard = card("new");
  const options = { createObserver, hasMore: false, sentinel: null, onLoadMore() {}, onActive: (id: string) => active.push(id) };
  const stop = observeFeedViewport({ ...options, cards: [oldCard] });
  stop();
  observeFeedViewport({ ...options, cards: [newCard] });
  observers[0].callback([observation(oldCard)], {} as IntersectionObserver);
  observers[1].callback([observation(newCard)], {} as IntersectionObserver);
  assert.deepEqual(active, ["new"]);
  assert.deepEqual(observers[1].targets, [newCard]);
});

test("returning to a deep signal reveals it without shrinking an already loaded page", () => {
  const ids = Array.from({ length: 40 }, (_, i) => `signal-${i}`);
  assert.equal(feedRestoreCount(ids, "signal-26", 12), 27);
  assert.equal(feedRestoreCount(ids, "signal-3", 36), 36);
  assert.equal(feedRestoreCount(ids, "missing", 12), 12);
});
