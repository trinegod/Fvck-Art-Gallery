import assert from "node:assert/strict";
import test from "node:test";
import type { SharedArtwork } from "../app/messages/messages-types";
import { filterPickerArtworks, loadPickerArtworks } from "../lib/artwork-picker";

function artwork(index: number, overrides: Partial<SharedArtwork> = {}): SharedArtwork {
  return {
    id: `artwork-${index}`,
    collection_id: "other-world",
    title: `Artwork ${index}`,
    src: `/art/artwork-${index}.webp`,
    thumb_src: null,
    media_type: "image",
    mood: null,
    ...overrides,
  };
}

function pages(rows: SharedArtwork[]) {
  const requests: [number, number][] = [];
  return {
    requests,
    fetch: async (from: number, to: number) => {
      requests.push([from, to]);
      return { data: rows.slice(from, to + 1), error: null };
    },
  };
}

test("artwork picker loads beyond 1,000 rows with contiguous inclusive ranges", async () => {
  const rows = Array.from({ length: 1207 }, (_, index) => artwork(index));
  const fixture = pages(rows);

  const result = await loadPickerArtworks(fixture.fetch);

  assert.deepEqual(result, rows);
  assert.deepEqual(fixture.requests, [[0, 499], [500, 999], [1000, 1499]]);
  assert.equal(result.at(-1)?.id, "artwork-1206");
});

test("an exact page boundary probes the next page rather than silently stopping", async () => {
  const fixture = pages(Array.from({ length: 1000 }, (_, index) => artwork(index)));

  assert.equal((await loadPickerArtworks(fixture.fetch)).length, 1000);
  assert.deepEqual(fixture.requests, [[0, 499], [500, 999], [1000, 1499]]);
});

test("a genuinely empty inventory is a successful empty result", async () => {
  const fixture = pages([]);

  assert.deepEqual(await loadPickerArtworks(fixture.fetch), []);
  assert.deepEqual(fixture.requests, [[0, 499]]);
});

test("custom page size keeps inclusive ranges contiguous", async () => {
  const fixture = pages(Array.from({ length: 5 }, (_, index) => artwork(index)));

  assert.equal((await loadPickerArtworks(fixture.fetch, 2)).length, 5);
  assert.deepEqual(fixture.requests, [[0, 1], [2, 3], [4, 5]]);
});

test("a later failed page rejects the entire load, never a partial inventory", async () => {
  const requests: number[] = [];

  await assert.rejects(loadPickerArtworks(async (from) => {
    requests.push(from);
    return from === 0
      ? { data: [artwork(1), artwork(2)], error: null }
      : { data: null, error: { message: "Artwork access is unavailable" } };
  }, 2), /Artwork access is unavailable/);
  assert.deepEqual(requests, [0, 2]);
});

test("a response with data and an error remains a failure", async () => {
  await assert.rejects(loadPickerArtworks(async () => ({
    data: [artwork(1)],
    error: { message: "Request incomplete" },
  })), /Request incomplete/);
});

test("null data cannot masquerade as a loaded empty world, including after a full page", async () => {
  for (const failAfterFirst of [false, true]) {
    await assert.rejects(loadPickerArtworks(async (from) => ({
      data: failAfterFirst && from === 0 ? [artwork(1)] : null,
      error: null,
    }), 1), /Artwork response was incomplete/);
  }
});

test("network rejection is propagated instead of resolving partial data", async () => {
  const failure = new Error("Network interrupted");

  await assert.rejects(loadPickerArtworks(async (from) => {
    if (from > 0) throw failure;
    return { data: [artwork(1)], error: null };
  }, 1), (error) => error === failure);
});

test("overlapping IDs are deduplicated without treating a full raw page as the end", async () => {
  const original = artwork(1);
  const duplicate = { ...original, title: "Later copy of the same row" };
  const fixture = pages([original, artwork(2), duplicate, artwork(3), artwork(4)]);

  const result = await loadPickerArtworks(fixture.fetch, 2);

  assert.deepEqual(result.map((row) => row.id), [1, 2, 3, 4].map((index) => `artwork-${index}`));
  assert.equal(result[0], original);
  assert.deepEqual(fixture.requests, [[0, 1], [2, 3], [4, 5]]);
});

test("different artwork and close-up IDs remain distinct even when title or source matches", async () => {
  const composition = artwork(1, { title: "Moon companions", src: "/art/shared.webp" });
  const closeup = artwork(2, { title: "Moon companions", src: "/art/shared.webp" });

  assert.deepEqual(await loadPickerArtworks(pages([composition, closeup]).fetch), [composition, closeup]);
});

test("pagination and filtering never mutate source arrays or records", async () => {
  const rows = [artwork(2), artwork(1)];
  const expected = structuredClone(rows);
  rows.forEach(Object.freeze);
  Object.freeze(rows);

  const result = await loadPickerArtworks(pages(rows).fetch, 1);
  const filtered = filterPickerArtworks(result, "all", "artwork");

  assert.deepEqual(rows, expected);
  assert.notEqual(result, rows);
  assert.notEqual(filtered, result);
  assert.deepEqual(filtered, expected);
});

test("all 27 Gundam artworks survive world filtering after more than 1,000 other rows", async () => {
  const others = Array.from({ length: 1005 }, (_, index) => artwork(index));
  const gundam = Array.from({ length: 27 }, (_, index) => artwork(index + 1005, {
    collection_id: "gundam-wing",
    title: `Gundam Wing ${index + 1}`,
  }));
  const inventory = await loadPickerArtworks(pages([...others, ...gundam]).fetch);

  assert.deepEqual(filterPickerArtworks(inventory, "gundam-wing", ""), gundam);
  assert.equal(filterPickerArtworks(inventory, "all", "").length, 1032);
});

test("search is case-insensitive, trims surrounding whitespace, and matches title or mood", () => {
  const titled = artwork(1, { collection_id: "moon", title: "Moon Companions" });
  const mood = artwork(2, { collection_id: "moon", mood: "Celestial Moonlight" });
  const other = artwork(3, { collection_id: "gundam", title: "Moon mobile suit" });
  const rows = [titled, mood, other];

  assert.deepEqual(filterPickerArtworks(rows, "moon", "  mOoN \n"), [titled, mood]);
  assert.deepEqual(filterPickerArtworks(rows, "moon", "CELESTIAL"), [mood]);
  assert.deepEqual(filterPickerArtworks(rows, "all", " \t\n"), rows);
  assert.deepEqual(filterPickerArtworks(rows, "moon", "missing"), []);
});

test("world filtering uses collection identity and safely handles missing collection or mood", () => {
  const rows = [artwork(1, { collection_id: null }), artwork(2, { collection_id: undefined }), artwork(3)];

  assert.deepEqual(filterPickerArtworks(rows, "other-world", ""), [rows[2]]);
  assert.deepEqual(filterPickerArtworks(rows, "missing-world", ""), []);
  assert.deepEqual(filterPickerArtworks(rows, "all", "artwork"), rows);
});

test("invalid page sizes fail before starting any request", async () => {
  for (const pageSize of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    let requested = false;
    await assert.rejects(loadPickerArtworks(async () => {
      requested = true;
      return { data: [], error: null };
    }, pageSize), RangeError);
    assert.equal(requested, false);
  }
});
