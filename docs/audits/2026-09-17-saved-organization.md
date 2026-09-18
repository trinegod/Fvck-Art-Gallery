# Saved organization — September 17, 2026

## Scope and decisions

Small owner-requested organization pass after the World-viewing release. Find an existing saved piece with local metadata search and a contextual World selector. No new destination, folder database, dependency, private-data write, fabricated artwork, account, or content generation.

- Search matches all whitespace-separated terms, case-insensitively, across title, World title/code, creator name/handle, mood and tags. Filtering preserves newest-save-first order.
- The World selector is omitted for a one-World collection; it remains available if the last piece in an actively filtered World is unsaved, so the selection can be cleared. Worlds are keyed by ID, not title.
- Clear filters clears both controls and returns focus to search. Empty search results are distinguished from an empty collection and from a failed load. Read errors offer a scoped retry without changing saves.
- Opening a result preserves the query. The existing detail/full-size viewer moves within filtered results; typing arrow keys in comments does not navigate artwork. The viewer grid has a zero-minimum content column to avoid narrow-screen min-content overflow, and Close has a 44px target.
- Read all private save rows in stable inclusive 500-row pages; artwork/World/profile metadata uses unique 100-ID batches. Missing inaccessible artwork is omitted, not deleted. Null/failed pages are errors rather than a misleading partial result. Account epoch guards reject stale completions and subsequent metadata reads. Search stays in memory, not URLs, logs or browser storage.

## Observed browser checks

The existing authenticated local collection was read without making saves, likes, comments or other database changes. It contains one saved piece in one World, so multi-World behavior was checked separately with three synthetic rows in a temporary local-only fixture using the production controls/filter functions; that route was removed before release.

- At 390×844, actual Saved search matches the existing piece; an unmatched query shows 0 of 1 with recovery copy. Clear restores the piece and search focus. Input height is 46px; document width and scroll width are both 390px. The single tile keeps a normal grid width and the existing dock remains unchanged.
- At 320×568, the real filtered artwork opens with Result 1 of 1. Dialog and document widths are 320px. Closing retains the query. Existing saved state remains intact.
- Multi-World fixture: selecting one World then searching detail returns exactly one of three pieces. Clear resets both query and World and restores all three plus search focus.
- Production filter controls reflow at 320px, including 200% root text: document scroll width remains 320px, controls remain inside the content width, and the count wraps without clipping. Normal input/select targets are at least 44px; enlarged controls grow. This is text reflow, not a physical-phone/browser-zoom certification.

## Automated checks

- Ten new tests cover combined search/World filtering, newest-first order, metadata matching, World identity/counts, 1,001 saves across three pages, bounded metadata reads, GET-only requests, partial/null failures, inaccessible artwork, empty-IN avoidance, stale account success/error races, signed-out guards and conditional accessible control markup.
- Full suite: 513 tests pass. TypeScript and whitespace checks pass. ESLint has zero errors and five existing warnings outside this change.
- Production build, GitHub revision, live smoke check and iCloud-folder recovery evidence are recorded after completion in release issue #1; implementation alone is not evidence of deployment or Apple cloud synchronization.

## Limits / follow-up

Physical Safari/Android, screen-reader announcement behavior, native keyboard overlays, live concurrent save changes during offset pagination, and a multi-World production account remain untested. Concurrent mutations may affect a paginated snapshot; refresh loads current state. The legacy Saved detail overlay was not rewritten as a focus-trapping dialog in this pass, and its full keyboard/accessibility audit remains a follow-up. This is organization inside Saved, not custom folders or cross-device persisted filter preferences.
