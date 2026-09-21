# Pinpoint image feedback — September 20

## Scope and authorization

The owner explicitly requested finishing the entire pinpoint feedback feature and leaving several labeled test notes on one Aspects of the Moon image. This pass is limited to image feedback; World revisit history is deferred. Canonical implementation/QA tracker: https://github.com/trinegod/Fvck-Art-Gallery/issues/2.

## Implemented

- Reuse public Discussion and the existing owner Activity notification, with optional normalized coordinates and original source binding.
- Keep normal artwork unmarked. An explicit Feedback on the image control opens a viewport-filling image/notes view; deliberate Add a pin activates placement.
- Native keyboard position sliders, labeled 44px controls, source-change explanation, readable notes on image failures, retryable reads, confirmed author-only removal.
- Shared integration across canonical artwork, Feed, Archive, creator gallery and Saved. Video stays ordinary discussion.
- Draft/attempt state lives above the dialog portal; closing preserves an unfinished note on the current artwork/account. No browser-storage persistence. Unknown retries retain the exact original ID, content and anchor even if a subsequent request is rejected.

## Database evidence

Read the live comments policies/grants and artwork source/media columns before activation. Existing own-author insert/delete RLS was present, but anon/authenticated had broad legacy table grants. Applied the reviewed additive migration through the existing owner SQL Editor: Success, no rows returned. No existing comments/artwork were deleted.

Inspected the two installed comments trigger functions before rehearsal. Source validation is security invoker; the existing security-definer notification function only inserts a transaction-bound notification with deduplicated source key. No nontransactional external trigger effects were found on comments/notifications.

Catalog verification and the complete rollback-only behavioral script passed **29 checks**: ordinary/pinned insert, duplicate ID/one owner notification, forged author, anonymous mutations, foreign delete, author deletion, private notification read, timestamp/update denial, half-null/NaN/infinite/out-of-range points, wrong source and video rejection. All fixture changes rolled back. SQL role/JWT-claim simulation is not an authenticated browser-login test.

## Application verification

- Full test suite: **530 passed, 0 failed** (17 feedback transport/geometry tests).
- TypeScript passed; ESLint passed with five pre-existing warnings.
- Actual local app, Moon Companions: full-screen feedback at 390 × 844, 320 × 740 and 1440 × 900. No horizontal overflow at 320 or 390; closed normal view has no markers. Close and composer controls measured 44px minimum. No browser console warnings/errors observed in the inspected session.
- Keyboard Enter selects center point. A non-posted test draft survived close/reopen and was explicitly discarded.
- Independent data/security and UI review prompted sticky unknown-outcome reconciliation, scoped target/focus styles, note/image navigation, accessible success messages and explicit nested-keyboard isolation.
- Real browser posting exposed a float8 JSON serialization mismatch: the database returned 0.320662186356678 for a sent coordinate of 0.32066218635667765. The note committed once, but strict equality incorrectly left delivery unconfirmed. A reproduced failing transport test now passes with a 1e-14 normalized-coordinate tolerance; ID, author, artwork, text and source still match exactly. A moved-point negative test remains rejected. The next real browser post confirmed immediately, with no duplicate from the earlier retry.

## Release and remaining checks

Publication pending. Local production build first failed to fetch the existing Google Fonts; an approved network-enabled retry hit a Turbopack subprocess port-permission restriction. No sandbox settings were weakened. Hosted production build must pass before a live completion claim.

The normal local app is signed into Founder; the separate gallery test-account origin is signed out. No test credential was extracted or reset. Following the owner's instruction to finish and publish, the demonstration uses clearly labeled **QA demo** notes through the normal Founder session. **No Sakura demo comment is claimed.**

Three real public QA notes are saved on **Moon Companions** (`f364b74b-0b3c-5dc2-88bd-5a5863308a00`): moon lighting/palette, rabbit silhouette and fabric/armor texture. The normal app confirmed all three and the full-screen view shows three distinct numbered positions. The test-posting flow also exercises ordinary comments and confirmed own-comment removal; only the temporary removal-check text is deleted, not the three demonstration notes.

Remaining: real authenticated post/read on both public hosts; actual phone/touch and screen-reader checks; long/dense note overlap; all three legacy gallery modal integrations keyboard-tested in browser. Interface and transport tests do not replace these checks.

## Recovery

Prior release is d7931b0. Roll back the UI to that version if necessary and retain additive nullable columns; old comments readers remain compatible. Do not rerun legacy comments.sql after activation without reviewing its broader grant statement. Source backup is not a Supabase data/auth/storage backup.
