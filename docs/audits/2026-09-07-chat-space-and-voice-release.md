# Chat space and voice review — September 7, 2026

## Layout and controls

The owner explicitly approved production publication, activating private voice delivery, an icon-only bottom dock, and enough room for direct/group conversations. Other application repositories remain untouched.

- Mobile resolved conversations remove the app brand row, global dock and its reserve; a contextual Back action remains. The dock is retained in the inbox and browsing pages, now 54px tall with four 44px named icon targets and a shared 74px default clearance (including its bottom offset). At 320px, the dock is 296px wide with four 68.5×44px targets, and no document overflow.
- Real authenticated conversation measurements: 320×568 has header64/history441/composer63; 390×844 has header64/history717/composer63. The latter retains the previous follow-up's 198.5px/38% gain over the original cramped layout. No messages were sent or disclosed to measure this.
- Desktop no longer caps the workspace at1280px or the history/composer at768px. At1024×768 the inbox is280px and conversation744px wide (previously634px); at1440×900 they are360px and1080px (previously890px conversation within a centered1280px workspace). Individual bubbles remain capped at42rem for readability. Document overflow was0.
- The actual conversation component rendered with a temporary32px-root fixture at320×568 reflows its input to272×90px above44×44px attachment/mic/send controls. No horizontal overflow; the enlarged header225px and composer183px leave160px history. This is a200% text stress test, not a physical-phone keyboard test. The temporary fixture was removed.
- Group creation is already implemented. The deployed database exposes all11 expected group RPCs with matching signatures: creation, invite listing/response/cancel, details, invitations, roles, removal, mute, report and leave. Its creation function creates invitations, not automatic memberships. The UI asks for two invitees plus the creator. Existing group/member/message RLS is enabled; no real invitations were sent during review.
- New-group dialog: one scrollable88dvh region,44px controls and a sticky creation footer. At390×844, dialog358×516px and Create44px tall; at844×390, dialog512×343.2px with514px scroll content and Create at y305.6…349.6, inside the viewport. No horizontal overflow in either state.
- Inbox loading centers the whole World Aperture/status in the viewport. Conversation loading now uses the dedicated panel variant; the prior inline minimum-height conflict placed its status246.5px above center. Direct component measurements at320,390,844 and1280px widths showed zero center offsets after repair. See the loading-screen concept for the enlarged/short-panel safe-scroll exception.

Physical iOS/Android keyboards, home-indicator safe areas, OS text scaling and a multi-account group exchange still require device verification. Inner browser dimensions are measured; surrounding desktop-preview chrome is not part of NODEINE.

## Private voice activation evidence

The initial live capability probe returnedPGRST202/404; the RPC, voice column and private bucket were absent. Existing configured Supabase CLI authentication worked; no new credentials or paid provider was acquired. Metadata-only inspection covered involved table constraints, all storage policies, RLS/grants, and reached triggers, including notification and storage-bucket triggers. No external effects were found in those paths.

The first rollback-only rehearsal caught a real PostgreSQL parser error in the voice trigger's unparenthesized CASE expression. The source and rehearsal were corrected to `or (case … end)`. A new-session read confirmed the failed attempt left no voice RPC/column/bucket or synthetic users/profiles/conversations. Runtime results and activation confirmation will be appended after the corrected rehearsal.

The file/recorder/server/storage cap is now4MiB; encoded multipart fits Vercel's4.5MB limit. The previous5MiB cap could fail before reaching the application. Local format/cap/lifecycle/uncertain-delivery tests cover the application boundary; they do not prove device codecs or live physical Storage behavior.

The next rehearsal exposed an explicit default anonymous execution grant; the migration now revokes both PUBLIC and anon on this capability function only. The corrected rehearsal passed all42 planned assertions plus its coverage guard. A fresh session confirmed complete rollback and zero fixtures. The owner-authorized real migration then committed with short timeouts. Independent metadata verification found: capability and duration column present, private audio-only bucket public=false/limit4194304, anonymous execute=false/authenticated execute=true, three voice policies and an enabled validation trigger; synthetic user count0.

Unauthenticated local HTTP checks: POST returns401; GET with a valid synthetic conversation identifier returns401; malformed/missing GET identifiers return400 before authentication. These are non-mutating denial checks. SQL identity simulation does not prove JWT verification, physical Storage upload/delete, signed URL playback, simultaneous rate limits or device codecs. The Supabase backup listing reported no listed backups and PITR disabled; application backups are not live-chat-data backups.

