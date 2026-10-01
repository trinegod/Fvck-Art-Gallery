import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import sharp from "sharp";
import manifest from "../scripts/nodeine-ghosts-manifest.json";
import assets from "../scripts/nodeine-ghosts-assets.json";
import { buildGhostsImport, ghostsSql } from "../scripts/process-nodeine-ghosts-import.mjs";
import { hash } from "../scripts/process-nodeine-moon-import.mjs";
import { ghostsFallbackItems } from "../lib/ghosts-fallback-world";
import { importedCollectionDetails, importedFallbackItems } from "../lib/imported-fallback-worlds";

const model=buildGhostsImport(manifest);
test("Ghosts keeps all 78 distinct originals, with stable IDs and simple titles",()=>{
 assert.equal(model.items.length,78);
 assert.equal(model.collection.title,"(36) Ghosts");
 assert.equal(new Set(model.items.map(i=>i.id)).size,78);
 assert.deepEqual(model.items.map(i=>i.sortOrder),Array.from({length:78},(_,i)=>i+1));
 assert.equal(model.items[0].title,"(36) Ghosts 001");
 assert.equal(model.items.at(-1)!.title,"(36) Ghosts 078");
 const reversed=buildGhostsImport({...manifest,items:[...manifest.items].reverse()});
 assert.deepEqual(new Set(reversed.items.map(i=>i.id)),new Set(model.items.map(i=>i.id)));
});
test("Duplicate, incomplete, unsafe and invalid source inventories fail closed",()=>{
 for(const field of ["sha256","pixelSha256","driveId","sourceName"] as const) {
  const changed=structuredClone(manifest); changed.items[1][field]=changed.items[0][field];
  assert.throws(()=>buildGhostsImport(changed),/duplicate/);
 }
 const unsafe=structuredClone(manifest); unsafe.items[0].sourceName="../secret.PNG";
 assert.throws(()=>buildGhostsImport(unsafe),/filename/);
 assert.throws(()=>buildGhostsImport({...manifest,items:manifest.items.slice(1)}),/Incomplete/);
 const bad=structuredClone(manifest); bad.items[0].width=0;
 assert.throws(()=>buildGhostsImport(bad),/dimensions/);
});
test("Fallback catalogs contain every Ghosts artwork exactly once",()=>{
 assert.deepEqual(ghostsFallbackItems.map(i=>i.id),model.items.map(i=>i.id));
 assert.deepEqual(ghostsFallbackItems.map(i=>i.src),model.items.map(i=>i.src));
 assert.equal(importedFallbackItems.filter(i=>i.series===model.collection.title).length,78);
 assert.equal(importedCollectionDetails[model.collection.title].order,20);
 assert.equal(new Set(importedFallbackItems.map(i=>i.id)).size,importedFallbackItems.length);
});
test("The rerunnable transaction is additive and rejects wrong owners and assets",()=>{
 const sql=ghostsSql(manifest,model);
 assert.equal(sql,readFileSync(new URL("../supabase/import-october-2026-36-ghosts.sql",import.meta.url),"utf8"));
 assert.doesNotMatch(sql,/\b(update|delete|truncate|drop|alter|grant|revoke)\b/i);
 assert.match(sql,/World identity collision/);
 assert.match(sql,/Artwork identity collision/);
 assert.match(sql,/Artwork asset collision/);
 assert.equal((sql.match(/insert into public.artworks /g)||[]).length,78);
 assert.match(sql,/set constraints all immediate;\ncommit;/);
 assert.doesNotMatch(sql,/world_threads|auth\./);
});
test("All 156 derivatives match checksums and preserve complete source aspect ratios",async()=>{
 assert.equal(assets.length,78);
 for(const item of model.items) {
  const asset=assets.find(i=>i.id===item.id)!;
  for(const [url,sha,bytes,maxHeight] of [[asset.src,asset.sha256,asset.bytes,2400],[asset.thumbSrc,asset.thumbSha256,asset.thumbBytes,800]] as const) {
   const data=readFileSync(new URL(`../public${url}`,import.meta.url));
   assert.equal(data.length,bytes); assert.equal(hash(data),sha);
   const m=await sharp(data).metadata();
   assert.equal(m.format,"webp"); assert.ok(m.height!<=maxHeight);
   assert.ok(Math.abs(m.width!/m.height!-item.width/item.height)<0.003);
   assert.equal(m.exif,undefined);
  }
 }
});
