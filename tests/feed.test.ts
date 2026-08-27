import assert from "node:assert/strict";
import test from "node:test";
import {
  composeFeed,
  EMPTY_FEED_SIGNALS,
  isFeedMode,
  type FeedInventoryItem,
} from "../lib/feed";

function artwork(
  id: string,
  collectionId: string,
  creatorId: string,
  tags: string[] = [],
  mood: string | null = null
): FeedInventoryItem {
  return {
    id,
    title: id,
    src: `/${id}.png`,
    thumbSrc: null,
    mediaType: "image",
    mood,
    tags,
    sortOrder: 1,
    collection: {
      id: collectionId,
      title: collectionId,
      summary: null,
      worldCode: null,
      sortOrder: 1,
    },
    creator: {
      id: creatorId,
      username: creatorId,
      displayName: creatorId,
      avatarUrl: null,
    },
    threadContexts: [],
  };
}

test("feed mode validation rejects unknown URL values", () => {
  assert.equal(isFeedMode("for-you"), true);
  assert.equal(isFeedMode("discover"), true);
  assert.equal(isFeedMode("following"), true);
  assert.equal(isFeedMode("popular"), false);
  assert.equal(isFeedMode(undefined), false);
});

test("following mode only includes followed creators", () => {
  const inventory = [
    artwork("one", "world-a", "creator-a"),
    artwork("two", "world-b", "creator-b"),
  ];
  const result = composeFeed(inventory, "following", {
    ...EMPTY_FEED_SIGNALS,
    followedCreatorIds: ["creator-b"],
  });

  assert.deepEqual(result.map((entry) => entry.id), ["two"]);
  assert.equal(result[0]?.reason, "From a creator you follow");
});

test("for-you ranking explains tag affinity and is deterministic", () => {
  const inventory = [
    artwork("liked", "world-a", "creator-a", ["cyberpunk"], "neon"),
    artwork("match", "world-b", "creator-a", ["cyberpunk"], "neon"),
    artwork("other", "world-c", "creator-c", ["folklore"], "ember"),
  ];
  const signals = {
    ...EMPTY_FEED_SIGNALS,
    likedArtworkIds: ["liked"],
  };

  const first = composeFeed(inventory, "for-you", signals);
  const second = composeFeed(inventory, "for-you", signals);

  assert.deepEqual(first, second);
  assert.equal(first[0]?.id, "match");
  assert.equal(first[0]?.reason, "Because you connect with cyberpunk");
});

test("discover mode exposes Chronicle context in its reason", () => {
  const connected = artwork("connected", "world-a", "creator-a");
  connected.threadContexts = [
    {
      id: "thread-1",
      slug: "signal-path",
      title: "Signal Path",
      relationType: "origin",
      position: 1,
    },
  ];

  const result = composeFeed(
    [artwork("plain", "world-b", "creator-b"), connected],
    "discover",
    EMPTY_FEED_SIGNALS
  );

  assert.equal(result[0]?.id, "connected");
  assert.equal(result[0]?.reason, "Connected through a public Chronicle");
});

test("the opening feed cannot be swallowed by a single World", () => {
  const inventory = [
    ...Array.from({ length: 8 }, (_, index) =>
      artwork(`world-a-${index}`, "world-a", "creator-a", ["favorite"])
    ),
    artwork("world-b-1", "world-b", "creator-b"),
    artwork("world-c-1", "world-c", "creator-c"),
  ];
  const result = composeFeed(inventory, "for-you", {
    ...EMPTY_FEED_SIGNALS,
    likedArtworkIds: ["world-a-0"],
  });

  assert.equal(
    result.slice(0, 4).filter((entry) => entry.collection.id === "world-a").length,
    2
  );
  assert.equal(new Set(result.slice(0, 4).map((entry) => entry.collection.id)).size, 3);
});
