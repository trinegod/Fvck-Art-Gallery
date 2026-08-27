import assert from "node:assert/strict";
import test from "node:test";
import {
  rankWorldSignals,
  type RankedWorldSignal,
} from "../lib/world-signals";
import type { SignalTrailArtwork } from "../lib/signal-trails";

function artwork(
  id: string,
  collectionId: string,
  mood: string | null,
  tags: string[]
): SignalTrailArtwork {
  return {
    id,
    collectionId,
    title: id,
    src: `/${id}.webp`,
    thumbSrc: null,
    mediaType: "image",
    mood,
    tags,
  };
}

function ids(signals: RankedWorldSignal[]) {
  return signals.map((signal) => signal.id);
}

test("finds signals connected to any piece in the source World", () => {
  const sources = [
    artwork("first", "source", "moonlit", ["armor"]),
    artwork("second", "source", "neon", ["motorcycle"]),
  ];
  const result = rankWorldSignals(sources, [
    artwork("second-piece-echo", "cyber", "neon", ["motorcycle"]),
  ]);

  assert.deepEqual(ids(result), ["second-piece-echo"]);
  assert.equal(result[0].sourceArtworkId, "second");
});

test("aggregates evidence across source pieces and explains the breadth", () => {
  const sources = [
    artwork("one", "source", "moonlit", ["gold"]),
    artwork("two", "source", "moonlit", ["storm"]),
  ];
  const result = rankWorldSignals(sources, [
    artwork("wide-echo", "neighbor-a", "moonlit", []),
    artwork("single-echo", "neighbor-b", "other", ["gold"]),
  ]);

  assert.deepEqual(ids(result), ["wide-echo", "single-echo"]);
  assert.equal(result[0].score, 10);
  assert.equal(result[0].matchCount, 2);
  assert.match(result[0].reason, /echoes 2 pieces/);
});

test("excludes the source World and deduplicates candidates", () => {
  const source = artwork("source-piece", "source", "moonlit", ["gold"]);
  const duplicate = artwork("neighbor", "neighbor", "moonlit", ["gold"]);
  const result = rankWorldSignals(
    [source],
    [source, artwork("same-world", "source", "moonlit", ["gold"]), duplicate, duplicate]
  );

  assert.deepEqual(ids(result), ["neighbor"]);
});

test("keeps neighboring Worlds diverse before filling the remaining limit", () => {
  const source = artwork("source", "origin", "moonlit", ["gold"]);
  const result = rankWorldSignals(
    [source],
    [
      artwork("a-1", "a", "moonlit", ["gold"]),
      artwork("a-2", "a", "moonlit", ["gold"]),
      artwork("a-3", "a", "moonlit", ["gold"]),
      artwork("b-1", "b", "moonlit", []),
    ],
    3
  );

  assert.equal(result.length, 3);
  assert.equal(result.filter((signal) => signal.collectionId === "a").length, 2);
  assert.ok(result.some((signal) => signal.collectionId === "b"));
});

test("is deterministic and returns no ungrounded signals", () => {
  const source = artwork("source", "origin", "moonlit", ["gold"]);
  const tiedCandidates = [
    artwork("zeta", "b", "other", ["gold"]),
    artwork("alpha", "a", "other", ["gold"]),
  ];

  assert.deepEqual(ids(rankWorldSignals([source], tiedCandidates)), ["alpha", "zeta"]);
  assert.deepEqual(
    rankWorldSignals(
      [source],
      [artwork("contrast", "other", "daylight", ["flora"])]
    ),
    []
  );
  assert.deepEqual(rankWorldSignals([], tiedCandidates), []);
  assert.deepEqual(rankWorldSignals([source], tiedCandidates, 0), []);
});
