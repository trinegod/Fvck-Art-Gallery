# NODEINE interface contract

Status: existing archive identity preserved; compact section navigation implemented locally September 6, 2026. Deployment is a separate gate.

## Job and visual direction

Let people discover authored visual Worlds, understand relationships, and create credited interpretations. Artwork dominates; navigation is quiet, legible, and predictable. Preserve the near-black surfaces, cyan selection, Geist typography, thin borders, and restrained rounded controls in `app/globals.css`.

## Foundations

- Surface: `--background`, `--card`, and `--popover`; foreground: `--foreground` and `--muted-foreground`.
- Selection and focus: `--primary` / `--ring`; activity uses the existing rose indicator plus an accessible count.
- Typography: `--font-sans` for reading, `--font-mono` for supporting metadata. No new fonts, external assets, or dependencies for navigation.
- Spacing: 4px rhythm; mobile dock 12px viewport gutter, 6px internal padding, 44px minimum controls, 56px destination row.
- Layers: mobile dock z40, existing dialogs z50 and above. No navigation overlay or body scroll lock.
- Dock finish: shallow graphite gradient, translucent highlight along the upper edge, and a quiet selected-section pill. Explore uses ice cyan, Create pale lavender, and You neutral silver; Feed and keyboard focus retain cyan. Selection is also identified by shape/underline, never color alone. No looping glow or entrance animation.

## Mobile information architecture

One row contains four real links: Feed, Explore, Create, You. Section pages organize secondary destinations:

| Section | Destinations |
| --- | --- |
| Explore `/explore` | Find artwork (Discover), Archive, Threads, public World previews |
| Create `/create` | Forge, Publish, New Thread, owner-only Your work / private Thread drafts |
| You `/you` | Saved, Inbox, Activity, current viewer's Profile or sign-in |

Archive retains its existing name and collection-browser destination. Individual World portals remain reachable through the feed and archive; do not invent an empty Worlds route.

Selecting a section navigates to its page. No second row, More drawer, arrows, hidden panel, or discovery gesture is required. Routes and browser history select the owning section; editing a Thread belongs to Create. At 1024px and above the same four destinations appear in a shared desktop header or the feed sidebar. Existing contextual actions remain alongside, not inside, primary navigation. Navigation does not auto-save an unfinished form.

## Interaction and accessibility

- Ordinary link semantics: Tab/Shift+Tab traverse destinations and Enter opens them. Do not apply tab/carousel roles or capture arrow keys.
- Secondary links are visible in section content. There are no off-screen navigation panels.
- Use `aria-current=page` for exact destination matches and `location` for a matched deeper route.
- No autoplay or decorative motion. Native page scrolling remains available. Existing action transitions respect reduced motion.
- Maintain visible cyan focus, labeled icons, touch targets of at least 44px, safe-area clearance, and zero document-level horizontal overflow at 320px.
- Missing auth/profile data uses Creator Studio access. Private destinations retain their existing sign-in gates. “You” always opens the viewer's space, not the artist being viewed. Account changes clear private lists and discard late responses from the former session.
- The unread indicator remains visible on You while another section is selected; the Activity destination includes the count.
- English is the current interface language. Re-test actual translated labels and wrapping before adding another locale; do not truncate navigation into ambiguous initials.

## Comparative evidence

The September 4 version drew on [Carbon's tab guidance](https://carbondesignsystem.com/components/tabs/usage/) and the [WAI carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/). The [awesome-design-md index](https://github.com/VoltAgent/awesome-design-md) was a secondary reference; no brand assets or implementation were copied. September 6 removes the rail entirely after the owner's feedback and measured 122px dock height; carousel/tab behaviors no longer apply.

The earlier visual refinement also considered [Linear's March 2026 refresh](https://linear.app/now/behind-the-latest-design-refresh) and [Geist's tabs](https://vercel.com/geist/tabs). The quieter separators, concise labels, and visible focus remain, expressed as ordinary page links in NODEINE's own artwork-first identity. The new section pages use editorial typography, restrained dividers, and existing credited artwork rather than new decorative assets.

## Verification gate

Test phone widths 320px and 390px, tablet width, desktop breakpoint, keyboard traversal, direct routes, history navigation, Studio escape path, and bottom-content clearance. Keep automated route-mapping tests with the shared destination model. See `docs/MOBILE_NAVIGATION.md` and `docs/audits/2026-09-06-repair-verification.md` for delivery evidence and limitations.

## Chat appearance — initial local slice

The owner approved the artwork-first chat direction and confirmed the name **NODEINE**. The real inbox's appearance dialog keeps customization contextual, outside the primary navigation. These settings affect the current viewer and conversation on this device, not another participant. A shared room theme is not yet implemented.

- Outgoing bubble presets: Glacier `#8de6ed` / ink `#0b2025`; Orchid `#d7c1f4` / `#271831`; Ember `#f2c28a` / `#2b190d`.
- Incoming text: `#f2f3f8` on opaque `#252d3a`. Sender names and timestamps: `#c7cfde` on opaque `#202632`. Media cards retain opaque graphite surfaces. Artwork must never determine text contrast.
- Choose background images from artwork already shared and available in the active conversation; keep no-artwork, personal hide, dimming (35–85%), and reset controls visible. No arbitrary URL input or uncredited decorative asset library.
- Palette selection uses labels and a checkmark in addition to color. Controls are at least 44px; no new animation. The dialog scrolls within a short viewport.
- Store only palette, artwork ID, visibility, and dimming under an account-and-conversation key. If storage is blocked, preserve temporary choices and explain they will not persist. Never store messages or signed URLs in appearance preferences.

Authenticated runtime evidence and rollout boundaries are recorded in `docs/audits/2026-09-07-chat-release.md`. Voice notes and live-room controls remain simulations on the separate `codex/chat-visual-study` archive branch, outside the release source.
