# Mobile chat space: audit and review implementation

## Implemented review follow-up

The implementation below was compared with pre-change commit `1d330579339e8d0c88a0d5c59112782c77466159` on `codex/slim-navigation-audit-repairs`. This is a review candidate; stable production promotion and backend activation remain separate approvals. The original source-only audit is preserved afterward as historical reasoning.

### What changed

- `getMessagesShellMode` derives focused presentation from ready auth, a viewer, and the selected conversation actually resolving in the inbox. It does not create a second navigation state or reset drafts on resize.
- A focused mobile chat hides the redundant brand row and dock together with the dock reserve, retaining one bottom safe-area inset. Inbox, stale-ID, signed-out, and unavailable states keep global navigation. A stale-ID placeholder also has Back to inbox.
- A 64px normal mobile contextual header and 63px normal composer leave more space to messages. The header can wrap for larger text. Back, attachment, microphone, and Send targets are at least 44px. Desktop retains its 390px inbox column and global header.
- One attachment menu groups photo/video and World artwork sharing. The microphone is still directly accessible; the mobile input uses 16px type. Existing send, upload, sharing, authorization, and destructive-action behavior is untouched.
- The existing World Aperture/status group uses viewport centering for inbox pending work and dynamic-viewport centering for standalone fallbacks. Conversation-only loading stays inline.

### Observed browser evidence

Authenticated local browser checks used an existing conversation without publishing new messages, selecting upload files, recording audio, editing/deleting messages, or disclosing conversation contents in these notes. Measurements use CSS pixels and zero emulated safe-area inset.

| Viewport | Header | Message region | Composer | Result |
| --- | ---: | ---: | ---: | --- |
| 390×844 before | 87px, plus 69px brand row | 518.5px | 77.5px | 92px dock reserve; input 160px wide |
| 390×844 after | 64px | 717px | 63px | No dock/reserve; input 210px wide |
| 320×568 after | 64px | 441px | 63px | Pane exactly 320px wide; input 140px; Send inside viewport |
| 844×390 | 64px | 263px | 63px | Short landscape; conversation remains usable |
| 1023×768 | 64px | 641px | 63px | Focused mobile treatment |
| 1024×768 | 76px, plus 85px desktop header | 536px | 71px | 390px inbox column retained |
| 1280×900 | 76px, plus 85px desktop header | 668px | 71px | Desktop split view retained |

The 390px message-region gain is **198.5px, approximately 38%**; this is measured layout space, not a claimed improvement in user task performance.

- Back to inbox restores brand/dock and hides the mobile conversation pane. Direct conversation reload resolves to the focused shell. A syntactically valid but absent conversation ID retains dock and an explicit Back action, without exposing a composer.
- Add attachment opens two labeled menu items, at least 44px high. Mouse selection opens the artwork dialog. Keyboard ArrowDown opens the menu, ArrowDown/Enter opens artwork selection, and Escape closes the dialog and returns focus to Add attachment. Escape from the menu also returns focus to its trigger. No artwork was shared.
- A temporary development-only fixture rendered the actual loading component at 320×568, 390×844, and 844×390. Viewport-mode mark/status centers were exactly the viewport midpoint; standalone mode differed by less than 0.004 CSS pixels horizontally. There is one polite status and no pointer-intercepting layer. The fixture was removed before the build/commit and is not deployed.
- The same temporary fixture rendered actual MessagesView at 320×568 with a 24px root font. The header wrapped; header and composer actions remained within x=18…302, with 66px targets and a 306px message region. This is a larger-font check, not a physical-phone accessibility certification.

### Audit repairs and automated coverage

Independent audits checked standards/accessibility and request/privacy regressions. Findings were repaired: mobile header wrapping for larger text, and a reduced-motion override strong enough to beat shared popup state animations. Browser measurement also caught a 337px intrinsic grid overflowing the clipped 320px pane; an explicit one-column minmax grid and shrinkable pane now keep it at 320px.

New tests cover resolved-state presentation, account/pending/error transitions, actual call-site bindings, wrapping/motion contracts, rendered loading semantics, original SVG usage, route fallback, and CSS centering. Pure state/source assertions do not substitute for mounted interaction tests. The generated reduced-motion CSS contains `animation: none !important`; OS-level reduced-motion emulation is not claimed.

Final checks: **156 automated tests passed**; TypeScript passed; ESLint had no errors and five pre-existing warnings (four admin image-optimization notices and one unused catch binding in message actions); the webpack production build passed. Both independent reviewers rechecked their fixes and reported no remaining blockers in scope. The temporary fixture is absent from the production route table.

### Remaining checks and gates

