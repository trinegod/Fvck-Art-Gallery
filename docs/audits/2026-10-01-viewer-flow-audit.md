# Viewer-flow audit after the (36) Ghosts release

Public production code: `2d82023e5ca055e008c65de455ed2d085d368bae`. Three independent audits plus root compact-screen checks; signed-out session, not a claim of complete authenticated/device coverage.

## Confirmed priorities

- [ ] **P2: contain and restore focus in both legacy artwork pop-ups.** Archive `/` and `/creator/founder`: open Ghosts 001, Tab reaches obscured Ghosts 002; on profile Enter activates that hidden card. Close returns focus to BODY. Reuse the existing dialog/viewer behavior (not an additional control). Source: `app/page.tsx:480,803` legacy selected-artwork dialog and `app/creator/[username]/creator-gallery.tsx:211,255,276`.
- [ ] **P2: distinguish failed history from empty chat.** Actual loadPage callback fixture twice reproduced failed fetch → loading false + zero messages → “beginning of this conversation”, while error is below composer. Add a clearly separate inline Retry messages state preserving drafts. Source: `app/messages/messages-view.tsx:872,2059`. Not tested in a live private conversation.
- [ ] **P3: correct existing tap targets.** Creator World chips measure 34 px high; profile and Archive close controls 40×40. Project minimum 44 px. Source: `app/creator/[username]/creator-gallery.tsx:164,280` and `app/page.tsx:828`.
- [ ] **P3: remove invisible attachment-input keyboard stop.** `app/messages/messages-view.tsx:2087` has an unnamed sr-only file input with no negative tabIndex, alongside the intended Add attachment menu. Source-confirmed; assistive-technology test still needed.

## Reliability test still needed (not a proven production bug)

- [ ] Two-client suspend/disconnect/reconnect test: subscriptions lack explicit catch-up after recovery (`messages-view.tsx:759,920`). Check whether missed messages appear without reopening; preserve scroll and drafts if adding reconciliation.
- [ ] Signed-in direct/group sends, voice recording/playback, edit/remove, Seen, mute, invitations, appearance and artwork sharing on a physical phone.
- [ ] Signed-in Forge, Saved, profile changes/publishing, auth recovery/return flow, enlarged text and screen reader.

## Passed

- All 78 Ghosts records and all 156 new derivatives verified on both public hosts (312 checksum checks); no exact source duplicates. Existing public catalog totals 18 Worlds/490 artworks.
- 535 automated tests; TypeScript pass; ESLint 0 errors/5 existing warnings; both production builds passed.
- Desktop 1280×720: World/gallery/artwork/full-size controls, Thread lineage/response anchor, Discover Ghosts search and 24→48→72→78 pagination, Feed/creator entry, creation/account/signed-out gates.
- Mobile emulation 390×844 and 320×568: all 78 gallery links; final artwork reachable; canonical full-size controls 44 px and unobstructed, previous/close, feedback mode scroll/close, no tested-page horizontal overflow. Feed bottom navigation targets 44 px and unobstructed; Create reflows at 320 px.
- Archive initially shows fallback inventory, then settles to 20 Worlds/509 pieces: live catalog plus intentional local-only Martyrs/Vessels. Not a missing-content defect.

No private messages, microphone sessions or new public test content were created during this audit. Tracked follow-up: https://github.com/trinegod/Fvck-Art-Gallery/issues/3.
