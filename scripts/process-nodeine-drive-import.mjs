import { createHash } from "node:crypto";
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import sharp from "sharp";

const root = process.cwd();
const downloadsDir = "/Users/stevenadkins/Downloads";
const manifestPath = path.join(
  root,
  "scripts/nodeine-drive-import-manifest.json"
);
const artDir = path.join(root, "public/art");
const videoDir = path.join(root, "public/video");
const thumbsDir = path.join(root, "public/thumbs");
const sqlPath = path.join(root, "supabase/import-august-2026-media.sql");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

await Promise.all([
  mkdir(artDir, { recursive: true }),
  mkdir(videoDir, { recursive: true }),
  mkdir(thumbsDir, { recursive: true }),
]);

function deterministicUuid(key) {
  const bytes = createHash("sha256").update(key).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlTags(tags) {
  return `array[${tags.map(sqlString).join(", ")}]::text[]`;
}

function normalizedDownloadName(value) {
  return value
    .toLowerCase()
    .replace(/ \(\d+\)(?=\.[^.]+$)/, "")
    .replace(/\.(mov|mp4)$/i, ".video");
}

async function locateSource(item, downloadEntries) {
  const exactMatches = downloadEntries.filter(
    (entry) => entry.toLowerCase() === item.sourceName.toLowerCase()
  );
  const normalizedMatches = downloadEntries.filter(
    (entry) =>
      normalizedDownloadName(entry) === normalizedDownloadName(item.sourceName)
  );

  for (const entry of [...exactMatches, ...normalizedMatches]) {
    const candidate = path.join(downloadsDir, entry);
    if ((await stat(candidate)).size === item.size) return candidate;
  }

  throw new Error(
    `Missing source file ${item.sourceName} (${item.size} bytes) in Downloads`
  );
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`${command} exited ${code}: ${output}`));
    });
  });
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => runWorker())
  );
  return results;
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

const downloadEntries = await readdir(downloadsDir);
const importRows = [];
const videoOutputsBySource = new Map();
const imageJobs = [];
const videoJobs = [];

for (const collection of manifest.collections) {
  collection.id = deterministicUuid(`nodeine:collection:${collection.key}`);

  for (const [index, item] of collection.items.entries()) {
    const number = String(index + 1).padStart(3, "0");
    const title = `${collection.title} ${number}`;
    const isVideo = item.mimeType.startsWith("video/");
    const sourcePath = await locateSource(item, downloadEntries);
    let src;
    let thumbSrc;

    if (isVideo) {
      const dedupeKey = `${item.sourceName.toLowerCase()}:${item.size}`;
      const existingOutput = videoOutputsBySource.get(dedupeKey);

      if (existingOutput) {
        src = existingOutput.src;
        thumbSrc = existingOutput.thumbSrc;
      } else {
        const outputBase = `${collection.prefix}-${number}`;
        const outputPath = path.join(videoDir, `${outputBase}.m4v`);
        const posterPath = path.join(thumbsDir, `${outputBase}.webp`);
        src = `/video/${outputBase}.m4v`;
        thumbSrc = `/thumbs/${outputBase}.webp`;
        videoOutputsBySource.set(dedupeKey, { src, thumbSrc });
        videoJobs.push({ sourcePath, outputPath, posterPath, title });
      }
    } else {
      const outputBase = `${collection.prefix}-${number}`;
      const outputPath = path.join(artDir, `${outputBase}.webp`);
      const thumbnailPath = path.join(thumbsDir, `${outputBase}.webp`);
      src = `/art/${outputBase}.webp`;
      thumbSrc = `/thumbs/${outputBase}.webp`;
      imageJobs.push({ sourcePath, outputPath, thumbnailPath, title });
    }

    importRows.push({
      id: deterministicUuid(`nodeine:artwork:${collection.key}:${index + 1}`),
      collectionId: collection.id,
      title,
      src,
      thumbSrc,
      mediaType: isVideo ? "video" : "image",
      mood: collection.mood,
      tags: collection.tags,
      sortOrder: index + 1,
    });
  }
}

