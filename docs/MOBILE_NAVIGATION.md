# Compact section navigation

## September 6, 2026 implementation

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
