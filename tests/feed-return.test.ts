import assert from "node:assert/strict";
import test from "node:test";
import {
  appendFeedReturnContext,
  buildFeedReturnHref,
  parseFeedReturn,
  type FeedReturnContext,
} from "../lib/feed-return";

const signalId = "766265af-4837-5852-9b20-b028e66db9b6";
const context: FeedReturnContext = { mode: "for-you", signalId };

test("parses a validated feed return context", () => {
  assert.deepEqual(
    parseFeedReturn({ feedMode: "for-you", feedSignal: signalId }),
    context
  );
});

test("uses the first value when query parameters are repeated", () => {
  assert.deepEqual(
    parseFeedReturn({
      feedMode: ["discover", "following"],
      feedSignal: [signalId.toUpperCase(), "not-a-uuid"],
    }),
    { mode: "discover", signalId }
  );
});

test("rejects incomplete or invalid feed return parameters", () => {
  assert.equal(parseFeedReturn({ feedMode: "popular", feedSignal: signalId }), null);
  assert.equal(parseFeedReturn({ feedMode: "for-you", feedSignal: "not-a-uuid" }), null);
  assert.equal(parseFeedReturn({ feedMode: "for-you" }), null);
  assert.equal(parseFeedReturn({ feedSignal: signalId }), null);
});

test("builds a durable feed URL with a scroll target", () => {
  assert.equal(
    buildFeedReturnHref(context),
    `/feed?mode=for-you&signal=${signalId}#signal-${signalId}`
  );
});

test("adds return parameters before an existing hash", () => {
  assert.equal(
    appendFeedReturnContext(
      "/threads/night-signal?view=lineage#piece-origin",
      context
    ),
    `/threads/night-signal?view=lineage&feedMode=for-you&feedSignal=${signalId}#piece-origin`
  );
});

test("replaces stale return parameters instead of duplicating them", () => {
  assert.equal(
    appendFeedReturnContext(
      "/artwork/example?feedMode=discover&feedSignal=8b31cc7c-aeef-43d3-a6c6-d574f75aa9b6",
      context
    ),
    `/artwork/example?feedMode=for-you&feedSignal=${signalId}`
  );
});

test("refuses to decorate external or protocol-relative destinations", () => {
  assert.throws(
    () => appendFeedReturnContext("https://example.com/artwork", context),
    /internal path/
  );
  assert.throws(
    () => appendFeedReturnContext("//example.com/artwork", context),
    /internal path/
  );
});

test("falls back safely when a context is invalid at runtime", () => {
  const invalid = {
    mode: "for-you",
    signalId: "not-a-uuid",
  } as FeedReturnContext;

  assert.equal(buildFeedReturnHref(invalid), "/feed");
  assert.equal(appendFeedReturnContext("/artwork/example", invalid), "/artwork/example");
});
