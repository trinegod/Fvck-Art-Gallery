# Inline voice review — September 7, 2026

Baseline: `323f55e5a23c2eda23360dc9101d7e60b43bf724`. Scope: replace the owner-rejected voice dialog/second Record action and generic native playback; preserve spacious direct/group chat, text drafts, attachment sharing, and server privacy boundaries. Make the existing group creation discoverable. This is a review candidate, not public-production approval.

## Implemented

- First microphone click invokes capture; no recording on mount, hydration, or effect replay. Browser permission remains a browser-owned requirement.
- Inline bar: real RMS input samples at20Hz, elapsed time/1:00 limit, Discard, Stop/review, Send. Silence is flat. No analyser-to-speaker connection; unavailable metering is explicit. Updates stay inside the composer.
- Direct Send waits for final recorder bytes; Stop and the automatic duration limit only prepare preview. Repeated clicks cannot double-dispatch. Unknown delivery outcomes disable immediate resend; cancellation/scope changes clear queued intent.
- Compact Play/Pause and keyboard-accessible seeking/duration in the actual text palette. Native browser controls and autoplay are absent. Expired/missing source errors are caught, including non-bubbling source errors; Reload does not autoplay.
- Existing text draft and attachment menu are preserved. Voice-only message wrappers have a preferred288px width bounded by their responsive parent. Large text moves the recording bar above the44px controls rather than squeezing them.
- Visible **New group** opens the existing invitation-based group dialog; no new messaging system, migration, invitations, or membership changes.

## Independent audit and automated evidence

Three agents handled real metering, playback, and independent UX/source review. Audits reproduced and repaired: focus dropping after Stop/gated Send/automatic completion; auto-width playback shrinking; duration-limit Stop/Send race; object-URL preparation/cleanup failures; child-source playback errors. Final focused reviews reported no remaining actionable finding in exercised paths.

245 automated tests pass across the repository, including SSR of the actual composer/player, real recorder/session callbacks, duplicate/late delivery, sample math, microphone cleanup, palette contrast, and source disposal. Nonincremental TypeScript and the production webpack build pass. ESLint has no errors and five unchanged pre-existing warnings. No ambient microphone capture or test message was sent to a real participant. Source/DOM evidence does not replace a multi-device delivery test.

## Browser evidence

Temporary local test route used the production composer, recorder, analyser, and player with a generated sine-wave MediaStream and local-only mock delivery. It was not a simulation of the waveform or a microphone recording. The test route was removed before the production build; the route table excludes it and its URL returns404. Browser viewport overrides were reset after verification.

- One click produced one capture request and an inline recording state. Quiet signal bars were about6.66px; louder signal about21.05px; zero signal all2px. Finalization stopped the synthetic tracks.
- Direct Send from recording produced one local message; Stop produced preview only. Preview could play to completion and seek with keyboard controls. After Send/Discard, the original text draft remained.
- At390px: recording composer61px high; preview composer71px; sent player54px high,288px wide with218px seek region. At320px: recording composer61px; all three actions44×44px; sent player236.16px with166.16px seek region. No horizontal document overflow. Sent fixture matched the real flex-row/auto-width parent structure.
- Sent players also remained288px wide at1024px and1440px; palette change to Orchid yielded computed `rgb(215,193,244)`. Contrast checks cover all presets and incoming surfaces.
- At320px with32px root text, the line reflowed above controls; composer177px, no horizontal overflow. This is enlarged browser text, not a physical OS accessibility test.
- Disabled delivery: Stop→preview focused enabled Discard, not disabled Send. Denied microphone permission showed an inline error and preserved text. Switching the fixture's conversation key changed active synthetic tracks1→0 and returned to idle.
- Missing local audio source showed an inline error plus Reload; no autoplay. Actual signed-in messages retained the microphone and spacious composer, no old voice dialog, and no horizontal overflow. Real inbox New group opened the existing group creation dialog without creating a group.

## Remaining acceptance and release boundary

- Owner review on a physical phone: microphone permission, genuine voice volume, browser/OS interruptions, mobile keyboard, safe area, send→recipient playback, and Bluetooth/headset behavior.
- Full authenticated HTTP/Storage multi-account delivery, concurrent rate limiting, and poor-network scenarios retain their earlier rollout checklist; this revision makes no broader claim.
- One-minute/4MiB limits remain aligned with the live database. Five-minute recording is not implemented or advertised.
- Message editing/deletion, shared room-wide themes, and live audio rooms are separate capabilities/gates; no change here.
- GitHub review commit, immutable preview readiness, and backup verification will be recorded after source verification. Public production remains on `323f55e` until separately approved.
