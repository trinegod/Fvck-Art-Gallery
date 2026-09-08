# Group About, shared avatar framing and text fit

September 8, 2026. Scope: group description, adjustable group avatars, the same editor for each creator's own profile, and snug short text. Base: `3f33a91`. This does not change invitation acceptance, voice duration/playback, or other users' profile permissions.

## Delivered behavior

- Group header → **Group details → About this group**. Current members read; owners/admins edit up to 500 Unicode code points. Save uses the exact PostgreSQL version; conflicting/uncertain results preserve work and require refresh/review. Denied reads clear previously loaded private content.
- Group **Choose image** and Studio **Profile picture** use `components/avatar-crop-editor.tsx` and `lib/avatar-crop.ts`. Circular preview, drag, labeled native X/Y/zoom sliders, reset, cancel, local confirmation and explicit parent Save. Confirmation/cancellation restores picker focus only when the crop owned focus.
- Source preflight: still JPEG/PNG/WebP, 8 MiB, 24 MP, 8192px/side, header bounds before native decode and decoded-dimension recheck. GIF/SVG/animated inputs are not accepted. Decode/encode deadlines, stale-operation cancellation and object-URL cleanup are implemented. Browser-native allocation cannot be forcibly reclaimed while a decoder is still busy.
- Output: newly encoded square 512px JPEG, up to 2 MiB; no source metadata is copied. Transparency is flattened on graphite. Cropping is local, not an AI-generation service and consumes no model credits.
- Replacement uploads use new paths. Previous images are not overwritten/deleted before the profile/group record save. This preserves a recoverable image when delivery is uncertain, at the cost of retained versions/orphans. Personal images remain public; group images retain private conversation-media access. No new bucket or broader Storage grant.
- Text/tombstones use an intrinsic-width content wrapper; metadata can remain wider without stretching the bubble. Voice/media keep their intentional widths and action targets.

## Measured diagnosis and browser checks

The actual outgoing two-character “Hi” bubble was 104.34375px wide. Its text measured 13.125px with 32px total padding; the parent inherited width from timestamp/action metadata. No minimum-width or voice-card class caused it. A browser assertion failed before the fix and passed after: **45.125px**, exactly text plus padding. No original messages were edited or deleted.

A temporary, local-only fixture rendered the production crop editor, generated synthetic labeled color blocks through canvas, and had no upload/DB path. Native JPEG, PNG and WebP decoding worked. Keyboard Home/End/arrows changed the crop; confirmation produced bounded JPEGs (examples 5908 and 6226 bytes), and screenshots showed the selected off-center area. Cancel retained the prior confirmed preview.

The crop frame was measured at 320px and 390px: no horizontal overflow; circular canvas 238×238px inside its 240px frame; sliders and default buttons 44px high. Enlarged-text checks exposed inherited fixed button heights; `h-auto` now permits growth. The final 28px-label/42px-line-height check measured 60px buttons without horizontal overflow. These were constrained component frames within a desktop browser, not physical phone sessions or complete 320px viewport tests.

The signed-in founder's real group About loaded with owner controls. A clearly labeled temporary test description saved successfully through the UI, then was cleared through the UI; confirmed empty state restored. No membership, real message, or profile-avatar change was made by this check. Studio → Profile showed the integrated picker and explicit Save path. Actual private/public avatar uploads were not performed in this browser pass.

## Database evidence

Before rehearsal, read-only catalog inspection confirmed activated message controls/mentions, no About table, and no non-internal triggers on the fixture's conversation/member/invitation tables. The rollback script used two existing profile identities read-only and new collision-checked fixture IDs, never profile/Auth/Storage writes or trigger disabling.

The first rehearsal failed at its catalog fingerprint: adding a legitimate foreign key introduces internal parent-table constraint triggers. The transaction was rolled back; the About table and fixture groups were confirmed absent. The corrected fingerprint excludes **only** the new About foreign-key triggers, retains all historical triggers, and separately asserts the new cascading FK.

The complete corrected rehearsal passed its mandatory **38 assertions**, then returned `rollback_restored = true`. It covers current/pending/former/outsider/anonymous roles; owner/admin writes; direct-table denial; 500/501 code points; exact stale/initial version conflicts; monotonic microseconds; and preservation of existing controls/grants/policies. The additive migration was then applied. Eight live postconditions all returned true: RLS, direct-read denial, scoped read/write grants, anonymous denial, unchanged whole-group deletion gate, no About realtime publication, and historical control/mention routines retained.

- Migration SHA-256: `1b87b76aac3c9c9292f1175eb4b815573d89743f285aa5ffce58c8a862767998`.
- Rollback rehearsal SHA-256: `da5b6fbea39c8262ee69ec5cf14fb69143efcfac8099bcb73ece3de6ef66917e`.
- Files: `supabase/group-description.sql`, `supabase/tests/group-description.rollback.sql`. Keep the final ROLLBACK and explicit trigger-review gate.

## Review and verification

Independent agents implemented/audited the image processor, personal-profile integration and member-scoped About. Concrete findings fixed include preview-URL failure leaving confirmation locked, focus loss after crop dismissal, stale private About after access denial, refresh resetting an unfinished crop, and a later save reverting an avatar after display refresh failed. Delayed initial signed-image results are also guarded against replacing a newer confirmed image. Enlarged-text button growth was checked separately.

Tests execute real processor/session logic, actual production callbacks, real Supabase SDK against fake transport, and rendered production JSX. Section tests use a minimal hook adapter plus real ReactDOMServer; they do not emulate real React scheduling, focus traps or native pointer events. SQL source contracts complement—not replace—the live rollback rehearsal.

Final source suite: **427/427 tests pass**. TypeScript and diff checks pass; scoped lint has zero errors and four pre-existing Studio `no-img-element` warnings. The temporary visual fixture was removed before release. Local Turbopack production builds failed on process/port creation with `Operation not permitted`, including the requested escalated run; local attempts stopped rather than changing bundlers or bypassing the restriction. The existing authorized Vercel workflow supplies the separate production build gate.

Final hosted build, deployment and backup identifiers are tracked in the [canonical GitHub checklist](https://github.com/trinegod/Fvck-Art-Gallery/issues/1). Source code is not evidence of a completed deployment.

## Remaining limits

- Physical iOS/Android dragging, native photo-picker/HEIC conversion, EXIF orientation across actual devices, screen-reader/focus behavior and a complete real two-account avatar upload flow still need device QA. Keyboard crop and synthetic native decoding are verified, not all camera formats.
- The version-conflict SQL check models stale writers in one transaction; simultaneous separate sessions and realtime timing are not claimed.
- About refreshes on reopening/focus when clean or explicit Refresh for readers. It is not a live collaborative text editor. Existing group identity/profile writes remain last-writer-wins; only About has new optimistic concurrency.
- Old avatar objects and uncertain uploads may remain stored. Removing/replacing the visible reference is not guaranteed byte erasure; cleanup remains a separately reviewed feature. No production images were removed here.
- iCloud source/bundle backups do not back up Supabase data, private media, authentication or deployment secrets. Locally verified iCloud-folder copies do not prove Apple's remote sync completion.
