# NODEINE interface contract

Status: existing archive identity preserved; compact section navigation is in the earlier public release. The September 7 chat expansion is available in a separate review preview; production promotion and backend activation remain separate gates.

For new or revised UI flows, apply the owner's [UX review playbook](docs/design/ux-review-playbook.md) alongside this visual contract. It translates the supplied 20 recommendations into task, accessibility, feedback, recovery, and verification checks without importing another product's style.

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

## Chat appearance and controls — September 7 review candidate

The owner approved the artwork-first chat direction and confirmed the name **NODEINE**. The real inbox's appearance dialog keeps customization contextual, outside the primary navigation. These settings affect the current viewer and conversation on this device, not another participant. A shared room theme is not yet implemented.

- Outgoing bubble presets: Glacier `#8de6ed` / ink `#0b2025`; Orchid `#d7c1f4` / `#271831`; Ember `#f2c28a` / `#2b190d`.
- Incoming text: `#f2f3f8` on opaque `#252d3a`. Sender names and timestamps: `#c7cfde` on opaque `#202632`. Media cards retain opaque graphite surfaces. Artwork must never determine text contrast.
- Choose artwork already shared in the active conversation or a device photo. Prepare JPEG/PNG/WebP locally as a bounded JPEG preview; do not upload it or send it as a chat message. Keep personal hide, dimming (35–85%), remove, and reset controls visible. No arbitrary URL input or uncredited decorative asset library.
- Palette selection uses labels and a checkmark in addition to color. Controls are at least 44px; no new animation. The dialog scrolls within a short viewport.
- Store palette, artwork ID or a bounded locally re-encoded JPEG, visibility, and dimming under an account-and-conversation key. If storage is blocked, preserve temporary choices and explain they will not persist. Never store messages, external image URLs, signed URLs, or audio recordings in appearance preferences.
- The primary **Done** action is visible in the sticky footer; reset remains secondary. Disable Done/source-changing controls during preparation, and cancel unfinished preparation on closing the dialog. Choices apply immediately; Done closes the panel, not a shared-theme publish action.
- The header retains appearance and one labeled conversation-options button; save-all artwork, group settings, and personal clearing live there. Keep edit/remove actions beside the current viewer's messages, not in the global navigation. Destructive actions require explicit confirmation and explain whose copy is affected.
- Voice recording starts only after a microphone action, then offers Stop, Preview, Discard, and gated Send. Avoid autoplay. State uncertainty honestly after a lost delivery response, and keep permission-denied, unsupported-browser, expired-playback, and pending-activation states understandable.

## Loading identity

The original **World Aperture** combines a framed world, geometric portal, and one quiet orbiting point. Keep the familiar map/lens cue small and separate from the optional NODEINE wordmark. Use it only while a route or data region is actually pending; retain informative skeletons and loaded navigation. No forced startup duration, fake progress, imported combat effects, or full-screen overlay on finished content. The 7.2-second orbit becomes static under reduced motion. See `docs/design/loading-screen-concept.md`.

The earlier public appearance release is recorded in `docs/audits/2026-09-07-chat-release.md`; the expanded local review is recorded in `docs/audits/2026-09-07-chat-expansion.md`. Real voice-note components are now in source, with private sending and message controls gated by separate database/runtime approval. Live audio rooms remain a simulation on the separate `codex/chat-visual-study` branch.
