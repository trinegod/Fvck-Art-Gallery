# Grouped mobile navigation

Implemented September 4, 2026. Replaces the More bottom sheet with an inline, swipeable dock across the app's mobile surfaces, including Creator Studio access and publishing.

## Contract

Feed remains fixed. Explore contains Discover, Archive, and Threads; Create contains Forge, Publish, and New Thread; You contains Saved, Inbox, Activity, and the viewer's Profile. The section labels and next-section arrow work without swiping. There is no drawer, modal focus trap, or body scroll lock.

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

## Validation

Automated suite, type-check, lint, production build, and browser verification are required before delivery. Browser checks should include 320px/390px widths, section tabs and arrow button, keyboard focus, native horizontal scroll, route entry/Back, and Creator Studio return navigation. A physical-device touch/VoiceOver check remains valuable after browser emulation.

September 4 verification:

- `npm test`: 39 tests passed, including three new navigation-contract tests.
- `npx tsc --noEmit`: passed.
- `npm run lint`: no errors; four existing admin `<img>` optimization warnings remain.
- `npx next build --webpack`: production build passed.
- Browser: 320px and 390px phone layouts have no page-level horizontal overflow; visible controls meet 44px minimum targets. Native horizontal scrolling switches Create to You; section buttons and keyboard Home/Tab work. Forge, Publish, and New Thread routes open in Create; browser Back returns to Forge in Create. At 768px the dock realigns; at 1280px it is hidden. No browser warnings/errors were captured during these checks.
- Not claimed as browser-tested: physical touchscreen/VoiceOver, reduced-motion OS emulation, a fresh signed-out session, or nonzero realtime notification delivery. Those paths preserve the existing access/count mechanisms and use nonanimated section changes.
