# Voice seeking, Seen and personal chat mute — September 7, 2026

## Scope and evidence

Owner-requested follow-up to `24a380d`: visible thumb/mouse seeking, 1×/1.5×/2× playback, compact truthful read receipts, and personal direct/group notification muting. The artwork visibility action was inspected: it says **Hide artwork for me** while visible and **Show artwork for me** while hidden. No reversal is needed.

The project-owned UX guide drives 44px controls, optical alignment, progressive disclosure in Conversation options, immediate pending feedback and honest failures. No new image/audio service, package, database migration, access-control relaxation or unrelated project change is required.

## Voice controls

- A native range input now exposes a 20px visible handle inside its 44px seek region, aligned with the waveform's usable endpoints. Mouse/touch pointer capture preserves the gesture outside the track; keyboard arrows seek one second, Page keys ten seconds, Home/End jump to endpoints. Native range semantics retain assistive-technology support.
- A scrub pauses playing audio and shows a timestamp without moving the bubble. Release resumes only previously playing audio; cancellation restores the prior position. A hidden-tab interruption ends scrubbing and stays paused instead of restarting later. Scope changes dispose the player.
- The speed button cycles the actual media element through 1×, 1.5× and 2×, preserving pitch where supported. It never starts paused audio or invents timeline progress. Unsupported native speed changes report the actual remaining speed and do not disable ordinary playback.
- Production player tested in a temporary local fixture using a four-minute synthetic WAV, muted during playback. Desktop cursor dragging forward/backward moved actual `audio.currentTime`; a playing note resumed at 2× and a paused note stayed paused. End selected 240 seconds; Home → ArrowRight → PageUp selected 11 seconds. No ambient microphone, private message, upload or public test activity was used.
- Actual in-app browser viewport measured 320px with no document overflow. Both 288px and 224px bubble widths fit; 200% root text reflowed a 224px bubble into two aligned rows, 122px total height, keeping Play/speed at 44px. Cursor dragging was also exercised at the mobile-sized viewport. This is not a physical thumb, VoiceOver or TalkBack test.

## Seen and personal mute

- One compact Sent/Seen label follows the latest own nonremoved message; groups show Seen by N or Seen by all among eligible current members. Self, post-send joins, duplicate profiles and missing/invalid metadata cannot fabricate an all-read receipt. Timestamp comparisons preserve SQL precision. Seen is not delivery confirmation or proof that somebody read text or listened to audio; old stored watermarks cannot be retroactively validated as foreground observations.
- New acknowledgements require a visible focused document, the end of history, actual rendered message content within the visual viewport and no overlay covering that content. Scroll, focus restoration, foregrounding, online and resize schedule a post-layout check. Writes are monotonic, coalesced, retryable and scoped to the current account/conversation. Failed saves expose a scoped status instead of implying success.
- **Conversation options → Mute notifications** works for direct and group chats using the already-deployed authenticated personal RPC. Group settings reuse the same control. It suppresses future notification records for the current account, not message delivery or inbox unread counts. Muted inbox entries show a small accessible bell-off indicator.
- Mute saves require membership readback before success. Failed/uncertain results retry the same absolute intent rather than accidentally toggling twice. Expired legacy mutes display as unmuted. Account/chat changes invalidate stale feedback; subsequent external state changes cannot leave a contradictory success label.
- In the signed-in local app against the existing backend, the owner’s direct conversation was briefly muted, confirmed via the UI's server readback, then unmuted and confirmed again. Its original unmuted preference was restored. No other participant preference, message or invitation was changed. This is a saved-preference test, not a multi-recipient live-notification delivery test.
- At an actual 320×740 browser viewport, Conversation options measured 288×617px within the viewport; the mute action measured 256×44px. The real conversation had zero document overflow. A 236px sent voice bubble kept Play, seek, time and speed on a shared 44px-high row. Receipt text uses the opaque metadata palette (9.68:1 contrast), with wrapping instead of clipping. The latest real outgoing message displayed Sent; no fake Seen demonstration was injected into live history.

## Release evidence

The temporary synthetic-audio fixture was removed before the production build. Deployment and local iCloud backup verification belong in the existing GitHub issue and release manifest after completion; source changes do not establish that either happened.

Final source checks: **304 tests passed**, TypeScript passed, ESLint had zero errors and five pre-existing warnings, `git diff --check` passed, and the optimized Next.js webpack production build passed with no fixture route.

Independent cross-audits reviewed audio lifecycle/requirements and Seen correctness. The audio audit found no severe/medium issues and independently reran 20 player tests. The Seen audit identified a removed-newest-message unread-badge edge case: acknowledgement now uses the newest displayed history row, including tombstones, while receipt labels still exclude removed content. A regression covers both mixed and entirely removed history. No other concrete correctness findings were reported; these are bounded audits, not a claim that every app feature is perfect.

The test account is blocked on ordinary Supabase dashboard administrator sign-in. No synthetic account, founder message, group invitation or acceptance has been fabricated. Physical iOS/Android gestures, Bluetooth/headphone interruptions, native screen readers and a live multi-account Seen/mute/group test remain explicit checks.

The owner's later edit/delete request was checked against the real app: own-text edits, own-message removal (including voice), and personal chat clearing are implemented but remain disabled because `message-controls.sql` is not activated. The same administrator sign-in blocks the required database rehearsal/activation. No private content was edited, cleared or removed as a test. This follow-up does not claim those controls are live; follow [Message controls rollout](../MESSAGE_CONTROLS_ROLLOUT.md).
