import assert from "node:assert/strict";
import test from "node:test";
import { loadWorldViewingSequence, moveViewingIndex, selectCreatorThread, type ViewingArtwork } from "../lib/artwork-viewing";
import type { WorldThread } from "../lib/world-threads";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ArtworkThreadStrip from "../app/components/artwork-thread-strip";
import ArtworkFocusView from "../app/components/artwork-focus-view";

const piece = (id: string): ViewingArtwork => ({ id, title: id, src: `/${id}.webp`, thumb_src: null, media_type: "image" });
function thread(id: string, ids: string[], override: Partial<WorldThread> = {}): WorldThread {
  return { id, ownerId: "creator", title: id, slug: id, summary: null, visibility: "public",
    allowForks: false, createdAt: "", updatedAt: "", owner: null, forkedFromId: null, forkedFrom: null,
    itemCount: ids.length, items: ids.map((id, i) => ({ id, position: i + 1, relationType: i ? "composition" : "origin", note: null, addedBy: "creator", createdAt: "",
      artwork: { id, title: id, src: `/${id}.webp`, thumbSrc: null, mediaType: "image", mood: null, tags: [], collection: { id: "world", title: "World", worldCode: null, creator: null } } })), ...override };
}

test("only complete, public creator-curated same-World connections appear", () => {
  const valid = thread("valid", ["current", "detail"]);
  const otherWorld = thread("other-world", ["current", "other"]);
  otherWorld.items[1].artwork.collection!.id = "another-world";
  const candidates = [thread("draft", ["current", "detail"], { visibility: "draft" }),
    thread("fan", ["current", "detail"], { ownerId: "fan" }), otherWorld,
    thread("missing", ["current", "detail"], { itemCount: 3 }), thread("unrelated", ["a", "b"]),
    thread("duplicate", ["current", "current"]), thread("single", ["current"]), valid];
  assert.equal(selectCreatorThread(candidates, "current", "world", "creator"), valid);
  assert.equal(selectCreatorThread(candidates.slice(0, -1), "current", "world", "creator"), null);
});

test("a focused curated Thread wins deterministically without mutating inputs", () => {
  const larger = thread("a", ["current", "detail", "other"]);
  const z = thread("z", ["current", "detail"]);
  const b = thread("b", ["current", "detail"]);
  const source = [larger, z, b];
  assert.equal(selectCreatorThread(source, "current", "world", "creator"), b);
  assert.deepEqual(source, [larger, z, b]);
});

test("World viewer loads beyond one database page and preserves creator ordering", async () => {
  const pieces = Array.from({ length: 1001 }, (_, index) => piece(String(index)));
  const ranges: number[][] = [];
  const result = await loadWorldViewingSequence(async (from, to) => {
    ranges.push([from, to]); return { data: pieces.slice(from, to + 1), error: null };
  });
  assert.deepEqual(result, pieces);
  assert.deepEqual(ranges, [[0, 499], [500, 999], [1000, 1499]]);
});

test("repeated IDs are removed, but separately identified close-ups remain", async () => {
  const result = await loadWorldViewingSequence(async () => ({ data: [piece("scene"), piece("scene"), piece("detail")], error: null }));
  assert.deepEqual(result.map(item => item.id), ["scene", "detail"]);
});

test("World viewing fails closed on null or failed reads instead of presenting a partial sequence", async () => {
  await assert.rejects(loadWorldViewingSequence(async () => ({ data: null, error: null })));
  await assert.rejects(loadWorldViewingSequence(async from => from === 0
    ? { data: Array.from({ length: 500 }, (_, index) => piece(String(index))), error: null }
    : { data: null, error: { message: "Unavailable" } }));
});

test("viewer navigation wraps predictably and handles one or zero pieces", () => {
  assert.equal(moveViewingIndex(0, -1, 27), 26);
  assert.equal(moveViewingIndex(26, 1, 27), 0);
  assert.equal(moveViewingIndex(4, 1, 27), 5);
  assert.equal(moveViewingIndex(0, 1, 1), 0);
  assert.equal(moveViewingIndex(0, -1, 0), 0);
});

test("connected strip has one current item and preserves feed context on real links", () => {
  const current = "766265af-4837-5852-9b20-b028e66db9b6";
  const markup = renderToStaticMarkup(createElement(ArtworkThreadStrip, { thread: thread("curated", [current, "detail"]), artworkId: current,
    feedReturn: { mode: "discover", signalId: current } }));
  assert.match(markup, /Connected by the creator/);
  assert.match(markup, /aria-current="true"/);
  assert.doesNotMatch(markup, new RegExp(`href="/artwork/${current}`));
  assert.match(markup, /href="\/artwork\/detail\?feedMode=discover&amp;feedSignal=/);
  assert.match(markup, /href="\/threads\/curated\?feedMode=discover&amp;feedSignal=/);
});

test("shared focus viewer offers meaningful controls without autoplay or fake zoom", () => {
  const markup = renderToStaticMarkup(createElement(ArtworkFocusView, { src: "/art.webp", alt: "Art", onBack: () => {}, contextLabel: "World · 1 of 2", onNext: () => {}, onPrevious: () => {} }));
  assert.match(markup, /Actual size/);
  assert.match(markup, /Previous artwork/);
  assert.match(markup, /Next artwork/);
  assert.match(markup, /World · 1 of 2/);
  const video = renderToStaticMarkup(createElement(ArtworkFocusView, { src: "/film.mp4", alt: "Film", mediaType: "video", onBack: () => {} }));
  assert.match(video, /<video/);
  assert.doesNotMatch(video, /autoplay|Actual size/i);
});
