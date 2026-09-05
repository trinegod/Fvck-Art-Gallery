# NODEINE interface contract

Status: existing archive identity preserved; grouped mobile navigation implemented September 4, 2026.

## Job and visual direction

Let people discover authored visual Worlds, understand relationships, and create credited interpretations. Artwork dominates; navigation is quiet, legible, and predictable. Preserve the near-black surfaces, cyan selection, Geist typography, thin borders, and restrained rounded controls in `app/globals.css`.

## Foundations

- Surface: `--background`, `--card`, and `--popover`; foreground: `--foreground` and `--muted-foreground`.
- Selection and focus: `--primary` / `--ring`; activity uses the existing rose indicator plus an accessible count.
- Typography: `--font-sans` for reading, `--font-mono` for supporting metadata. No new fonts, external assets, or dependencies for navigation.
- Spacing: 4px rhythm; mobile dock 12px viewport gutter, 6px internal padding, 44px minimum controls, 56px destination row.
- Layers: mobile dock z40, existing dialogs z50 and above. No navigation overlay or body scroll lock.
- Dock finish: shallow graphite gradient, translucent highlight along the upper edge, a quiet selected-section pill, and consistent inset icon wells. Explore uses ice cyan, Create pale lavender, and You neutral silver; persistent Feed and keyboard focus retain cyan. Selection is also identified by shape/underline, never color alone. No looping glow or entrance animation.

## Mobile information architecture

Feed is fixed at the leading edge. Three labeled sections organize the remaining destinations:

| Section | Destinations |
| --- | --- |
| Explore | Discover, Archive, Threads |
| Create | Forge, Publish, New Thread |
| You | Saved, Inbox, Activity, Profile |

Archive retains its existing name and collection-browser destination. Individual World portals remain reachable through the feed and archive; do not invent an empty Worlds route.

Sections switch the dock's destinations, not the current page. Native horizontal scroll snapping and three visible, equally sized section tabs provide gesture and non-gesture access. The tabs span the same width as the destinations beneath them; the next-section arrow was removed following creator feedback to reduce clutter. Feed remains visible in every section. A route change selects its owning section; viewport resizing preserves the currently browsed section. Desktop navigation is unchanged at 1024px and above.

## Interaction and accessibility

- Tab semantics for section selectors; ArrowLeft/ArrowRight, Home/End, and ordinary Tab support. Destination controls are real links, apart from the archive's existing reset action.
- Inactive panels are inert and hidden from assistive technology; never tab into an off-screen destination. Recover focus to a visible section selector if a swipe hides its focused panel.
- Use `aria-current=page` for exact destination matches and `location` for a matched deeper route.
- No autoplay or decorative motion. Button-driven switching is immediate, including with reduced motion; native touch scrolling remains available. Existing action transitions respect reduced motion.
- Maintain visible cyan focus, labeled icons, touch targets of at least 44px, safe-area clearance, and zero document-level horizontal overflow at 320px.
- Missing auth/profile data uses Creator Studio access. Private destinations retain their existing sign-in gates. “You” remains the viewer's profile, not the artist being viewed.
- The unread indicator remains visible on You while another section is selected; the Activity destination includes the count.
- English is the current interface language. Re-test actual translated labels and wrapping before adding another locale; do not truncate navigation into ambiguous initials.

## Comparative evidence

The synthesis takes concise grouped labels and explicit overflow controls from [Carbon's tab guidance](https://carbondesignsystem.com/components/tabs/usage/) and focus/hidden-panel principles from the [WAI carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/). The [awesome-design-md index](https://github.com/VoltAgent/awesome-design-md) was inspected as a secondary reference; no brand assets or implementation were copied. This is a NODEINE navigation component, not an autoplay content carousel.

The visual refinement also considered [Linear's March 2026 refresh](https://linear.app/now/behind-the-latest-design-refresh) (quieter navigation, softer structural separators) and [Geist's tabs](https://vercel.com/geist/tabs) (concise labels, instant sibling-view changes, visible focus). The dock tabs switch sibling navigation panels; the destinations inside remain ordinary page links. The final treatment retains NODEINE's own artwork-first identity.

## Verification gate

Test phone widths 320px and 390px, tablet width, desktop breakpoint, section buttons, keyboard traversal, horizontal scrolling, direct routes, history navigation, Studio escape path, and bottom-content clearance. Keep automated route-mapping tests with the shared destination model. See `docs/MOBILE_NAVIGATION.md` for delivery evidence and limitations.
