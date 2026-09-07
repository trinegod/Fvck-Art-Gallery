# Compact section navigation

## September 7 owner-approved icon-only update

The owner requested more content space and explicitly approved removing visible dock labels. The mobile dock now keeps the same four ordinary links—Feed `/feed`, Explore `/explore`, Create `/create`, You `/you`—as icons in one compact row. Each name remains in `sr-only` text, with a native hover title; the title is supplementary, not a required touch gesture. The existing selected pill/underline, route-derived `aria-current`, cyan keyboard focus, and You unread dot/count remain. Desktop navigation keeps its visible labels. A resolved mobile conversation still has no global dock.

Source-derived geometry targets at a 16px root size (browser measurements are a separate release check):

| Measurement | Previous labeled dock | Icon-only dock |
| --- | --- | --- |
| Outer height, including border | 70px | 54px |
| Link target height | 56px | 44px |
| Internal padding, per side | 6px | 4px |
| Content reserve, no bottom inset | 96px | 74px |
| Content reserve, 34px bottom inset | 130px | 96px |

The dock retains 12px viewport gutters, four equal columns, 4px gaps, and a bottom offset of `max(12px, safe-area-inset-bottom)`. At 320px and 390px widths the expected link widths are 68.5px and 86px respectively. This saves 16px of dock height and 22px of reserved scrolling space without reducing targets below 44px. The reserve scales with rem-based controls: at a 24px root size with no bottom inset, the expected dock is 80px high and the reserve is 110px.

`--nodeine-mobile-nav-clearance` in `app/globals.css` is the shared reserve: `calc(3.75rem + 2px + max(.75rem, env(safe-area-inset-bottom)))`. It includes link height, dock padding and border, an 8px content gap at the default root size, and the actual bottom offset. Mobile `main:has(.nodeine-mobile-navigation)` padding and document scroll padding use this token. Existing page-level `7rem` utility fallbacks are superseded by that unlayered shared rule while the dock is present; desktop padding is untouched.

The ready inbox owns its internal scrolling and overrides outer main padding with zero. Its inbox/unresolved-conversation pane reserves therefore must use this same token explicitly; the focused conversation branch keeps safe-area-only padding. These are the only separately owned dock-reserve callers found in the source audit. Do not reserve another dock-sized gap inside an active mobile conversation.

Verification of this bounded navigation change:

- Rendered production component checks cover all four real Next links/icons, screen-reader names with no visible label text, native titles, exact/deep-route selection, positive/zero unread counts, and the `hidden` prop. Only pathname and unread data providers are stubbed; these checks do not verify realtime delivery.
- CSS contract checks cover 44px target classes, mobile-only shared clearance, safe-area offset, visible focus, and the non-color selected marker. Navigation and messages-shell tests: 16 passed. Targeted component/test ESLint, whole-project nonincremental TypeScript check, and `git diff --check`: passed.
- Read-only self-review found no route, history, account-count, keyboard-role, desktop-label, or focused-chat behavior changes in this patch. No new dependency, fetch, dialog, animation, or persistence is introduced.
- Browser release checks remain: actual 320px/390px/768px layout and last-content clearance, 24px root-text reflow, 1024px desktop switch, Tab/Shift+Tab/Enter and browser Back, focused-conversation absence/inbox restoration, and reduced motion. Physical touch, VoiceOver, native keyboard, nonzero live notifications, and device safe-area behavior are not established by static rendering tests. Record observed rollout results in the release audit; do not infer deployment from this implementation note.

## September 7 focused-chat review update

An authenticated, resolved mobile conversation now hides the global brand row and bottom dock, removes the dock reserve (92px in the earlier chat baseline), and retains the bottom safe area and an explicit Back to inbox action. The inbox and stale/unavailable/signed-out states retain global navigation. Desktop keeps its header and split pane. One labeled attachment menu widens the composer without removing photo/video or World artwork sharing. The existing World Aperture inbox loading status now centers in the viewport, not a partial-height panel.

At 390×844, the measured message region grows from 518.5px to 717px (about 38%); this is geometry, not a usability or performance metric. See the [chat-space audit](audits/2026-09-07-mobile-chat-space.md) for widths, keyboard checks, audit fixes, and physical-phone limits. This is review-branch work, not production promotion or audio/database activation.

## September 6, 2026 labeled implementation (historical)

The new local version replaces the two-level dock described below with one 70px row of ordinary links: **Feed `/feed`**, **Explore `/explore`**, **Create `/create`**, **You `/you`**. The former row measured 122px at the same phone sizes; this saves 52px, approximately 43%. This is a geometry comparison, not a claimed usability metric.

