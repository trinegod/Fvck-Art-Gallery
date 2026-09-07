# NODEINE chat appearance — local audit

Date: September 6, 2026. Status: partial local implementation; not a production release.

Historical checkpoint: the September 7 signed-in follow-up closes the local appearance gates and records remaining limits in [Authenticated appearance audit](2026-09-07-chat-release.md). The live rollout checklist is [GitHub #1](https://github.com/trinegod/Fvck-Art-Gallery/issues/1); the pending items below describe the earlier checkpoint, not current completion.

## Scope

The owner approved the chat/voice-room visual direction and corrected the name to NODEINE. The preview header and launch-screen concept now use that spelling.

The real inbox gains a personal appearance dialog, curated opaque outgoing bubbles, protected incoming bubbles and metadata, background selection from images shared in the active conversation, dimming, personal hide, and reset. Settings are device-local, isolated by viewer and conversation. Stored data contains an artwork reference, not its URL or message content. Unavailable or removed artwork falls back to the plain background.

These controls do not set a shared group theme. Voice notes, actual audio rooms, provider activation, and production database changes remain unimplemented. The development-only design study continues to label its audio as simulated.

## Automated evidence

- Targeted ESLint: pass.
- TypeScript: `npx --no-install tsc --noEmit --incremental false` passed.
- Full suite: `npm test` passed, 76 tests, including five new appearance tests.
- New tests cover corrupt preferences, invalid values, safe defaults, palette round-trips, account/conversation key separation, and opaque text contrast above 4.5:1.
- Project lint: zero errors; four pre-existing admin image-optimization warnings.
- Whitespace check: `git diff --check` passed.

## Browser evidence and limits

- Corrected NODEINE preview header verified at 320px, with document width 320px.
- Corrected NODEINE launch-screen dialog also verified at 320px; the viewport was restored after the check.
- The real inbox at port 3001 renders its signed-out access screen. No authentication was bypassed and no real conversation or account was created for testing.
- Authenticated appearance interaction, actual narrow-screen conversation layout, browser storage failure behavior, cross-account UI switching, and refresh persistence still need runtime verification.
- No microphone recording, actual audio playback, provider traffic, live-room moderation, production RLS mutation, or production deployment was tested or performed.

## Independent review

### Standards

The reviewer identified missing explicit cyan keyboard-focus treatment on the new appearance controls. That was fixed with a shared focus-ring class. The dialog now uses the actual dialog trigger for focus restoration and expanded semantics; its close control is at least 44px. A follow-up review found no remaining documented accessibility-contract violation.

Two low-priority maintainability notes remain: repeated bubble classes in the two rendering branches and repeated dimming bounds between validation and the slider. Neither is a demonstrated correctness defect.

### Spec

The review found no concrete correctness, privacy-isolation, or scope-creep defect in this personal-appearance slice. It independently confirmed that the tests exercise parsing, keys, and color constants—not the actual hook/dialog/account-switch interactions. The authenticated and browser-storage checks above remain release gates. This is not an all-features or end-to-end security clearance.

## Remaining rollout gates

1. Confirm the proposed GitHub testing/checklist breakdown before publishing the spec and tickets.
2. Verify appearance inside a signed-in conversation on phone and desktop; include long names/messages, unavailable backgrounds, keyboard focus, reload, reset, blocked storage, and account changes.
3. Implement and verify permissioned shared themes and voice notes as separate vertical slices. Voice notes must record only after explicit user action, stop tracks on exit, allow preview/discard, and upload only after Send.
4. Obtain separate approval for staging/production schema activation and a live-audio provider before enabling the private room pilot. Listener-by-default join, explicit unmute, host moderation, membership enforcement, and spending limits are release requirements.
5. Independent review of this personal-appearance slice is complete; production build and authenticated/device release checks remain pending. Publish only after those gates pass; do not claim an audio launch from a visual preview.

## Recovery

Appearance can be reset from its dialog or removed by reverting the scoped UI/helper changes. No database or stored-message format changed. Existing messaging and the production deployment remain separate from this local update.
