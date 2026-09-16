import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import sharp from "sharp";
import manifest from "../scripts/nodeine-moon-manifest.json";
import assets from "../scripts/nodeine-moon-assets.json";
import { buildMoonImport, hash, moonSql, quote } from "../scripts/process-nodeine-moon-import.mjs";
import { moonFallbackItems } from "../lib/moon-fallback-world";
import { importedCollectionDetails, importedFallbackItems } from "../lib/imported-fallback-worlds";

const model = buildMoonImport(manifest);

test("Moon batch has 32 unique sources and complete reviewed composition/detail groups", () => {
  assert.equal(model.items.length, 32);
  assert.equal(model.threads.length, 15);
  assert.equal(new Set(model.items.map(item=>item.sha256)).size, 32);
  assert.equal(new Set(model.items.map(item=>item.pixelSha256)).size, 32);
  assert.equal(new Set(model.items.map(item=>item.id)).size, 32);
  assert.deepEqual(model.items.map(item=>item.sortOrder), Array.from({length:32},(_,i)=>i+1));
  assert.equal(model.collection.id,"8ef7fee8-f4a8-54c1-b91a-9be2d32184f5");
  for (const thread of model.threads) {
    assert.equal(thread.items[0].relation,"origin");
    assert.equal(thread.items[0].position,1);
    assert.ok(thread.items.slice(1).every(item=>item.relation === "composition"));
    const positions = thread.items.map(item=>model.items.find(art=>art.id===item.artworkId)!.sortOrder);
    assert.deepEqual(positions,positions.map((_,i)=>positions[0]+i));
  }
});

test("Reordering curated groups preserves artwork and thread identity", () => {
  const reordered = buildMoonImport({...manifest,groups:[...manifest.groups].reverse()});
  assert.deepEqual(new Set(reordered.items.map(item=>item.id)),new Set(model.items.map(item=>item.id)));
  assert.deepEqual(new Set(reordered.threads.map(thread=>thread.id)),new Set(model.threads.map(thread=>thread.id)));
});

test("Unreviewed duplicate bytes, pixels, Drive IDs and unsafe filenames stop the import", () => {
  for (const field of ["sha256","pixelSha256","driveId"] as const) {
    const changed = structuredClone(manifest);
    changed.groups[1].items[0][field] = changed.groups[0].items[0][field];
    assert.throws(()=>buildMoonImport(changed),/duplicate/);
  }
  const changed = structuredClone(manifest);
  changed.groups[0].items[0].sourceName = "../secret.png";
  assert.throws(()=>buildMoonImport(changed),/filename/);
});

test("A detail cannot silently become the origin and out-of-bounds groups are rejected", () => {
  const reversed = structuredClone(manifest);
  reversed.groups[0].items.reverse();
  assert.throws(()=>buildMoonImport(reversed),/Composition/);
  const short = structuredClone(manifest);
  short.groups[0].items = short.groups[0].items.slice(0,1);
  assert.throws(()=>buildMoonImport(short),/2–12/);
});

test("Fallback inventory exactly matches the published model and does not repeat IDs", () => {
  assert.deepEqual(moonFallbackItems.map(item=>item.id),model.items.map(item=>item.id));
  assert.deepEqual(moonFallbackItems.map(item=>item.src),model.items.map(item=>item.src));
  assert.equal(importedFallbackItems.filter(item=>item.series === manifest.collection.title).length,32);
  assert.equal(importedCollectionDetails[manifest.collection.title].order,19);
  assert.equal(new Set(importedFallbackItems.map(item=>item.id)).size,importedFallbackItems.length);
});

test("Import SQL is deterministic, additive, escaped and does not weaken permissions", () => {
  const sql=moonSql(manifest,model);
  assert.equal(sql,readFileSync(new URL("../supabase/import-september-2026-aspects-of-the-moon.sql",import.meta.url),"utf8"));
  assert.equal(quote("Traveler's moon"),"'Traveler''s moon'");
  assert.doesNotMatch(sql,/\b(update|delete|truncate|drop|alter|grant|revoke)\b/i);
  assert.match(sql,/begin;/);
  assert.match(sql,/set constraints all immediate;\ncommit;/);
  assert.equal((sql.match(/insert into public.artworks /g)||[]).length,32);
  assert.equal((sql.match(/insert into public.world_threads /g)||[]).length,15);
  assert.match(sql,/World identity collision/);
  assert.match(sql,/Thread identity collision/);
  assert.match(sql,/'public',false/);
});

test("Every shipped derivative exists, matches its checksum and preserves source aspect ratio", async () => {
  assert.equal(assets.length,32);
  for(const item of model.items) {
    const asset=assets.find(asset=>asset.id===item.id)!;
    for(const [url,expectedHash,size,maxHeight] of [[asset.src,asset.sha256,asset.bytes,2400],[asset.thumbSrc,asset.thumbSha256,asset.thumbBytes,800]] as const) {
      const bytes=readFileSync(new URL(`../public${url}`,import.meta.url));
      assert.equal(bytes.length,size);
      assert.equal(hash(bytes),expectedHash);
      const metadata=await sharp(bytes).metadata();
      assert.equal(metadata.format,"webp");
      assert.ok(metadata.height!<=maxHeight);
      assert.ok(Math.abs(metadata.width!/metadata.height!-item.width/item.height)<0.003);
      assert.equal(metadata.exif,undefined);
    }
  }
});

test("Monkey/rabbit diptych is retained as its own related composition, not split into duplicate posts", () => {
  const group=manifest.groups.find(group=>group.key==="moon-companions")!;
  assert.deepEqual(group.items.map(item=>item.role),["Full composition","Monkey portrait","Rabbit portrait","Companion diptych"]);
  assert.equal(group.items.filter(item=>item.sourceName==="F65BD4B4-0FF6-42CC-B07B-A050980C256E.PNG").length,1);
});
