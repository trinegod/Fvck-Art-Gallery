# Pinpoint artwork feedback

## Problem Statement

Artwork discussion cannot currently identify a precise image detail. The owner wants location-specific feedback that leaves ordinary artwork viewing clean, with a real public demo to review on a phone.

## Solution

An explicit Image feedback view beside Discussion shows numbered points and their public notes. Add a pin begins deliberate placement; keyboard users can choose the center and adjust horizontal/vertical positions. Closing restores normal artwork viewing without markers.

## User Stories

1. As a visitor, I can see whether an image has pinpoint feedback and open it without signing in.
2. As a reader, I can select a point or note to connect the observation with the detail it describes.
3. As an artist, I can view my original artwork without overlays outside feedback mode.
4. As a signed-in commenter, I can place and adjust a point, write a note, and explicitly publish it.
5. As a keyboard user, I can place, adjust, post, read, and close without a mouse.
6. As a mobile user, I can scroll artwork and notes with reachable controls and no competing bottom navigation.
7. As a commenter, I retain my unfinished note when closing feedback and can discard it deliberately.
8. As a commenter on an unreliable connection, retries confirm one immutable attempt without duplicate posts.
9. As an author, I can remove my own feedback with explicit confirmation, but cannot remove another person's comments.
10. As an account holder, my drafts and late mutation responses cannot leak into a different account or artwork.
11. As a creator, I receive the existing artwork-comment notification, not a duplicate notification mechanism.
12. As a reader, I can still read a note if its image source changes; an outdated pin is hidden rather than misplaced.
13. As a reader entering from feed, archive, Saved, or creator gallery, I can reach the same image feedback.
14. As the owner, I receive an honest live verification link; a signed-out test account is not reported as a completed public demo.

## Implementation Decisions

Reuse Discussion and ordinary comment identity. Optional normalized coordinates and source binding are additive fields. Existing public reads and authenticated author-only posting/removal remain, with least-privilege direct database grants. Source validation accepts current still images only. No pixel mutation, new media storage, notification type, external service, or installation.

## Testing Decisions

Use the real Supabase client with injected transport for complete reads, denied/failed requests, exact-ID reconciliation and verified removal. Run catalog checks and rollback-only role/constraint tests in the existing database. Inspect the actual app at 320px, 390px and desktop, keyboard placement, portal lifetime and ordinary-view cleanliness. SQL role simulation is not presented as a real authenticated browser session. Preserve explicit gaps for physical phone/screen reader and designated test-account access.

## Out of Scope

World visit history, video/timecode feedback, resolving/replying to individual feedback threads, image editing, reaction counts, AI critique and new global navigation.

## Foundational Layer Assessment

Frontend, database, identity/RLS, error recovery and release verification are required. Backend, notifications, caching and compute are affected through the existing comment path only. No new load balancing or infrastructure. No new server rate quota is claimed. Existing source data stays intact; rollback is the prior UI release with additive columns retained. Repository backup does not represent database/storage recovery.

## Advanced Engineering Gate Assessment

Existing Next.js server/client boundaries and Supabase policies/migration are active gates. No AI, compliance or industry gate is newly introduced.

## Acceptance criteria

- [ ] Public feedback view and all discussion entry points verified.
- [x] Normal artwork has no markers.
- [x] Mobile/desktop browser viewports and keyboard placement verified; physical-phone QA remains.
- [x] Draft close/reopen, immutable unknown retry and author-only mutation verified at documented UI/transport/SQL seams.
- [x] Additive migration and rollback-only SQL checks pass.
- [x] Three labeled Founder QA notes posted through the normal authorized account; direct public link verified without sign-in.
- [x] 530 tests, typecheck, lint and both hosted production builds pass (five existing lint warnings).
- [ ] Release evidence, README, GitHub and recoverable backup recorded.

## Blocked by

None for the released public feedback feature. Sakura's normal session is unavailable; the owner-directed completed release uses clearly labeled Founder QA notes, not impersonation. Production-origin authenticated posting, physical phone/screen reader, dense pins and legacy gallery keyboard flows remain explicit QA checks, not claimed successes.

## Public demo

https://nodeine.vercel.app/artwork/f364b74b-0b3c-5dc2-88bd-5a5863308a00

Choose **Feedback on the image · 3 pins**. Source/release evidence: `docs/audits/2026-09-20-pinpoint-feedback.md`. Recovery artifacts and final remote revisions are recorded below in issue comments after verification.
