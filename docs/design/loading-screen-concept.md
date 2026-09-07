# NODEINE loading screen concept

Status: implemented as a reusable root fallback and component primitive on September 7, 2026. Existing route-specific skeletons remain more informative and should be retained where they already describe the incoming content.

## Intent

The **World Aperture** is a small, name-independent navigation mark: a quiet artwork frame holds a longitude/latitude world, a geometric portal aperture, and one orbiting point. At a glance it is familiar as a map, lens, or destination indicator; its composition is original to NODEINE and avoids borrowed logo silhouettes or third-party assets.

The symbol reads at 24px, is most comfortable at 32px inline and 64px as a route fallback, and relies on the existing graphite, white, and cyan semantic colors. `NODEINE` is an optional wordmark only; replacing it later does not require replacing the mark.

## Components

`app/components/world-loading-symbol.tsx`

- `size?: number` — square pixel size, default `48`.
- `className?: string`
- `title?: string` — only supply when the symbol needs its own image label. Otherwise it is decorative.

`app/components/world-loading-screen.tsx`

- `label?: string` — short present-tense description of actual pending work; default: `Opening the archive…`.
- `className?: string`
- `variant?: "centered" | "viewport" | "panel" | "inline"` — `centered` is a standalone route fallback with a 64px mark; `viewport` centers the 32px mark/status group in the current viewport while retaining a loaded shell; `panel` fills a positioned unresolved pane and centers its 32px mark/status group; `inline` keeps the original content-region treatment with a 12rem minimum height.
- `showWordmark?: boolean` — current name treatment; default `false` to keep embedded states compact.

The screen owns a single `role="status"` with polite, atomic updates. The SVG is decorative there, so assistive technology reads the work-specific label only once. It has no controls, modal treatment, timer, fake progress percentage, or completion claim.

## Usage rules

Use the centered treatment from a Next `loading.tsx` boundary when a segment has no meaningful shell to retain. The fallback occupies the dynamic viewport (`100dvh`, with a `100vh` fallback), with equal padding on opposing edges so the complete mark/status group is centered in both axes:

```tsx
import WorldLoadingScreen from "@/app/components/world-loading-screen";

export default function Loading() {
  return <WorldLoadingScreen label="Opening your inbox…" />;
}
```

When the inbox itself is pending below an already loaded header/navigation, use `viewport` instead of giving an inline region an arbitrary viewport-relative minimum height:

```tsx
<WorldLoadingScreen variant="viewport" label="Opening your inbox…" />
```

This mode uses a normal-flow `div`, not a nested `main`. Only its complete status group is positioned at the viewport midpoint and translated by half its own dimensions. There is no full-screen fixed backdrop, z-index escalation, pointer interception, body scroll lock, timer, or lifecycle hook. The parent mounts it only during actual pending work and removes it as soon as the inbox is resolved. Do not use this mode inside a transformed containing block, or for a panel whose neighboring content is already ready.

For a conversation-only fetch, preserve the loaded header, inbox, and composer. Let the message-history pane establish the containing block and use the `panel` treatment only while that pane is unresolved:

```tsx
<div className="relative min-h-0 flex-1 overflow-y-auto">
  <WorldLoadingScreen variant="panel" label="Opening your conversation…" />
</div>
```

The panel fills that containing block with absolute positioning and symmetric padding, not a viewport position or a competing minimum height. The complete mark/status group is centered in the available message area, including on desktop where the inbox takes part of the width. `align-content: safe center` preserves centering when the group fits; if unusually short space or enlarged text makes it too tall, the status starts within the scrollable panel instead of clipping above its scroll origin. It has no backdrop, timing logic, or controls and is never mounted over ready message history.

Use `inline` only for an ordinary unresolved content region that should retain its own minimum height:

```tsx
<WorldLoadingScreen variant="inline" label="Loading new work…" />
```

Do not use it for an artificial startup delay, as a full-screen overlay after content has loaded, or alongside a second live region announcing the same event. A detailed skeleton should win whenever the user benefits from seeing the incoming layout.

## Motion and accessibility

Only the orbital path turns, once every 7.2 seconds; the frame, world, and aperture remain still. With `prefers-reduced-motion: reduce`, the symbol becomes fully static and the halo is removed. Color is never the only carrier of status—the visible, specific label remains present. The treatment has no focus target and does not remove the shared app shell's interactivity.

## Evidence and design fit

This extends the existing interface contract rather than replacing it: artwork-first hierarchy, near-black surfaces, thin borders, Geist text, and cyan used as a selection/signal color are retained. The contract's earlier comparative reading of [Carbon tabs](https://carbondesignsystem.com/components/tabs/usage/), [Geist tabs](https://vercel.com/geist/tabs), and the [WAI-ARIA carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/) supports the transferable principles used here—clear state, visible focus where interaction exists, and motion that is not required to understand the UI. No visual asset, typeface, logo, layout, or source code is copied from those references.

For implementation behavior, Next 16's local `loading.tsx` documentation confirms that a loading special file is a Suspense fallback nested below its segment layout and automatically swaps out when the content is ready. Therefore this component is limited to real route or data-pending states, and never adds an artificial delay or a loaded-content overlay.

## September 7 centering correction

The initial inbox used an inline loader with a `70svh` minimum height below its header, which centers within that partial region rather than the viewport. The standalone fallback also used `100svh`, not the current dynamic viewport. The corrected API separates those geometries without altering the original World Aperture SVG, work-specific label, or reduced-motion behavior. The `/messages` route fallback now uses the same World Aperture instead of a separate spinning border.

Focused tests render the production component and route fallback with the real SVG, and parse the production CSS. They check viewport versus panel semantics, the midpoint/translation geometry, pointer transparency, route sizing, one polite atomic status, decorative mark, and the motion-preference gate. These tests do not substitute for actual browser layout measurements, safe-area/short-viewport checks, keyboard navigation, or physical-phone behavior; the coordinated chat browser audit records those results separately.

### Conversation-panel follow-up

The owner's follow-up also requested centering “Opening your conversation…”. The coordinated local browser fixture reproduced the old `inline` plus `min-h-full` call: the CSS module's 12rem minimum took precedence over the utility minimum, so at 390×844 the group was 246.5px above the center of a 717px message pane. A dedicated `panel` variant removes that cross-stylesheet height override rather than adding another competing utility.

The focused suite also checks the real conversation call site, its positioned message-history parent, absence of `min-h-full`, unchanged ordinary inline behavior, and the short-pane enlarged-text fallback. The coordinated browser audit measured the actual component and CSS in a temporary development-only synthetic fixture:

| Browser viewport | Message-pane size | Group-center offset from pane center |
| --- | --- | --- |
| 320×568 | 320×441 | 0px horizontally, 0px vertically |
| 390×844 | 390×717 | 0px horizontally, 0px vertically |
| 844×390 | 844×263 | 0px horizontally, 0px vertically |
| 1280×900 | 890×668 | 0px horizontally, 0px vertically |

All four ordinary panes had equal client and scroll heights. At 320×568 with the root font enlarged to 32px, the 134px-tall status group remained exactly centered in a 377px pane without overflow. With that same enlarged text and an intentionally constrained 72px pane, safe alignment placed the status 32px below the pane's top; the loader exposed 198px of scrollable height with no horizontal overflow, keeping the entire group reachable instead of clipping its top. The desktop pane began at x=390px, y=161px, confirming that centering follows the available conversation area rather than the whole viewport.

The temporary fixture was removed after these measurements, and the browser viewport override was reset. Synthetic geometry checks do not establish a real-account messaging or physical-phone keyboard workflow.