console.log(`Processing ${imageJobs.length} images...`);
await mapWithConcurrency(imageJobs, 5, async (job) => {
  if (!(await fileExists(job.outputPath))) {
    await sharp(job.sourcePath)
      .rotate()
      .resize({ width: 2000, height: 2400, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 90, effort: 5 })
      .toFile(job.outputPath);
  }

  if (!(await fileExists(job.thumbnailPath))) {
    await sharp(job.sourcePath)
      .rotate()
      .resize({ width: 640, height: 800, fit: "cover", position: "attention" })
      .webp({ quality: 82, effort: 5 })
      .toFile(job.thumbnailPath);
  }

  return job.title;
});

console.log(`Processing ${videoJobs.length} unique videos...`);
await mapWithConcurrency(videoJobs, 3, async (job) => {
  if (!(await fileExists(job.outputPath))) {
    const temporaryOutput = `${job.outputPath}.encoding.m4v`;
    await run("/usr/bin/avconvert", [
      "--source",
      job.sourcePath,
      "--preset",
      "PresetAppleM4V720pHD",
      "--output",
      temporaryOutput,
      "--replace",
      "--disableMetadataFilter",
    ]);
    await copyFile(temporaryOutput, job.outputPath);
    await rm(temporaryOutput);
  }

  if (!(await fileExists(job.posterPath))) {
    const posterDirectory = await mkdtemp(
      path.join(tmpdir(), "nodeine-video-poster-")
    );

    try {
      await run("/usr/bin/qlmanage", [
        "-t",
        "-s",
        "1200",
        "-o",
        posterDirectory,
        job.outputPath,
      ]);
      const generatedPoster = path.join(
        posterDirectory,
        `${path.basename(job.outputPath)}.png`
      );
      await sharp(generatedPoster)
        .resize({ width: 640, height: 800, fit: "cover", position: "attention" })
        .webp({ quality: 84, effort: 5 })
        .toFile(job.posterPath);
    } finally {
      await rm(posterDirectory, { recursive: true, force: true });
    }
  }

  return job.title;
});

const collectionSql = manifest.collections
  .map(
    (collection) => `insert into public.collections (
  id, owner_id, title, slug, summary, world_code, sort_order
) values (
  ${sqlString(collection.id)},
  ${sqlString(manifest.ownerId)},
  ${sqlString(collection.title)},
  ${sqlString(collection.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""))},
  ${sqlString(collection.summary)},
  ${sqlString(collection.worldCode)},
  ${collection.sortOrder}
)
on conflict (id) do update set
  title = excluded.title,
  slug = excluded.slug,
  summary = excluded.summary,
  world_code = excluded.world_code,
  sort_order = excluded.sort_order;`
  )
  .join("\n\n");

const artworkSql = importRows
  .map(
    (row) => `insert into public.artworks (
  id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order
) values (
  ${sqlString(row.id)},
  ${sqlString(row.collectionId)},
  ${sqlString(row.title)},
  ${sqlString(row.src)},
  ${sqlString(row.thumbSrc)},
  ${sqlString(row.mediaType)},
  ${sqlString(row.mood)},
  ${sqlTags(row.tags)},
  ${row.sortOrder}
)
on conflict (id) do update set
  collection_id = excluded.collection_id,
  title = excluded.title,
  src = excluded.src,
  thumb_src = excluded.thumb_src,
  media_type = excluded.media_type,
  mood = excluded.mood,
  tags = excluded.tags,
  sort_order = excluded.sort_order;`
  )
  .join("\n\n");

await writeFile(
  sqlPath,
  `-- Generated from scripts/nodeine-drive-import-manifest.json.\n-- Safe to rerun: collection and artwork IDs are deterministic.\n\nbegin;\n\n${collectionSql}\n\n${artworkSql}\n\ncommit;\n`
);

const imageBytes = (
  await Promise.all(
    imageJobs.flatMap((job) => [stat(job.outputPath), stat(job.thumbnailPath)])
  )
).reduce((total, entry) => total + entry.size, 0);
const videoBytes = (
  await Promise.all(
    videoJobs.flatMap((job) => [stat(job.outputPath), stat(job.posterPath)])
  )
).reduce((total, entry) => total + entry.size, 0);

console.log(
  JSON.stringify(
    {
      collections: manifest.collections.length,
      artworks: importRows.length,
      images: imageJobs.length,
      videos: importRows.filter((row) => row.mediaType === "video").length,
      uniqueVideos: videoJobs.length,
      optimizedBytes: imageBytes + videoBytes,
      sqlPath,
    },
    null,
    2
  )
);
