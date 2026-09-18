# Artwork viewing and compact Worlds — September 17, 2026

## Scope and primary task

Owner-approved small refinement: discover a World, open a piece, inspect its full image, and follow explicitly curated companion pieces without redundant navigation. Chat behavior, private data, artwork sources, uploads, Saved storage, and Forge capabilities are unchanged. Reuses `ArtworkFocusView` and the existing dialog primitive; no dependencies or new art assets.

## Decisions

- One View full size / Enlarge entry on canonical artwork pages. The full-screen viewer has Close, fit/actual-size, and optional previous/next in creator World order. Closing returns to the original detail page, as stated in the dialog description. No autoplay; opening pauses the underlying video. Native video seeking and enlarged-image panning retain their arrow keys.
- Creator connections come only from complete public Threads owned by the World's creator, with unique artwork IDs, current-piece membership and one World. The smallest eligible Thread wins deterministically. The existing public query considers up to 24 Threads; this is not an exhaustive index of every possible connection. Missing/failed Thread reads omit the strip rather than guessing.
- World sequence loads stable inclusive 500-row pages and deduplicates IDs, not titles or similar images. A failed/null page falls back to the current artwork alone instead of showing a partial sequence as complete.
- Related thumbnails preserve full accessible titles and original destinations; shared literal scene prefixes are shortened visually to make detail names readable. Existing feed-return context survives these links and the World link. Curated pieces are excluded from the separate metadata-based suggestions.
- Removed the duplicate World counter panel and visible Gallery heading. Counts remain in the four existing layer links; live feed/World copy calls the existing feature Threads. Saved is still one destination under You.

## Observed browser checks

Development app using the real public catalog and existing signed-in session; no comments, likes, saves, messages or database writes were made.

- At 1280×720, Aspects of the Moon's first gallery tile moved from y=781 before this pass to y=453: 328px earlier. All 32 pieces and 15 Threads remain visible in the layer counts. No document horizontal overflow.
- At 390×844, first World artwork y=407; at 320×568, y=452. The responsive harness used actual routes in same-origin viewports; it was removed before release. At 320px with 200% root text size, the World header, links and gallery reflow and document width remains 320px. This is a text-reflow check, not a physical-device or OS-text-setting certification.
- Canonical Moon Companions shows the full scene, Monkey portrait, Rabbit portrait and diptych in the creator strip. No curated IDs appear again in the Signal Trail. Detail names remain distinguishable.
- Full viewer at 1280×720 fills exactly that rectangle. At the final real 320×568 browser viewport, both page scroll width and modal width are 320px. The underlying page initially expanded to 384px because of grid min-content sizing; an explicit `minmax(0,1fr)` column resolved it.
- Next and ArrowRight move one item, preserve button focus and update the current title/count. Escape closes and restores View full size focus after dialog exit. Opening starts at the original piece. During development, a keyed focus-view remount lost button focus; retaining the shared component fixed this.
- Actual size renders the loaded 941×1672 source at natural dimensions. In the 320px viewport its own scroll region spans 973px including padding, with horizontal and vertical panning available; the dialog remains viewport-sized. Arrows are hidden while inspecting at actual size. No fake upscale or generated details.
- Video detail and full viewer both expose native controls, with `autoplay=false` and `paused=true` on entry. No Actual size image control on video.
- Existing authenticated Saved list and saved-artwork detail open successfully. Shared focus-control markup is covered automatically; a complete Saved/Archive/creator-gallery interaction matrix remains untested.

## Automated checks and release boundary

- 503 tests pass, including eight added cases for curation boundaries, deterministic selection, 1,001-row pagination, distinct details, read failures, wrapping navigation, feed-context links and shared viewer controls. Existing feed-label assertion updated to Threads.
- TypeScript passes; ESLint has zero errors and five pre-existing warnings. `git diff --check` passes.
- Initial sandbox production build could not fetch Google Fonts. The network-enabled retry fetched fonts but Turbopack's local worker was denied a port bind by the host environment. Local production build is therefore not claimed as passing; the authorized hosted build is the release gate and its result is recorded separately.
- GitHub commit, both production host revisions and iCloud-folder recovery verification are recorded after completion in issue #1, not inferred from local source changes.

## Remaining checks

Physical phone Safari/Android touch panning, device safe areas, native video playback with real audio, screen-reader live announcements, browser zoom distinct from text reflow, all older gallery entry points, and large/live-changing World inventories remain separate checks. The actual-size mode is native scrolling, not a custom pinch-zoom engine. No new cross-device Saved organization is claimed.