Real iOS/Android keyboard fit, browser-bar changes, nonzero safe areas, touch/VoiceOver, full zoom, native file-picker cancellation, live group creation/leave, account-switch browser flows, and pending/error real-device delivery still need review. Do not interpret narrowed viewport checks as keyboard-device coverage. Voice/private delivery and edit/remove/clear SQL remain unactivated. No paid provider, database migration, production deployment, or other-project code is part of this layout change.

## Original source-only audit (before implementation)

September 7, 2026. Owner direction: give an open mobile conversation substantially more message space; remove the global Feed/Explore/Create/You dock inside that conversation. Icon-only global navigation elsewhere remains a possibility, not approval to redesign it.

Scope: current `/messages` source, shared navigation, design contract, and UX playbook. No browser session, private conversation, production data, or device measurement was accessed. No application code was changed. Pixel values below are source-derived estimates at a 16px root size, normal text scaling, and no wrapping unless stated otherwise.

## Recommendation

Make a valid, open mobile conversation a focused shell with one contextual header, the growing message region, and the composer. Keep the global brand header and labeled dock on the inbox. Keep the current desktop header/navigation and split-pane layout.

The first two changes should be coupled: remove the active conversation's dock **and its reserved padding**, then remove the redundant mobile brand-header row. Together these can recover approximately **161 CSS pixels** of vertical message viewport, while retaining the bottom safe area. Hiding the dock alone leaves a 92px reserve behind and yields essentially no message-height gain.

