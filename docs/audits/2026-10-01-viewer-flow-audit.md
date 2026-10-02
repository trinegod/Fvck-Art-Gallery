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

## Repair pass — local review

The owner subsequently authorized fixing the findings without adding clutter. Three agents split artwork viewers, chat recovery and independent regression review; root handled remaining tap targets and browser verification. The unchecked findings above describe the **previous public release**, not the working-tree implementation below. No database changes, new packages, menus or model services were added.

### Implemented

- **Managed artwork focus:** Archive and creator profile used plain `role="dialog"` containers plus global keyboard/scroll handlers, so nothing contained or restored keyboard focus. Saved had the same underlying gap. All three now use `ArtworkGalleryDialog`, built on the existing Base UI dialog. It captures the original opener, scopes keyboard handling to the active viewer, protects editing/media/nested controls and restores focus to the original tile. Saved falls back to its heading if that tile has been removed.
- **Honest history recovery:** `loadPage` previously wrote a composer error, then cleared loading; the history region rendered its empty state. A separate account/conversation-scoped failure now renders one contextual retry action. Initial/older retries remain single-flight, reuse the failed cursor and personal clear cutoff, merge arriving messages without duplicates, preserve drafts and reject stale results.
- **Tap areas, not extra UI:** Close/World controls, Forge access/selectors/Copy prompt, account tabs/Archive return, Saved/Activity logos and Activity filters/actions use at least 44px targets. Source/source-artwork selects use 16px text. No global Button primitive was changed.
- **Attachment focus:** the implementation-only native file input is `hidden`; the labeled attachment menu still activates it. No invisible sequential-keyboard stop remains.

### Observed verification

- **549/549 tests passed.** Twelve new recovery checks execute the actual history effect/callbacks and rendered recovery/empty-state JSX against controlled database boundaries. Initial failures were reproduced before the patch. Coverage includes double retry, the exact older cursor, preserved messages/drafts/cutoff, empty successful retry, wrong-account/conversation UI and late response rejection. Two new keyboard-policy tests protect editing, media and nested dialogs. These are not browser network-failure injection tests.
- TypeScript (`tsc --noEmit --incremental false`) passed; ESLint zero errors/five pre-existing warnings; `git diff --check` passed. Independent final integration review reran 50 targeted tests and found no concrete regression.
- Current source was served on **127.0.0.1:3001**; the pre-existing 3000 server was serving an older build. Forge selectors measured **32px before / 44px after**. Creator World chips and Activity filters/Mark all seen measured **44px** after repair.
- Archive at **320×568**: opening Ghosts 001 focuses Close; 14 successive Tabs remained inside; browsing to 002 then closing returned to the original 001 tile. Full-size Escape returned to details, nested feedback Escape returned to its trigger without closing the artwork. Dialog filled the viewport with no document overflow.
- Creator profile at **1280×720**: 18 World chips all measured at least 44px; Shift+Tab stayed inside the viewer; browsing then closing restored `Open (36) Ghosts 001` rather than the last-viewed tile.
- Existing signed-in Saved at desktop: local search restricted the viewer to one result; ArrowRight did not escape that result; a comment field retained ArrowRight; Close restored the filtered tile. No existing save was removed for testing.
- Forge measured Visual DNA locally and displayed Copy prompt at **44px**. No provider/generation call or publishing was performed. Forge had no document overflow at **390px/320px**; Activity had no overflow at 390px.
- Existing Sakura test conversation loaded at **390×844**. Attachment menu offered Photo or video / Artwork from your worlds. Its native input had no rendered box. Keyboard progression from Add attachment went directly to Record voice note, then the message field. No message was sent or edited and the microphone was not activated; normal foreground read acknowledgements may occur when opening an existing conversation.
- Browser viewport override was reset after checks. A local development hydration warning appeared when the existing welcome tour made the Archive inert during hydration; no production regression was established from that warning.

### Release boundary and remaining checks

**Local review only; not pushed or deployed, and no new iCloud release backup is claimed.** The prior Ghosts release backup remains unchanged. The normal build first failed downloading the existing Geist fonts. A permission-escalated retry reached compilation but Turbopack's PostCSS worker was denied binding a local port (`Operation not permitted`). Production build completion needs that OS permission resolved; no alternate build or permission bypass was attempted.

Still untested: real-browser forced history failure/retry, physical phone keyboard/safe areas, screen reader and enlarged-text interaction; Saved unsave-to-heading focus; full signed-out auth-tab geometry; two-client reconnect/catch-up and expired secure media links. The existing checks above are not a claim that every app flow or device works perfectly. No new production QA issue was closed based only on local source changes.

## October 2 — approved publication

The owner approved publishing the reviewed repairs to both maintained production hosts, pushing GitHub and creating a new iCloud-folder recovery checkpoint. All 549 tests, TypeScript and lint (zero errors/five pre-existing warnings) passed again. The local Turbopack worker remains blocked by an OS port-binding restriction, including the permission-requested retry. No local permission workaround or alternate compiler was used. The approved release uses Vercel's normal remote production build, with domain promotion withheld until each build is READY. Deployment IDs, live checks and backup results will be recorded after verification.
