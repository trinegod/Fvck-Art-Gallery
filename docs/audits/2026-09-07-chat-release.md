# NODEINE personal chat appearance — authenticated audit

Date: September 7, 2026. Scope: personal appearance and the existing navigation/flow repair checkpoint. This is not a launch of audio services.

## Delivered scope

The real direct/group inbox offers three opaque outgoing palettes, protected incoming text and metadata, a background selected from currently available image artwork shared in the active conversation, 35–85% dimming, personal hide/show, and reset. Preferences affect only this viewer/conversation on this device. Stored preferences contain no message text, signed media URL, or arbitrary background URL.

The audit reproduced an off-screen mobile composer. Constraining the ready inbox to the dynamic viewport, retaining panel scroll, reserving dock space once, and preventing header/composer shrink corrected it. The direct-conversation title remains a 44px creator-profile link; group titles do not link to an arbitrary member. Title text truncation no longer clips its keyboard focus outline.

Blocked-storage status now belongs to the keyed preference store, not the dialog's mount lifetime. Returning to a conversation therefore retains the temporary warning. A later successful write clears that warning even if the preference payload is identical. The description does not claim persistence while settings are temporary.

## Authenticated browser evidence

No real messages were sent, deleted, or edited. No account, group, or conversation was created. Testing used an existing signed-in direct conversation; private content and identifiers are intentionally omitted.

- Selected existing shared artwork and Orchid; reload retained artwork, palette, and 60% dimming.
- Personal hide removed the background; show restored it. Keyboard Home/End exercised 35% and 85% dimming. Ember was also visibly applied.
- Bubble and timestamp backgrounds remained opaque over artwork. Focus returned from the dialog to its trigger.
- Reset restored Glacier, no artwork, hide off, and 60% dimming; a full reload confirmed the visible defaults.
- The title link was keyboard-focused at 320px: computed 2px cyan outline, 44px height, and parent overflow visible.
- Final reload retained all four existing messages. A development hot-reload transiently cleared the displayed list during source edits; ordinary reload restored it. This does not establish cross-device messaging reliability.
- Viewport override was reset after testing.

| Viewport | Composer bottom | Dock top | Result |
| --- | ---: | ---: | --- |
| 320 × 800 | 708px | 718px | Visible; document 320 × 800 |
| 390 × 430 | 338px | 348px | Visible; dialog internally scrollable |
| 390 × 844 | 752px | 762px | Visible; no document overflow |
| 768 × 900 | 808px | 818px | Visible; no document overflow |
| 1280 × 900 | 900px | No mobile dock | Desktop layout contained |

## Automated and independent checks

- `npm test`: 85 passed, zero failed; 14 focused appearance tests.
- `npm run lint`: zero errors, four pre-existing admin image-optimization warnings.
- `npx --no-install next build --webpack`: production build and TypeScript passed after the final source fixes and prototype removal.
- Independent targeted ESLint, TypeScript, and `git diff --check`: passed; standards/spec review has no remaining blocking finding.

The new tests exercise the same preference store used by the hook: normalization, reload, malformed values, denied storage access (including a throwing storage getter), temporary fallback, events/unsubscription, account/conversation key separation, returning to temporary settings, and recovery when storage becomes available. Palette tests check opaque text contrast above 4.5:1. They do not claim whole-app accessibility compliance or a real browser storage-denial test.

The independent standards/spec review found and prompted fixes for explicit keyboard focus, group-title navigation, and temporary-status persistence. A final title-outline clipping concern was fixed and checked in the signed-in browser. Two non-blocking maintainability observations remain: repeated bubble classes and repeated dimming bounds.

Final command results and public-host verification are recorded in [GitHub rollout checklist #1](https://github.com/trinegod/Fvck-Art-Gallery/issues/1), so source validation is not confused with completed deployment.

## Limits and next phases

- Only one signed-in direct conversation was available. Incoming/group render variants were reviewed and their colors checked, but not exercised with a second real account.
- Physical mobile keyboards, cross-account browser switching, and two-device messaging acceptance still require user testing. Short viewport checks are not a substitute for physical keyboard testing.
- Voice notes, shared room-wide themes, real audio rooms, provider configuration, microphone capture, new database/storage policies, and paid image generation are not implemented by this release.
- The approved simulated visual study was captured at commit `46fd1b02f93c33f6c5b458ebcd9724d2e0d117d1` on [`codex/chat-visual-study`](https://github.com/trinegod/Fvck-Art-Gallery/tree/codex/chat-visual-study). Its preview routes, script, and components were removed from the release source after that recoverable capture.
- Production database changes and provider activation remain separately authorized rollout gates.

## Recovery

Use Reset appearance for personal choices. Reverting the scoped appearance/UI commits requires no message-format or database rollback. Existing public projects, source backup boundaries, and recovery procedures are in [Release and backup notes](../RELEASE_AND_BACKUP.md).
