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
- `variant?: "centered" | "inline"` — centered for a route fallback, inline for one unresolved content region.
- `showWordmark?: boolean` — current name treatment; default `false` to keep embedded states compact.

The screen owns a single `role="status"` with polite, atomic updates. The SVG is decorative there, so assistive technology reads the work-specific label only once. It has no controls, modal treatment, timer, fake progress percentage, or completion claim.

## Usage rules

Use the centered treatment from a Next `loading.tsx` boundary when a segment has no meaningful shell to retain:

```tsx
import WorldLoadingScreen from "@/app/components/world-loading-screen";

export default function Loading() {
  return <WorldLoadingScreen label="Opening your conversations…" />;
}
```

For a real client-side fetch, preserve loaded content and place the inline treatment only in the unresolved region:

```tsx
<WorldLoadingScreen variant="inline" label="Loading new work…" />
```

Do not use it for an artificial startup delay, as a full-screen overlay after content has loaded, or alongside a second live region announcing the same event. A detailed skeleton should win whenever the user benefits from seeing the incoming layout.

## Motion and accessibility

Only the orbital path turns, once every 7.2 seconds; the frame, world, and aperture remain still. With `prefers-reduced-motion: reduce`, the symbol becomes fully static and the halo is removed. Color is never the only carrier of status—the visible, specific label remains present. The treatment has no focus target and does not remove the shared app shell's interactivity.

## Evidence and design fit

This extends the existing interface contract rather than replacing it: artwork-first hierarchy, near-black surfaces, thin borders, Geist text, and cyan used as a selection/signal color are retained. The contract's earlier comparative reading of [Carbon tabs](https://carbondesignsystem.com/components/tabs/usage/), [Geist tabs](https://vercel.com/geist/tabs), and the [WAI-ARIA carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/) supports the transferable principles used here—clear state, visible focus where interaction exists, and motion that is not required to understand the UI. No visual asset, typeface, logo, layout, or source code is copied from those references.

For implementation behavior, Next 16's local `loading.tsx` documentation confirms that a loading special file is a Suspense fallback nested below its segment layout and automatically swaps out when the content is ready. Therefore this component is limited to real route or data-pending states, and never adds an artificial delay or a loaded-content overlay.