- Explore contains artwork search, the collection archive, Threads, and credited previews of public Worlds.
- Create contains Forge, Publish, New Thread, and an owner-only Your work list for private Thread drafts. Resume opens the existing editor. Forge projects/revisions are not persisted here.
- You contains Saved, Inbox, Activity, and the current viewer's profile/access link. Visiting another artist does not change this target.
- All four primary controls remain visible; no rail, second row, drawer, arrow, or swipe-only action remains. Selecting a section now navigates, so this must not be described as preserving unsaved forms or automatically saving drafts.
- Links use normal Tab/Shift+Tab/Enter interaction, visible focus, and route-derived `aria-current`. They are not tabs. Direct URLs and history select the same section; Thread editing selects Create.
- 12px outer gutters, 6px internal padding, and 56px-tall controls retain generous touch targets. The shared CSS reserves 6rem plus the bottom safe-area inset for scrolling content. Dialogs remain above the dock.
- At 1024px and above, the dock is hidden and the shared four-link desktop navigation appears in page headers or the feed sidebar. Contextual actions such as Back to feed remain available.
- Account-scoped asynchronous guards invalidate old private results after logout, account switch, or unmount. Supabase RLS remains the authorization boundary; client guards are not a substitute.

Implementation: `lib/mobile-navigation.ts`, mobile/desktop navigation components, `app/explore`, `app/create`, `app/you`, shared CSS, and route-contract tests. See [repair verification](audits/2026-09-06-repair-verification.md) for checks and limitations. This update is not deployed until the release gate is explicitly completed.

## Previous September 4 release (historical)

Implemented September 4, 2026. Replaces the More bottom sheet with an inline, swipeable dock across the app's mobile surfaces, including Creator Studio access and publishing.

The visual pass uses a graphite floating surface, a subtle top highlight, inset icon controls, and distinct but restrained selected-section accents. The persistent Feed anchor remains cyan. See `DESIGN.md` for the comparative design references and originality boundary.

## Contract

Feed remains fixed. Explore contains Discover, Archive, and Threads; Create contains Forge, Publish, and New Thread; You contains Saved, Inbox, Activity, and the viewer's Profile. Three equally sized section tabs span the destination rail, centered without a next-section arrow. The labels work without swiping. There is no drawer, modal focus trap, or body scroll lock.

Choosing a section does not navigate or discard form state. Choosing a destination uses an existing route and its existing access checks. Direct routes and browser history select the corresponding section. Resizing aligns the selected panel. Only the active panel participates in keyboard navigation; section selection supports arrow keys and Home/End. Unread activity remains visible on You, with its count on Activity.

Profile resolution is driven by the current auth session. Viewing another artist does not change the dock's Profile destination. Signed-out users can still browse; creator actions lead to the existing access screen. No new account, database, provider, or storage mutation is introduced.

The shared CSS reserves bottom clearance only for mobile main elements containing the dock. Native CSS scroll snap is used without intercepting touch gestures, and button changes do not animate. Desktop layouts are unchanged.

## Implementation

- `lib/mobile-navigation.ts`: destination/group contract and boundary-aware route selection.
- `app/components/mobile-app-navigation.tsx`: viewer profile resolution, accessible section selectors, Feed anchor, scroll rail, and notifications.
- `app/globals.css`: snapping and shared safe-area clearance.
- `tests/mobile-navigation.test.ts`: all destinations, nested routes, prefix collisions, and signed-out fallback.

## Scope boundary

This release makes Forge easier to find. It does not add image generation, semantic reference analysis, revision storage, new billing, or a new onboarding flow. Those priorities are preserved in `PRODUCT_ROADMAP.md` and `docs/FORGE_CAPABILITY_MATRIX.md`.

Forge explicitly labels in-app generation as not connected yet. Prompt export explains that the user must attach the original artwork in their external generator; copying text does not transfer a reference image.

## Validation

Automated suite, type-check, lint, production build, and browser verification are required before delivery. Browser checks should include 320px/390px widths, centered section tabs, keyboard focus, native horizontal scroll, route entry/Back, and Creator Studio return navigation. A physical-device touch/VoiceOver check remains valuable after browser emulation.

September 4 verification:

- `npm test`: 39 tests passed, including three new navigation-contract tests.
- `npx tsc --noEmit`: passed.
- `npm run lint`: no errors; four existing admin `<img>` optimization warnings remain.
- `npx next build --webpack`: production build passed.
- Browser: 320px and 390px phone layouts have no page-level horizontal overflow; visible controls meet 44px minimum targets. Native horizontal scrolling switches Create to You; section buttons and keyboard Home/Tab work. Forge, Publish, and New Thread routes open in Create; browser Back returns to Forge in Create. At 768px the dock realigns; at 1280px it is hidden. No browser warnings/errors were captured during these checks.
- Not claimed as browser-tested: physical touchscreen/VoiceOver, reduced-motion OS emulation, a fresh signed-out session, or nonzero realtime notification delivery. Those paths preserve the existing access/count mechanisms and use nonanimated section changes.

Same-day centering follow-up: removed the next-section arrow. At 320px and 390px, the tab row and destination rail share the same left edge and width, tabs have equal widths and 44px heights, and the page has no horizontal overflow. Native scrolling still switches Create to You; keyboard ArrowRight and Tab reach You and then Saved. The 39-test suite, type-check, lint (same four warnings), and webpack production build passed again.
