# NODEINE interface contract

Status: existing archive identity preserved. The September 7 expanded conversations, icon-only dock, and private-voice backend are released. The owner rejected the modal recorder interaction; the revised inline recorder is a separate review candidate, not yet production-approved. Verified deployment and activation evidence is recorded separately in the release checklist; source presence alone does not prove delivery.

For new or revised UI flows, apply the owner's [UX review playbook](docs/design/ux-review-playbook.md) alongside this visual contract. It translates the supplied 20 recommendations into task, accessibility, feedback, recovery, and verification checks without importing another product's style.

## Job and visual direction

Let people discover authored visual Worlds, understand relationships, and create credited interpretations. Artwork dominates; navigation is quiet, legible, and predictable. Preserve the near-black surfaces, cyan selection, Geist typography, thin borders, and restrained rounded controls in `app/globals.css`.

## Foundations

- Surface: `--background`, `--card`, and `--popover`; foreground: `--foreground` and `--muted-foreground`.
- Selection and focus: `--primary` / `--ring`; activity uses the existing rose indicator plus an accessible count.
- Typography: `--font-sans` for reading, `--font-mono` for supporting metadata. No new fonts, external assets, or dependencies for navigation.
- Spacing: 4px rhythm; mobile dock 12px viewport gutter, 4px internal padding, 44px destination targets, 54px total height at default text size. One shared clearance token includes the bottom safe area and 8px breathing room.
- Layers: mobile dock z40, existing dialogs z50 and above. No navigation overlay or body scroll lock.
- Dock finish: shallow graphite gradient, translucent highlight along the upper edge, and a quiet selected-section pill. Explore uses ice cyan, Create pale lavender, and You neutral silver; Feed and keyboard focus retain cyan. Selection is also identified by shape/underline, never color alone. No looping glow or entrance animation.

## Mobile information architecture

One icon-only row contains four real links: Feed, Explore, Create, You. Their names remain available to screen readers and through title tooltips; active shape, keyboard focus and unread indicators remain visible. This owner-approved change reduces both the dock and its reserved space. Section pages organize secondary destinations:

| Section | Destinations |
| --- | --- |
| Explore `/explore` | Find artwork (Discover), Archive, Threads, public World previews |
| Create `/create` | Forge, Publish, New Thread, owner-only Your work / private Thread drafts |
| You `/you` | Saved, Inbox, Activity, current viewer's Profile or sign-in |

Archive retains its existing name and collection-browser destination. Individual World portals remain reachable through the feed and archive; do not invent an empty Worlds route.

Selecting a section navigates to its page. No second row, More drawer, arrows, hidden panel, or discovery gesture is required. Routes and browser history select the owning section; editing a Thread belongs to Create. At 1024px and above the same four destinations appear in a shared desktop header or the feed sidebar. Existing contextual actions remain alongside, not inside, primary navigation. Navigation does not auto-save an unfinished form.

**Focused conversation exception:** below 1024px, an authenticated, resolved conversation uses one contextual header and no global brand row or bottom dock. Remove the dock's reserved padding at the same time, retaining the bottom safe area once. Keep Back to inbox obvious. The inbox, unresolved destinations, signed-out, and unavailable states retain global navigation; desktop keeps its split pane and shared header. Selection alone is not enough to hide navigation. See the [measured chat-space audit](docs/audits/2026-09-07-mobile-chat-space.md).

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

For the latest conversation pass, official [Instagram messaging guidance](https://about.fb.com/news/2024/03/instagram-dm-updates/) provides a familiar reference for contextual themes and message actions. This is a feature-pattern comparison, not a live visual inspection of Instagram. NODEINE keeps its own artwork-first styling, opaque readable bubbles, explicit scope labels, and permission boundaries; no external UI assets were copied.

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
- The compact header can wrap for larger text. One **Add attachment** menu contains **Photo or video** and **Artwork from your worlds**, while the microphone remains explicit. Keep the mobile textarea at 16px, Back/Send at least 44px, and restore attachment-trigger focus after the artwork picker closes. Do not change send/upload behavior as part of layout work.
- Direct and group conversations share the full-height mobile shell. Desktop uses the available width with a 280–360px inbox rail instead of an outer 1280px cap; individual bubbles retain readable width limits. At large text sizes, the message field gets its own row before controls instead of shrinking or overflowing. Group creation has one scrollable dialog and a reachable sticky Create action.
- Preserve the reading position when someone else posts while the viewer reads older messages. Show a counted **Jump to latest** action; follow the newest messages only when already near the end or after the viewer sends. Scrolling must remain inside history, not move the document.
- One microphone click starts recording directly in the composer; no introductory dialog or second Record button. The browser's permission prompt remains mandatory when needed. A compact horizontal bar shows elapsed time against the real one-minute limit and measured input levels, never fabricated speech activity. Silent samples remain flat; unavailable metering is named honestly. Keep these frequent updates local to the composer, not the message history.
- Discard returns to the existing text draft. Send during recording finishes the file and sends once; Stop offers an optional listen-back first. The duration limit stops to review, never automatic delivery. Keep 44px controls, bounded mobile/desktop width, reduced-motion-safe status, and a full-width recording line above controls when enlarged text requires it. Restore focus from removed controls to an enabled action without stealing focus from elsewhere.
- Sent and preview voice notes use the outgoing Glacier/Orchid/Ember text palette; incoming notes use the same opaque graphite as incoming text. Use compact Play/Pause, duration, and a real seek/progress line, not the browser-native control strip. Give voice-only message wrappers a bounded preferred width so the seek track cannot collapse in an auto-width flex row. No autoplay or claim that the playback line is a waveform.
- Account/chat changes, cancel, and unmount release capture/analyser/playback resources and discard unsent local audio. Denied permission and failed delivery preserve the text draft. An unknown delivery outcome disables immediate resend and tells the user to check history; do not claim failure or risk duplicate sending. See the [inline voice audit](docs/audits/2026-09-07-inline-voice-review.md) and [official messaging references](docs/research/2026-09-07-inline-voice-messaging-references.md).
- **New group** is visible in the inbox and opens the existing invitation-based group flow. It is not a second messaging implementation; direct and group chats use the same composer.

## Loading identity

The original **World Aperture** combines a framed world, geometric portal, and one quiet orbiting point. Keep the familiar map/lens cue small and separate from the optional NODEINE wordmark. Use it only while a route or data region is actually pending; retain informative skeletons and loaded navigation. No forced startup duration, fake progress, imported combat effects, or full-screen overlay on finished content. The 7.2-second orbit becomes static under reduced motion. See `docs/design/loading-screen-concept.md`.

Center the complete mark/status group in the current viewport when the inbox itself is pending; use the dedicated **panel** variant for conversation loading. It fills the actual message region and centers both axes without a competing minimum height. When enlarged text cannot fit a very short panel, safe centering and scrolling preserve access. The initial inbox must not use an arbitrary partial-viewport height. A viewport-aligned status has no blocking backdrop and does not intercept navigation.

The earlier public appearance release is recorded in `docs/audits/2026-09-07-chat-release.md`; the expanded local review is recorded in `docs/audits/2026-09-07-chat-expansion.md`. Follow `docs/VOICE_NOTES_ROLLOUT.md` for actual private-voice activation evidence. Message-edit/removal controls have a separate database gate. Live audio rooms remain a simulation on the separate `codex/chat-visual-study` branch.
