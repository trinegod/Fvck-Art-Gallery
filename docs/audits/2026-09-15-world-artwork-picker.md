# World artwork picker — September 15, 2026

## Goal and reproduced failure

Let a chat participant browse every artwork in a world, select one comfortably and share it deliberately without colliding with the composer or navigation. The owner's recording showed Gundam Wing (27), but only two cards from that series were visible and their Share controls were clipped. The browser reproduction found all 412 catalog cards, including all 27 Gundam cards, already loaded: the dialog clipped an unbounded inner gallery with no scrollable ancestor. This was a layout/selection bug, not a missing artwork import.

## Decision and implementation

Three independent agents reviewed responsive interaction alternatives, catalog completeness, and delivery behavior. A viewport-sized modal was chosen over enlarging the old popup or navigating to a separate page. It preserves conversation context while allocating most of the screen to browsing.

- Two columns on phones, three on desktop; visible Scroll to explore / End of collection hint and complete world counts.
- A whole tile selects an artwork. A separate footer shows the selection and offers the sole Share artwork action. Tapping a tile does not send.
- The modal has explicit height, bounded flex children, contained scrolling and bottom safe-area clearance. At small available heights or enlarged text, the filters join the scroll region, with a sticky Close header and an independent footer.
- Search opens only on request. Visual-viewport resize/offset handling accommodates keyboard changes; native world selection remains native.
- Catalog loading uses stable ordered pages, validates complete responses and removes repeated IDs only. Distinct close-ups remain separate. Changing world/search resets selection and scroll.
- Delivery is confirmed against the returned row's sender, conversation, artwork, type and metadata. A synchronous lock blocks repeated submits. Known failed inserts allow retry; ambiguous results require checking the conversation before sending again. Existing text drafts are untouched. No database migration or new dependency is needed.

## Observed checks

- Automated suite: 495 tests passed, including 27 new pagination/filtering and artwork-delivery tests. Cases include 1,001+ entries, inclusive page boundaries, all 27 Gundam entries after other worlds, repeated IDs, distinct close-ups, failed/incomplete responses, and confirmed versus uncertain delivery. TypeScript passed; full lint has zero errors and five pre-existing warnings.
- Signed-in application, 582 × 922 browser: selected Gundam Wing, used keyboard End to reach its last row (scrollTop 4,584; clientHeight 672; scrollHeight 5,256), selected Gundam Wing 027, and sent exactly one artwork message to Princess Sakura (Test). The chat showed the correct card, original-artwork link and Sent state. This does not claim receiver reading.
- A temporary unsent test text survived that share unchanged; only that temporary draft was subsequently cleared. No existing messages were edited or deleted.
- Empty search showed a clear explanation and disabled Share. Clear search restored all 412 cards. Close and Escape returned focus to Add attachment. Background document scroll remained at zero while the gallery scrolled.
- Real component rendered in same-origin development-only viewport fixtures: 320 × 568, 390 × 664, 390 × 320, 700 × 320 and 1,200 × 800; 320 × 568 also checked at 200% text. No horizontal overflow. All footer actions remained within the modal bounds. The temporary fixture routes were removed before release.
- At 320 × 568, the gallery measured 319px high and the footer 73px; Share retained a 44px target. At 390 × 664, the gallery measured 415px. At 1,200 × 800, the modal measured 840 × 752 with a 527px gallery.
- At 200% text, the browser region reflowed to 359px with scrollable filters and a 175px footer; the Share action remained visible at 62px high. At 390 × 320, the browser retained 245px and the footer 61px. Final independent CSS/interaction review found no remaining release-blocking issue.
- Screenshot inspection confirmed consistent cyan selection/control treatment, graphite surfaces, spacing and readable tile labels. No new art was generated or imported in this repair.

## Remaining checks and release evidence

Physical iPhone/Android touch scrolling, OS-native world menus, real software-keyboard transitions, assistive-technology speech, and interrupted live-network delivery were not exercised on hardware. Responsive fixtures are CSS/layout evidence, not an iPhone Safari claim. Error/delivery edge cases have unit coverage, not a claim of exhaustive multi-client concurrency testing. Reopening after uncertain delivery is not server-side idempotency; the user must check the chat first.

The GitHub release checklist records actual hosted-build, production alias, commit and backup results after verification. iCloud-folder verification does not prove Apple's remote synchronization, and source backups do not cover private Supabase/Auth data or private audio storage.
