import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createAccountScope, runAccountRequest } from "../lib/activity-session";
import { fetchSavedArtwork, filterSavedArtworks, savedWorlds, type SavedArtwork } from "../lib/saved-artwork";
import SavedFilters from "../app/saved/saved-filters";

const artwork = (id: string, world = "moon"): SavedArtwork => ({
  id, collection_id: world, title: `Study ${id}`, src: `/${id}.webp`, thumb_src: null,
  media_type: "image", mood: "Quiet folklore", tags: ["night", "portrait"], saved_at: "2026-09-17T12:00:00Z",
  collection: { id: world, owner_id: "creator", title: world === "moon" ? "Aspects of the Moon" : "Cyber Ex", world_code: world },
  creator: { id: "creator", username: "founder", display_name: "NODEINE Founder" },
});
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const client = (fetch: typeof globalThis.fetch) => createClient("https://fixture.invalid", "fixture-only", {
  auth: { persistSession: false, autoRefreshToken: false }, global: { fetch },
});

test("Saved searches title, World, creator, mood and tags without changing recent order or source", () => {
  const source = [artwork("new"), artwork("old", "cyber")];
  const before = structuredClone(source);
  for (const query of [" study NEW ", "  MOON   Portrait ", "@founder new", "Quiet night new", "NODEINE moon"])
    assert.deepEqual(filterSavedArtworks(source, "all", query).map(item => item.id), ["new"]);
  assert.deepEqual(filterSavedArtworks(source, "all", ""), source);
  assert.deepEqual(source, before);
});

test("Saved search and World selection combine, and clearing restores every available piece", () => {
  const source = [artwork("1"), artwork("2", "cyber"), artwork("3")];
  assert.deepEqual(filterSavedArtworks(source, "moon", "3").map(item => item.id), ["3"]);
  assert.deepEqual(filterSavedArtworks(source, "cyber", "moon"), []);
  assert.deepEqual(filterSavedArtworks(source, "missing", ""), []);
  assert.equal(filterSavedArtworks(source, "all", "  ").length, 3);
});

test("World counts use collection IDs rather than conflating identical titles; missing metadata remains searchable", () => {
  const a = artwork("1"), b = artwork("2", "other");
  b.collection!.title = a.collection!.title;
  const missing = { ...artwork("3", "gone"), collection: null, creator: null, tags: null, mood: null };
  const worlds = savedWorlds([a, artwork("4"), b, missing]);
  assert.deepEqual(worlds.map(world => [world.id, world.count]).sort(), [["gone", 1], ["moon", 2], ["other", 1]]);
  assert.equal(filterSavedArtworks([missing], "gone", "study").length, 1);
});

test("large Saved collections read every page and bounded metadata batches with owner scoping and no writes", async () => {
  const saves = Array.from({ length: 1001 }, (_, i) => ({ artwork_id: `art-${i}`, created_at: `stamp-${i}` }));
  const offsets: number[] = [], batches: number[] = [];
  const database = client(async (input, init) => {
    assert.equal(init?.method ?? "GET", "GET");
    const url = new URL(String(input));
    const table = url.pathname.split("/").at(-1);
    if (table === "artwork_saves") {
      assert.equal(url.searchParams.get("user_id"), "eq.viewer");
      assert.equal(url.searchParams.get("order"), "created_at.desc,artwork_id.asc");
      const offset = Number(url.searchParams.get("offset")); offsets.push(offset);
      return json(saves.slice(offset, offset + 500));
    }
    const ids = url.searchParams.get("id")!.slice(4, -1).split(",");
    assert.ok(ids.length <= 100);
    if (table === "artworks") { batches.push(ids.length); return json(ids.map(id => artwork(id))); }
    if (table === "collections") return json([artwork("x").collection]);
    return json([{ id: "viewer", username: "viewer", display_name: "Viewer" }, artwork("x").creator]);
  });
  const result = await fetchSavedArtwork(database, "viewer");
  assert.deepEqual(offsets, [0, 500, 1000]);
  assert.deepEqual(batches, [...Array(10).fill(100), 1]);
  assert.deepEqual(result?.artworks.map(item => item.id), saves.map(save => save.artwork_id));
  assert.equal(result?.viewerProfile?.id, "viewer");
});

test("Saved read failures and null responses cannot masquerade as an empty or complete collection", async () => {
  await assert.rejects(fetchSavedArtwork(client(async () => json(null)), "viewer"));
  await assert.rejects(fetchSavedArtwork(client(async input => {
    const url = new URL(String(input));
    return url.searchParams.get("offset") === "0"
      ? json(Array.from({ length: 500 }, (_, i) => ({ artwork_id: String(i), created_at: "" })))
      : json({ message: "Unavailable", code: "503" }, 503);
  }), "viewer"));
});

test("missing/inaccessible artwork is omitted without deleting saves, while empty sets skip invalid metadata queries", async () => {
  const tables: string[] = [];
  const database = client(async input => {
    const table = new URL(String(input)).pathname.split("/").at(-1)!; tables.push(table);
    return json(table === "artwork_saves" ? [{ artwork_id: "gone", created_at: "" }] : []);
  });
  const result = await fetchSavedArtwork(database, "viewer");
  assert.deepEqual(result?.artworks, []);
  assert.deepEqual(tables, ["artwork_saves", "artworks", "profiles"]);
});

for (const failure of [false, true]) test(`account changes stop Saved ${failure ? "failures" : "results"} before they commit or start metadata requests`, async () => {
  let resolve!: (response: Response) => void;
  const pending = new Promise<Response>(done => { resolve = done; });
  const scope = createAccountScope(); scope.setAccount("a");
  let requests = 0;
  const database = client(async () => { requests++; return pending; });
  const outputs: unknown[] = [];
  const task = runAccountRequest(scope, "a", "saved", current => fetchSavedArtwork(database, "a", current), value => outputs.push(value), error => outputs.push(error));
  await new Promise<void>(done => setImmediate(done));
  scope.setAccount("b");
  resolve(failure ? json({ message: "Private failure" }, 403) : json([{ artwork_id: "private", created_at: "" }]));
  await task;
  assert.deepEqual(outputs, []);
  assert.equal(requests, 1);
});

test("signed-out or stale Saved reads never start a request", async () => {
  const database = client(async () => assert.fail("Unexpected request"));
  assert.equal(await fetchSavedArtwork(database, ""), null);
  assert.equal(await fetchSavedArtwork(database, "a", () => false), null);
});

test("Saved controls hide the redundant single-World selector and offer one clear way back from filtering", () => {
  const props = { search: "", worldId: "all", worlds: savedWorlds([artwork("1")]), shown: 1, total: 1, onSearch() {}, onWorld() {} };
  const plain = renderToStaticMarkup(createElement(SavedFilters, props));
  assert.match(plain, /Search saved artwork/);
  assert.doesNotMatch(plain, /<select|Clear filters/);
  const narrowed = renderToStaticMarkup(createElement(SavedFilters, { ...props, search: "missing", shown: 0,
    worlds: savedWorlds([artwork("1"), artwork("2", "cyber")]) }));
  assert.match(narrowed, /<select/);
  assert.match(narrowed, /0 of 1 saved piece/);
  assert.match(narrowed, /Clear filters/);
  assert.match(narrowed, /aria-live="polite"/);
});
