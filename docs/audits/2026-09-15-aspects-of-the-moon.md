# Aspects of the Moon import — September 15, 2026

## Authorized scope

The owner asked to publish the new Google Drive folder as a NODEINE world, pair close-ups with their full compositions, omit duplicate posts, deploy the chat date labels with it, and refresh GitHub/iCloud backups. Drive originals, sharing permissions, existing worlds, messages and memberships are not modified.

## Reviewed inventory

- Folder snapshot: 32 PNG files, 98,025,585 original bytes. A second listing confirmed the same file IDs, byte sizes and modification times before publication.
- All 32 images were visually inspected in four contact sheets; the two diptychs were also inspected at larger size. Fourteen full-scene/close-up pairs plus one four-image monkey/rabbit group account for every source exactly once.
- Byte SHA-256 and normalized decoded-pixel fingerprints were unique for all 32 images. Comparing source and optimized-image byte hashes against 378 existing local artwork files found no exact match. This is not a claim of exhaustive perceptual comparison with every historical/private artwork.
- The monkey/rabbit two-panel image is a distinct composition and remains one post, not two extracted copies. Related portraits differ from it and remain in the same group.
- Titles are descriptive catalog labels, not asserted historical character identifications or translations of the image inscriptions. Pairings are curated from subjects, clothing, props and settings; the Threads do not claim the images are exact pixel crops or events in a canonical narrative.

## Implementation and recovery

- `scripts/nodeine-moon-manifest.json` preserves reviewed group order, source names/Drive IDs, checksums and pairing reasons.
- `scripts/process-nodeine-moon-import.mjs` validates the full batch before writing, refuses duplicate sources and conflicting existing assets, and derives stable IDs from source checksums. It generates 32 image/thumbnail pairs, fallback inventory, an asset checksum inventory and additive SQL.
- All web assets are WebP; total image-plus-thumbnail bytes: 16,205,930. Full images preserve native resolution (no enlargement), and thumbnails preserve complete aspect ratios rather than cropping inscriptions or diptychs. Original PNGs belong in the release backup, not the browser download payload.
- World ID: `8ef7fee8-f4a8-54c1-b91a-9be2d32184f5`, slug `aspects-of-the-moon`, World 019. Number 019 follows the source catalog; live numbering need not be contiguous.
- Full compositions precede their details in gallery ordering. Fifteen public World Threads link those groups using the existing composition relationship. Forking defaults off; authorship remains with the verified founder profile.
- The import is one transaction, enforces deferred constraints before commit, checks owner/identity collisions, and does not overwrite existing owner edits on rerun. No schema, grant, RLS, auth, paid provider or chat changes.

## Observed verification

- 468 automated tests passed, including eight import tests and fourteen chat date tests. TypeScript passed; full lint has zero errors and five pre-existing warnings.
- Every derivative was decoded, checked against its shipped SHA-256/byte size and checked for aspect-ratio preservation. No EXIF metadata was retained.
- Live database preflight found the expected founder, no existing world with this slug, 16 collections and 380 artwork rows. The older README's 399/18 count included source-only Martyrs/Vessels inventory; this task does not silently activate those unrelated historical imports. Removed the ambiguous global static count from README.
- A rollback-only execution of the actual generated SQL returned 32 new-world artworks, 15 new-world threads and 380 other artworks, with database constraints passing. A fresh query after rollback confirmed zero retained Moon rows/threads and all 380 existing artworks.
- Publish matching assets to both maintained hosts before committing the content transaction, preventing new public records from pointing at missing assets. The canonical release checklist records actual deployment IDs, activation/readback, route checks and backup evidence after they occur.

## Remaining limits

No physical phone, screen-reader, slow-network or cross-device tests are claimed for this content import. The source backup and Moon import/original-art archive do not constitute a full live Supabase/Auth/private-Storage backup. A verified copy under iCloud Drive establishes local integrity, not Apple's remote synchronization.