This follows the [UX playbook's task hierarchy and explicit exit principles](</Users/stevenadkins/Documents/NODEINE APP/docs/design/ux-review-playbook.md:9>), while applying the owner's new contextual exception to the earlier [four-destination navigation contract](</Users/stevenadkins/Documents/NODEINE APP/DESIGN.md:20>).

## Height budget and exact contributors

The ready state is a `h-dvh`, column-flex, overflow-hidden main. Its middle grid and message scroller use `min-h-0` and `flex-1`, so nonshrinking chrome directly subtracts from the message region. This is not primarily a message-bubble font-size problem. [Page shell](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:1439>), [Middle grid](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:1491>), [Message scroller](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:1751>).

| Contributor | Source evidence | Estimated height/cost at default root size |
| --- | --- | --- |
| Global brand header | `shrink-0`, `py-5`, bottom border, `text-lg` NODEINE link; desktop navigation is hidden below `lg`. [Header](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:1445>), [Desktop nav](</Users/stevenadkins/Documents/NODEINE APP/app/components/desktop-app-navigation.tsx:12>) | About **69px** on mobile: 40px padding + 28px line box + 1px border. It is rendered even during an open conversation. |
| Conversation header | `min-h-[76px]`, `shrink-0`, `flex-wrap`, `py-3`; direct-chat name link has `min-h-11`, followed by a username line. [Header](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:1704>), [Name/metadata](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:1719>) | Group: normally **76px** minimum. Direct chat: approximately **87px**, because 44px name link + 2px margin + 16px metadata + 24px padding + 1px border exceeds the 76px minimum. Wrapping/text scaling can increase this. |
| Composer | Nonshrinking form, top border, `py-3`; one-row textarea has 24px leading, 20px vertical padding, and borders. Errors add a separate block. [Form](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:1917>), [Textarea](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:1970>), [Error](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:2006>) | Roughly **71–75px** in the normal state; textarea/label line-box behavior must be measured. Errors and larger text increase it. |
| Active-pane dock reserve | Conversation section always has `pb-[calc(5.75rem+env(safe-area-inset-bottom))]`, removed only at `lg`. [Reserve](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:1696>) | **92px + bottom safe-area inset**. This is the actual layout subtraction to reclaim when hiding the dock. |
| Fixed dock itself | `min-h-14` destination row, `p-1.5`, border; bottom offset is max(12px, safe-area inset). It is unconditionally called by MessagesView. [Dock geometry](</Users/stevenadkins/Documents/NODEINE APP/app/components/mobile-app-navigation.tsx:28>), [Call site](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:2292>) | About **70px** tall: 56 + 12 + 2. It is fixed, so **do not add this again** to the pane's 92px reserve when calculating total height loss. |
| Message-region inner padding | `py-5` on the scroller. [Scroller](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:1757>) | **40px** of inner top/bottom breathing room. This is not additional external chrome; reducing it affects content density, not the scroller's outer height. |

Tailwind's installed defaults establish the spacing unit, `lg` breakpoint, and relevant line heights. [Theme defaults](</Users/stevenadkins/Documents/NODEINE APP/node_modules/tailwindcss/theme.css:325>).

For an ordinary direct chat, a useful estimated budget is:

`message viewport ≈ dynamic viewport − 69 − 87 − composer height − (92 + bottom safe area)`.

The global stylesheet also assigns dock-aware main padding through `:has`, but ready MessagesView explicitly overrides its main padding to zero. **There is no evidence of double-counted main padding in the ready branch.** The fixed cost lives inside the panels. When no dock is rendered, the stylesheet's dock-dependent scroll padding also stops matching. [Global rules](</Users/stevenadkins/Documents/NODEINE APP/app/globals.css:186>), [Override](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:1440>).

## Route and state strategy

Do not make the shared navigation hide itself for every `/messages` pathname. Inbox and active chat share that pathname; the selected conversation is a query parameter and React state. The page initializes from `searchParams`, validates the UUID, and resolves the actual conversation from the inbox. [Page inputs](</Users/stevenadkins/Documents/NODEINE APP/app/messages/page.tsx:10>), [Selected ID](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:139>), [Resolved conversation](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:209>).

Recommended presentation boundary:

1. Own the decision in `MessagesView`, where auth/load state, selected ID, and the resolved conversation already exist. Treat the focused conversation shell as active only when auth is ready, the viewer exists, load state is ready, and `activeConversation` resolves. Do not hide escape navigation solely because a syntactically valid UUID is in the URL.
2. Reuse `MobileAppNavigation`'s existing `hidden` prop. It returns `null`, rather than leaving offscreen focusable links. The component is already mobile-only through `lg:hidden`; desktop app navigation is separate. [Existing seam](</Users/stevenadkins/Documents/NODEINE APP/app/components/mobile-app-navigation.tsx:18>).
3. Use that same focused-state decision to remove only the active mobile pane's 5.75rem dock allowance, replacing it with safe-area-only clearance. Leave inbox panel padding intact. Preserve `lg:pb-0` desktop behavior. Reserve the bottom inset once, either in the pane or composer, not both. [Inbox allowance](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:1492>), [Conversation allowance](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:1696>).
4. Hide the separate NODEINE brand-header row only below `lg` in that focused state. Keep the contextual conversation header mounted, including its explicit Back to inbox control. Do not remove the desktop brand/header by conditioning the entire element without a breakpoint fallback.
5. Preserve global navigation for signed-out, unavailable, unresolved, and inbox states. A newly created conversation ID is set before its inbox refresh finishes, so “ID present but conversation absent” can be temporary; do not immediately clear a valid new destination during that interval. [Creation ordering](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:1358>).

Important existing edge case: mobile pane visibility currently follows `activeConversationId`, while the contextual header/back button only exists when `activeConversation` resolves. A stale or inaccessible UUID can therefore show the generic conversation placeholder with the inbox hidden and no contextual Back button. **Do not hide the remaining global dock in that state.** An explicit Back to inbox action in that fallback, or a resolved-state-aware inbox fallback after loading, should be covered in the eventual layout change. [Pane/header split](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:1696>), [Fallback](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:2013>).

### Back and history must remain authoritative

Selecting a conversation updates React state and pushes `/messages?conversation=…`. The contextual Back button calls `closeConversation`, which clears selection and pushes `/messages`; `popstate` resynchronizes the ID. Group leave uses that same close function. Deriving chrome from existing state therefore covers these transitions without a second independent visibility store. [Selection/close](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:906>), [History synchronization](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:888>), [Group leave](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:1326>).

Keep the current history policy distinct from chrome removal: Back to inbox pushes an inbox entry rather than calling browser back. Also, the existing close/reset path clears the unsent draft. Do not call that reset merely because the viewport changes or the keyboard opens; that would turn a layout adjustment into data loss. Changing draft/history semantics would require its own deliberate decision. [Reset](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:870>).

## Compare the smaller layout options

| Option | Likely gain | Recommendation |
| --- | --- | --- |
| Remove active-chat dock and its reserve, keep safe-area inset | **92px** | First priority; the owner's explicit request. |
| Remove redundant mobile brand-header row | **69px**, about **161px combined** with the dock change | Recommended. Inbox and desktop retain brand/global navigation. |
| Keep brand header but reduce vertical padding from 20px to 8px per side | **24px** | Lower-impact fallback; still leaves two headers competing with messages. |
| Compact the contextual header to about 60–64px | Around **12–16px** for groups, **23–27px** for direct chats | Secondary pass after the main gain is reviewed. Combine name/metadata inside one 44px-minimum identity target rather than stacking a 44px link above metadata. Preserve back, appearance, and options. |
| Reduce composer vertical padding from 12px to 8px per side | Around **8px** | Optional; do not shrink controls or remove readable error feedback. |
| Reduce message-region top/bottom padding from 20px to 12px | **16px of inner content room**, not outer viewport height | Optional last refinement; keep artwork and message grouping comfortable. |
| Remove global dock labels elsewhere | **0px** if current 56px minimum row and reserved padding remain | Not the solution to this conversation-space problem; defer the broader navigation decision. |

Avoid reclaiming space by shrinking controls: the existing Back button is `size-10` (40px), while Send uses `icon-lg`, which this repository defines as `size-9` (36px), not 44px. A compact pass should bring these up to the project's 44px minimum. [Back](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:1705>), [Send](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:1992>), [Button sizes](</Users/stevenadkins/Documents/NODEINE APP/components/ui/button.tsx:28>), [Touch contract](</Users/stevenadkins/Documents/NODEINE APP/DESIGN.md:40>).

The composer is also horizontally crowded: image/video, Worlds, microphone, textarea, and Send share one row. A later single attachment menu containing image/video and Worlds can widen the input without removing either feature; keep the microphone explicit. That is primarily a width/typing improvement, not a significant vertical saving. [Composer controls](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:1933>).

If icon-only global navigation is later explored, retain visible labels until separately approved and tested. Removing `{item.label}` currently removes the primary link's ordinary text name while its icon is `aria-hidden`; provide an explicit accessible name if labels ever become visually hidden. Preserve current-section shape/focus, unread text, 44px targets, and all four destinations. [Dock semantics](</Users/stevenadkins/Documents/NODEINE APP/app/components/mobile-app-navigation.tsx:34>).

## Acceptance evidence required after implementation

No checks below were executed in this source-only audit.

- **State matrix:** mobile inbox retains labeled dock and brand header; valid direct/group chat hides both global rows and retains contextual Back; loading/signed-out/unavailable/stale-ID cases keep a reliable escape. Empty conversations are still active conversations and get the focused shell.
- **Navigation:** inbox → chat → Back to inbox restores dock/brand header immediately; browser Back/Forward and direct reload follow the same state. Exercise `/messages?with=…`, new conversation/group creation, leaving a group, sign-out/account switch, and an inaccessible conversation ID. Do not introduce draft resets on resize.
- **Measured geometry:** record actual header, scroller, composer, and bottom-inset bounds at 320×568, 390×844, short landscape, tablet, and both sides of the 1024px desktop breakpoint. Record the gained scroller height; do not present the 161px estimate as a measured result. Ensure no empty 5.75rem strip remains.
- **Keyboard/safe area:** real iOS Safari and Android checks with keyboard open/closed, browser bars expanded/collapsed, portrait/landscape, and notched/home-indicator layouts. Focused text and Send must stay visible; only message content should scroll. Current source uses `h-dvh` but has no dedicated `visualViewport` resizing handler in the messages view, so keyboard fit is not established by source inspection. [Viewport shell](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:1443>), [Root layout](</Users/stevenadkins/Documents/NODEINE APP/app/layout.tsx:24>).
- **Readability/accessibility:** 200% zoom, larger text, long names/URLs, IME composition, multiline drafts, keyboard Tab/Shift+Tab, visible focus, accessible control names, and at least 44px targets. The textarea currently uses `text-sm`; explicitly check mobile focus/zoom behavior rather than shrinking type to save space. [Textarea](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:1970>).
- **Real states:** sending/uploading, error wrapping, voice preview, appearance dialog, options dialog, missing media, and empty/loading message regions. Preserve opaque readable bubbles and modal focus return. No backend activation or real message send is needed merely to test layout; use authorized fixture states.
- **Scroll behavior:** newest message remains reachable, reading older history does not jump, and opening/closing keyboard or dialogs does not force an unexpected scroll. Existing viewport synchronization handles messages/loading, not a dedicated viewport-resize dependency. [Current effect](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:856>), [Anchor logic](</Users/stevenadkins/Documents/NODEINE APP/lib/message-viewport.ts:15>).
- **Desktop regression:** at `lg` and above preserve the 390px inbox column, active conversation, full desktop app links, existing max width, and zero dock allowance. [Desktop grid](</Users/stevenadkins/Documents/NODEINE APP/app/messages/messages-view.tsx:1491>).
- **Regression coverage:** add focused presentation-state tests and a rendered geometry/interaction check using fixtures. Existing [navigation tests](</Users/stevenadkins/Documents/NODEINE APP/tests/mobile-navigation.test.ts:40>) cover destination mapping, and [message viewport tests](</Users/stevenadkins/Documents/NODEINE APP/tests/message-viewport.test.ts:5>) cover scroll markers/anchors; neither proves the active mobile shell's available height or keyboard visibility.

Before any implementation, read the relevant installed Next.js guide as required by `AGENTS.md`. This audit intentionally stops at source evidence and a bounded recommendation; it does not claim the reported layout has been reproduced or fixed.
