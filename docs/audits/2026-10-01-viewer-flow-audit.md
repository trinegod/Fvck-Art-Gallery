# Viewer-flow audit after the (36) Ghosts release

Public production code: `2d82023e5ca055e008c65de455ed2d085d368bae`. Three independent audits plus root compact-screen checks; signed-out session, not a claim of complete authenticated/device coverage.

## Confirmed priorities (repaired in the October 2 release)

- [x] **P2: contain and restore focus in legacy artwork pop-ups.** The original audit found Tab reaching obscured thumbnails and Close returning to BODY. Archive, creator gallery and Saved now share managed focus containment and original-opener restoration; live creator-viewer behavior verified after release.
- [x] **P2: distinguish failed history from empty chat.** The original callback fixture reproduced a failed fetch falling through to “beginning of this conversation.” A separate retry state now preserves drafts and loaded messages, verified through the actual effect/JSX fixtures. Forced network failure in a real private conversation remains untested.
- [x] **P3: correct existing tap targets.** Creator World chips were 34px and viewer Close was 40px. These and the other identified controls now meet the 44px baseline; live creator-chip geometry verified.
- [x] **P3: remove invisible attachment-input keyboard stop.** The native attachment input is hidden and the existing labeled menu remains. Real local keyboard traversal confirmed Add attachment → Record voice note → message field; assistive-technology testing remains separate.

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

The owner subsequently authorized fixing the findings without adding clutter. Three agents split artwork viewers, chat recovery and independent regression review; root handled remaining tap targets and browser verification. This section records the local repair evidence before the October 2 publication below. No database changes, new packages, menus or model services were added.

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

**Status at the end of the October 1 repair turn: local review only, not pushed/deployed, with no new iCloud backup claimed.** This is superseded by the October 2 release record below. The normal local build first failed downloading Geist fonts. A permission-escalated retry reached compilation but Turbopack's PostCSS worker was denied binding a local port (`Operation not permitted`); no alternate compiler or permission bypass was attempted.

Still untested: real-browser forced history failure/retry, physical phone keyboard/safe areas, screen reader and enlarged-text interaction; Saved unsave-to-heading focus; full signed-out auth-tab geometry; two-client reconnect/catch-up and expired secure media links. The existing checks above are not a claim that every app flow or device works perfectly. No new production QA issue was closed based only on local source changes.

## October 2 — approved publication

The owner approved publishing the reviewed repairs to both maintained production hosts, pushing GitHub and creating a new iCloud-folder recovery checkpoint. All 549 tests, TypeScript and lint (zero errors/five pre-existing warnings) passed again. The local Turbopack worker remains blocked by an OS port-binding restriction, including the permission-requested retry. No local permission workaround or alternate compiler was used. The approved release uses Vercel's normal remote production build, with domain promotion withheld until each build is READY. Deployment IDs, live checks and backup results will be recorded after verification.

- Application commit: `ee849997093ff33c9fc35b25ddb6438abc78ec07`, pushed atomically to `main` and `codex/slim-navigation-audit-repairs`. Later documentation-only commit(s) do not change the deployed application.
- Both standard Next.js/Turbopack cloud builds completed successfully, including TypeScript and route generation, before promotion. No security settings, paid services or database records were changed.
- NODEINE: `dpl_FfNVziPLHEcbj5iUWcqmWZXdaMXN`, https://nodeine-ilrmulwdg-satur-n.vercel.app. Promotion completed; inspecting https://nodeine.vercel.app resolves to that READY deployment.
- Original gallery: `dpl_B1ofiZEW3amBvFdGCLKnyTe59XEV`, https://fvck-art-gallery-3t2ae3ffz-satur-n.vercel.app. Promotion completed; inspecting https://fvck-art-gallery.vercel.app resolves to that READY deployment.
- Live NODEINE creator profile at desktop: all 18 World chips are at least 44px. Opening artwork focuses Close, Tab remains inside, and browsing before closing restores the original artwork tile. On the live original gallery at 320×568, both sign-in/account tabs measure 44px with no document overflow. This confirms the new UI, not merely successful HTTP responses.
- Recovery destination: iCloud Drive / Steven Project Backups / Releases / NODEINE / `2026-10-02-interaction-polish`. The package is created after this final documentation checkpoint; its `verification.json` records the exact restored SHA, and `checksums.sha256` plus the release-tracker comment record the actual post-copy result.
- Recovery retains the full base `2026-09-15-a911926-moon-and-chat-dates` (`a9119260181ee63b9beb0e7fae31f65ff7503105`). The new flattened increment includes all source changes since that base, normal Git history, and the verified Ghosts originals/public snapshot. Existing releases are preserved. This is not a full Supabase/auth/private-storage backup or proof of Apple's remote iCloud synchronization.

The QA issue stays open for the explicit physical-device, forced-network-failure, screen-reader and reconnect checks; publication does not erase those verification boundaries.