## Conversation scroll preservation

Final combined checks:186 automated tests passed; full non-incremental TypeScript and optimized webpack production build passed. ESLint reports0errors and the same5pre-existing warnings (four admin image-optimization warnings and one unused catch binding). An independent bounded standards/spec review found no actionable regressions across the changed layout, group settings, dock, loaders and scrolling. Temporary review routes are absent from the final build.

After activation, the actual signed-in local conversation was refreshed and its voice dialog opened without pressing Record. The pending-delivery warning was absent, and **Record voice note** was enabled. This confirms the authenticated capability integration, not an actual phone recording/upload/playback.

This section records the bounded history-scroll change and coordinated local browser review. It does not establish production deployment, private-delivery activation, or physical-phone keyboard behavior; the wider layout and voice findings are recorded separately below.

### Source finding and repair

The previous `syncMessageViewport` called `scrollIntoView` for every changed newest-message ID. A source-level reproduction supplied a reader at scrollTop 0 in a 2400px history with a 440px visible region; an incoming row still requested a jump to the end. The old tests covered initial mounting and older-history prepending, but not arrivals while reading.

The repaired helper scrolls only its supplied history container through `scrollTo`. Initial history and the viewer's own sends reach the newest row. Other participants' arrivals preserve the reading position unless the viewer was already following within 80 CSS pixels of the bottom. Batched arrivals accumulate once in a transient new-message count; edits and a changed history window do not fabricate arrivals. The existing older-history height/offset anchor is retained. This local affordance does not change database read receipts or delivery behavior.

`MessagesView` tracks scrolling in its existing history region and presents a compact, polite new-message status with a **Jump to latest** button. The button scrolls the history and moves keyboard focus to the named **Conversation messages** region with `preventScroll`. Counts clear on reaching the bottom, jumping, and conversation reset. No viewport/document scrolling API, forced delay, service call, new package, or unrelated layout change was added by this repair.

### Measured local browser results

The main review used a clearly labeled temporary `/message-scroll-review-local` simulation at **390×844**. It imported the actual production helper and matched the production history and sticky-affordance markup. Its rows were synthetic; no real conversation was read or sent.

| Check | Observed result |
| --- | --- |
| Read older content, then append an incoming row | History scrollTop stayed **200px**; clientHeight was **650px**, while scrollHeight changed from **3044px to 3184px**. |
| New-message affordance | The button was fully visible at y=**739…783px**, with a **44px** height. |
| Keyboard activation | Enter removed the button, focused **Conversation messages**, and reached the computed history bottom. A development refresh had occurred before this phase; the measured final scrollTop/bottom was **3342px**, so these later absolute sizes are not a fixed-row comparison with the first check. |
| Viewer sends while reading older content | History scrollTop equaled its computed bottom, **3426px**. |
| Prepend an older row | scrollHeight changed **4076→4184px** and scrollTop changed **200→308px**: the exact **108px** added-height offset was preserved. |
| Enclosing page | Document scroll position remained **0** during the measured incoming, own-send, and prepend checks. |

The temporary simulation was removed after the measurements, before the final build. It contained no user data.

### Automated checks and limits

Twelve behavior tests exercise the production helper: loading/missing-container marker preservation, initial scrolling, reading-position preservation, batched group arrivals and edits, following near the bottom, own sends, prepend offsets, the explicit jump action, reduced-motion scroll behavior, empty history, and changed-window handling. Tests were added before the helper repair and observed failing, then passed after it. Scoped ESLint, full no-emit TypeScript, and `git diff --check` passed for the resulting source at this checkpoint.

These tests and the synthetic browser loop do not establish live group delivery, physical iOS/Android keyboard fit, nonzero safe areas, browser-bar resizing, media-load resizing, or OS-level reduced-motion behavior. A narrow embedded desktop browser proves only its reported inner viewport and the app's layout within it; its surrounding Codex chrome is not app-owned space. Separately, the source audit identified the app's former 1280px workspace cap, fixed 390px desktop inbox rail, 768px inner content caps, and a 40px composer shortfall at a 320px viewport with a 32px root font. Those layout concerns belong to the coordinated layout repair and must not be conflated with this scroll verification.
