import assert from "node:assert/strict";
import test from "node:test";
import {
  rankSignalTrail,
  type SignalTrailArtwork,
} from "../lib/signal-trails";

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

const current = artwork("current", "ashigara", "Moonlit armor", [
  "folklore",
  "gold",
  "warrior",
]);

test("excludes the current artwork and duplicate candidates", () => {
  const duplicate = artwork("one", "ashigara", "Moonlit armor", ["gold"]);
  const result = rankSignalTrail(current, [current, duplicate, duplicate]);

  assert.deepEqual(result.map((item) => item.id), ["one"]);
});

test("ranks strong shared signals deterministically", () => {
  const candidates = [
    artwork("mood-only", "lost", "Moonlit armor", []),
    artwork("same-world", "ashigara", "Other", []),
    artwork("tag-rich", "ukiyo", "Other", ["gold", "warrior"]),
  ];

  const result = rankSignalTrail(current, candidates);

  assert.deepEqual(result.map((item) => item.id), [
    "same-world",
    "tag-rich",
    "mood-only",
  ]);
  assert.equal(result[1].reason, "Shared gold + warrior");
});

test("caps repeated collections before filling from the remaining ranking", () => {
  const candidates = [
    artwork("ash-1", "ashigara", "Moonlit armor", ["gold"]),
    artwork("ash-2", "ashigara", "Moonlit armor", ["warrior"]),
    artwork("ash-3", "ashigara", "Moonlit armor", ["folklore"]),
    artwork("ukiyo-1", "ukiyo", "Moonlit armor", ["gold"]),
  ];

  const result = rankSignalTrail(current, candidates, 3);

  assert.equal(result.length, 3);
  assert.equal(
    result.filter((item) => item.collectionId === "ashigara").length,
    2
  );
  assert.ok(result.some((item) => item.collectionId === "ukiyo"));
});

test("returns no results when metadata has no connecting signal", () => {
  const result = rankSignalTrail(current, [
    artwork("contrast", "lost", "Bright landscape", ["flora"]),
  ]);

  assert.deepEqual(result, []);
});

test("honors zero limits", () => {
  const result = rankSignalTrail(current, [
    artwork("one", "ashigara", "Moonlit armor", ["gold"]),
  ], 0);

  assert.deepEqual(result, []);
});
