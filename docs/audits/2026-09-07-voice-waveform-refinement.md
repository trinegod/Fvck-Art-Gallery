# Voice waveform and five-minute refinement

Owner request: show waveforms after sending, allow five-minute recordings, stop the desktop recorder stretching across the screen, provide one clearly identified group-test account, and publish the refinement to the existing public hosts.

## Scope and evidence

- The approved inline microphone/Stop/Send/Discard interaction remains. No introductory dialog, external audio provider, account-wide theme changes, or new navigation was added.
- Desktop defect reproduced in the real composer using an injected synthetic MediaStream: at 1440px viewport width, the row was 1398px and its trace area 1137.9px, but 28 fixed-width bars covered only 138px. The trace was not running out of recorded audio; fixed sample widths were being placed inside an unbounded container.
- After the scoped fix, the recording row is centered and capped at 500px. Its 28-column fluid trace covers its complete 239.9px area. A 320px harness viewport retains 28 visible samples, a 278px row and no document overflow. At 200% root text, the inner trace initially shrank to 17.82px; a second narrow-container rule now gives it a 190px line inside the 238px recording cluster. Controls stay 44px and document width stays 320px.
- Sent and preview notes derive a compact RMS envelope from their actual complete audio files, locally and lazily. The waveform uses the existing bubble ink and colors; progress still follows the real player. Failed/unsupported waveform analysis falls back to the functional seek line, not fabricated activity. No audio is sent to an AI or analytics service.
- Five-minute duration validation is aligned across recorder, client delivery, route parsing and both database CHECK constraints. The independent 4 MiB file and multipart caps, private bucket, member authorization and sender/rate safeguards remain unchanged. Requested 64 kbit/s speech encoding leaves nominal headroom; browsers can choose a different output bitrate, so the byte cap remains authoritative.

## Database and browser results

- Authorized rollback rehearsal passed 26 assertions without creating any real account, conversation, message or audio object. A separate connection confirmed the original 60,000ms checks returned. The same narrow migration was then applied; postflight shows both 300,000ms bounds, unchanged body constraint, identical private-storage policy and voice-trigger hashes, private 4 MiB audio bucket, RLS enabled and the group-creation function still present. No broader migration was rerun.
- Real browser synthetic MediaRecorder/Analyser test ran continuously to 5:00 and stopped to review with zero active capture tracks. The WebM/Opus file measured 2,434,609 bytes for the reported 300,000ms. Sending to the local-only harness displayed 48 measured bins, a 5:00 label and preserved the text draft. Screenshot/DOM review at 390px showed a 288px themed bubble and no horizontal overflow.
- A second 95.644s recording exposed transient preview-to-sent decode contention; retrying the same file proved its audio was valid. The queued loader now waits for a cancelled preview's native decode to settle within a bounded deadline before analyzing the sent note. Its regression test reproduces the old missing-waveform behavior.
- The independent audit also caught a saved-duration/decoded-duration mismatch. Decoded duration now supersedes the informational hint. In the browser, a deliberately incorrect 1s hint did not truncate a 95.52s decoded note; muted playback advanced and keyboard seeking reached 95.3s, well beyond that hint. Finite native metadata remains the player's first authority when available.

## Analysis performance and privacy

Only visible players request analysis. Bounded outgoing/local recordings can load automatically; incoming remote audio needs finite native duration at most 301s or an explicit Play action. An incoming sender's claimed duration does not grant automatic decoding. Unsupported analysis leaves a real seek line with an honest accessible description.

Downloads stream with a 4 MiB cap and no-store; one page-wide 8kHz offline decode runs at a time, with no microphone/output connection, external analysis or persistent audio cache. A subsequent request waits for previous native decoding to settle within its own 15s deadline; if a previous decode is already known to have timed out, subsequent requests fall back immediately until it settles. Jobs never overlap. Cancel, visibility loss, account/chat/source changes and unmount discard late results. Native decoding cannot itself be cancelled: post-decode limits of 301s, 2,408,000 frames and mono/stereo are not a hard predecode PCM allocation guarantee.

## Final source verification

- 272 automated tests pass, including duration/parser/delivery boundaries, exact narrow-migration/rehearsal consistency, preview-to-sent contention, timeout/late-recovery behavior, silence/RMS samples, duration correction, palette/44px controls and responsive contracts.
- Nonincremental TypeScript and the production Webpack build pass. ESLint has zero errors and five unchanged pre-existing warnings. The temporary synthetic recording route was removed before the production build; no test audio is included in the source or deployment.
- In-browser rapid Stop → Send now produces the second measured waveform automatically; its intentionally incorrect 1s hint resolves to the actual 56.1s audio duration. Text draft remains unchanged and active capture tracks return to zero.
- The authenticated 390px conversation still has 717px of message history, a 63px contextual header and 62px composer, with zero document overflow and no global dock/brand reserve. Its microphone tooltip correctly states five minutes/4MiB. These are browser viewport measurements, not a physical-phone keyboard or touch test.
- The real inbox's **New group** entry opens the existing group-name/search/invitation dialog. Create stays disabled until its required selections are present. No test invitations or groups were created in the absence of the third account.

## Verification boundaries

Three agents own the recording/backend limits, waveform player, and responsive layout/audit respectively; the primary agent verifies integration and release. Automated browser input is synthetic audio only: the owner's ambient microphone is never captured. Local fixture sends append browser-only test bubbles, not actual messages.

Deployment, final test counts, database rehearsal and backup results are recorded below only after they complete. Real iOS/Android recording, interruptions, keyboard/safe-area behavior and recipient delivery remain hands-on checks. Browser full-file decoding cannot be preempted internally: bounded input, downsampled single-job decoding and post-decode bounds reduce exposure, but do not constitute a trusted media scanner or a hard predecode duration guarantee.

The requested “Princess Sakura (Test)” account needs an owner-controlled email and any normal signup confirmation. No account, invitation, public activity, or access-control bypass is fabricated while that information is missing.

## References

The existing project design contract and owner-supplied UX playbook guided fixed touch targets, readable themed surfaces, bounded layout, truthful feedback and recovery. Agent Reach's webpage route could not resolve its reader host; the browser API facts were verified through the available web reader against primary documentation instead. No tools or dependencies were installed.

- [MediaRecorder options](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/MediaRecorder): explicitly request an audio bitrate; unspecified browser defaults are adaptive.
- [decodeAudioData](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData): analysis requires the complete file and returns audio resampled to the context rate. A live recording trace is not a substitute for decoding the sent file.
