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
- [ ] Normal artwork has no markers.
- [ ] Mobile/desktop and keyboard placement verified.
- [ ] Draft lifetime, unknown retry and author-only mutation verified.
- [ ] Additive migration and rollback-only SQL checks pass.
- [ ] Real test notes posted through the authorized account; direct public link verified.
- [ ] Tests, typecheck, lint and hosted production build pass.
- [ ] Release evidence, README, GitHub and recoverable backup recorded.

## Blocked by

None for implementation. Posting as the designated test user depends on restoring its ordinary sign-in; do not impersonate it with a privileged database write.
