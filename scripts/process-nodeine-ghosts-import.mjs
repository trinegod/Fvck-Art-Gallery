import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";
import { hash, stableId, quote } from "./process-nodeine-moon-import.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));

/** @param {typeof import("./nodeine-ghosts-manifest.json")} manifest */
export function buildGhostsImport(manifest) {
  const c = manifest.collection;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.key) || !/^[a-z0-9]+$/.test(c.prefix)) throw Error("Unsafe collection identity");
  if (!Number.isSafeInteger(c.sortOrder) || c.sortOrder < 1) throw Error("Invalid collection order");
  if (!manifest.items.length || manifest.items.length !== manifest.duplicateReview.sourceFiles) throw Error("Incomplete source inventory");
  const collection = { ...c, id: stableId(`nodeine:collection:${c.key}`) };
  const sources = new Set(), pixels = new Set(), drives = new Set(), names = new Set();
  const items = manifest.items.map((source, index) => {
    if (!/^[a-f0-9]{64}$/.test(source.sha256) || !/^[a-f0-9]{64}$/.test(source.pixelSha256)) throw Error("Missing source fingerprints");
    if (sources.has(source.sha256) || pixels.has(source.pixelSha256) || drives.has(source.driveId) || names.has(source.sourceName)) throw Error("Unreviewed duplicate source");
    sources.add(source.sha256); pixels.add(source.pixelSha256); drives.add(source.driveId); names.add(source.sourceName);
    if (path.basename(source.sourceName) !== source.sourceName || !/^[a-zA-Z0-9-]+\.PNG$/i.test(source.sourceName)) throw Error("Source must be a safe filename");
    if (![source.width, source.height, source.size].every(n => Number.isSafeInteger(n) && n > 0)) throw Error("Invalid source dimensions or size");
    const number = String(index + 1).padStart(3, "0");
    return {
      ...source, id: stableId(`nodeine:artwork:${c.key}:${source.sha256}`),
      title: `${c.title} ${number}`, description: `Artwork ${number} in ${c.title}.`,
      src: `/art/${c.prefix}-${number}.webp`, thumbSrc: `/thumbs/${c.prefix}-${number}.webp`,
      sortOrder: index + 1, tags: [...c.tags],
    };
  });
  return { collection, items };
}

/**
 * @param {typeof import("./nodeine-ghosts-manifest.json")} manifest
 * @param {ReturnType<typeof buildGhostsImport>} model
 */
export function ghostsSql(manifest, model) {
  const { collection: c, items } = model, q = quote;
  return `-- Generated from the verified 78-image Ghosts manifest.
-- Additive content only; no schema, permissions, existing worlds or messages changed.
-- Publish matching assets first. Reruns preserve owner edits.
begin;
do $$ begin
  if not exists(select 1 from public.profiles where id=${q(manifest.ownerId)} and username='founder') then raise exception 'Expected founder is missing'; end if;
  if exists(select 1 from public.collections where (slug=${q(c.key)} and id<>${q(c.id)}) or (id=${q(c.id)} and (owner_id is distinct from ${q(manifest.ownerId)}::uuid or slug is distinct from ${q(c.key)}))) then raise exception 'World identity collision'; end if;
end $$;
insert into public.collections (id,owner_id,title,slug,summary,world_code,sort_order)
values (${q(c.id)},${q(manifest.ownerId)},${q(c.title)},${q(c.key)},${q(c.summary)},${q(c.worldCode)},${c.sortOrder})
on conflict (id) do nothing;
${items.map(i => `insert into public.artworks (id,collection_id,title,src,thumb_src,media_type,mood,tags,sort_order)
values (${q(i.id)},${q(c.id)},${q(i.title)},${q(i.src)},${q(i.thumbSrc)},'image',${q(c.mood)},array[${i.tags.map(q).join(",")}]::text[],${i.sortOrder})
on conflict (id) do nothing;`).join("\n")}
do $$ begin
  if (select count(*) from public.artworks where collection_id=${q(c.id)} and id in (${items.map(i=>q(i.id)).join(",")})) <> ${items.length} then raise exception 'Artwork identity collision'; end if;
  if exists(select 1 from (values ${items.map(i=>`(${q(i.id)}::uuid,${q(i.src)},${q(i.thumbSrc)})`).join(",")}) as expected(id,src,thumb_src) join public.artworks a on a.id=expected.id where a.src is distinct from expected.src or a.thumb_src is distinct from expected.thumb_src or a.media_type is distinct from 'image') then raise exception 'Artwork asset collision'; end if;
end $$;
set constraints all immediate;
commit;
`;
}

async function writeNewAsset(destination, data) {
  try { await writeFile(destination, data, { flag: "wx" }); }
  catch (error) {
    if (error.code !== "EEXIST") throw error;
    if (hash(await readFile(destination)) !== hash(data)) throw Error(`Refusing to overwrite different asset: ${destination}`);
  }
}

async function main() {
  const sourceDirectory = process.argv[2];
  if (!sourceDirectory) throw Error("Usage: node scripts/process-nodeine-ghosts-import.mjs /path/to/originals");
  const manifest = JSON.parse(await readFile(path.join(root, "scripts/nodeine-ghosts-manifest.json"), "utf8"));
  const model = buildGhostsImport(manifest);
  // Verify the entire inventory before writing any publishable content.
  for (const item of model.items) {
    const source = await readFile(path.join(sourceDirectory, item.sourceName));
    if (source.length !== item.size || hash(source) !== item.sha256) throw Error(`Source changed or incomplete: ${item.sourceName}`);
    const pixels = await sharp(source).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const fingerprint = createHash("sha256").update(JSON.stringify(pixels.info)).update(pixels.data).digest("hex");
    if (fingerprint !== item.pixelSha256) throw Error(`Pixel fingerprint changed: ${item.sourceName}`);
  }
  const outputs = [];
  for (const item of model.items) {
    const original = path.join(sourceDirectory, item.sourceName);
    const art = await sharp(original).rotate().resize({ width: 2000, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 90, effort: 5 }).toBuffer();
    const thumb = await sharp(original).rotate().resize({ width: 640, height: 800, fit: "inside", withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toBuffer();
    await writeNewAsset(path.join(root, "public", item.src), art);
    await writeNewAsset(path.join(root, "public", item.thumbSrc), thumb);
    outputs.push({ id: item.id, src: item.src, sha256: hash(art), bytes: art.length, thumbSrc: item.thumbSrc, thumbSha256: hash(thumb), thumbBytes: thumb.length });
  }
  await writeFile(path.join(root, "supabase/import-october-2026-36-ghosts.sql"), ghostsSql(manifest, model));
  const fallback = model.items.map(i=>({ id:i.id, title:i.title, type:"image", src:i.src, thumbSrc:i.thumbSrc, series:model.collection.title, category:model.collection.category, mood:model.collection.mood, model:"AI Generated", description:i.description, tags:i.tags }));
  await writeFile(path.join(root,"lib/ghosts-fallback-world.ts"), `// Generated from the verified (36) Ghosts manifest.\nimport type { ImportedFallbackItem } from "./imported-fallback-worlds";\n\nexport const ghostsFallbackItems: ImportedFallbackItem[] = ${JSON.stringify(fallback,null,2)};\n`);
  await writeFile(path.join(root,"scripts/nodeine-ghosts-assets.json"),JSON.stringify(outputs,null,2)+"\n");
  console.log(JSON.stringify({ world:model.collection.id, artworks:model.items.length, optimizedBytes:outputs.reduce((n,i)=>n+i.bytes+i.thumbBytes,0) }));
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(error); process.exitCode=1; });
}
