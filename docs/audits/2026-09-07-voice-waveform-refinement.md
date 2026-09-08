# Voice waveform and five-minute refinement

Owner request: show waveforms after sending, allow five-minute recordings, stop the desktop recorder stretching across the screen, provide one clearly identified group-test account, and publish the refinement to the existing public hosts.

## Follow-up: centered controls and continuous playback position

The owner approved the waveform addition and requested a shared visual centerline plus a smoothly moving position marker, not slower audio. Text messages and recording limits are unchanged.

- Reproduction: the actual production player in a temporary, muted synthetic-WAV harness positioned the waveform center 10px above the Play icon and the duration center 14px below. At 1280px after the change all three centers are exactly 91px. At 320px with 200% root text all three are 189px; the seek area is 112.4px wide, the waveform 96.4px wide, Play stays 44px and document width stays 320px. A long unwrapped debug output initially caused fixture-only overflow and was wrapped before final measurements.
- The regression command `node --import tsx --test tests/voice-note-playback.test.ts` first failed with displayed position 0 while actual media time was 0.016s. Ranked hypotheses were sparse media notifications, whole-bin progress coloring and browser time rounding. Sampling the actual media clock each animation frame fixes the first cause without interpolating or altering playback rate.
- Browser sampling over 120 rendered frames changed position 21 times before and 118 times after. Playback remained 1x. These are synthetic-browser measurements, not a guaranteed device frame rate. Frozen clocks do not invent progress or trigger redundant state renders; seeking remains immediate. Pause, buffering, hidden-tab, ended, error, reload and dispose cancel frame work, with visible/resumed playback resynchronized to real audio.
- The owner preference is durably recorded in `DESIGN.md` and the existing shared UX playbook. It favors measured optical alignment for compact controls and loading states without centering long reading text. No external memory service, new dependency or other project code was added.
- Test-account status: a read-only normal Auth settings check confirms signup is enabled and email auto-confirm is false. A made-up mailbox cannot complete ordinary signup. The normal project dashboard redirected to sign-in; the owner was asked to sign in before admin creation with a reserved test address. No account, invitation or global auth setting was changed.
- All 276 automated tests pass, along with nonincremental TypeScript and the local production Webpack build. ESLint has zero errors and five pre-existing warnings. The temporary audio harness was removed before that build; the final normal-text 320px check also measured all three centers at 91px with no horizontal overflow. Publication and backup results belong in the existing GitHub checklist; physical-phone playback and third-account group acceptance remain owner checks.

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

- All 273 automated tests pass, covering duration/parser/delivery boundaries, exact narrow-migration/rehearsal consistency, preview-to-sent contention, timeout/late-recovery behavior, silence/RMS samples, duration correction, palette/44px controls and responsive contracts.
- Nonincremental TypeScript and the production Webpack build pass. ESLint has zero errors and five unchanged pre-existing warnings. The temporary synthetic recording route was removed before the production build; no test audio is included in the source or deployment.
- In-browser rapid Stop → Send now produces the second measured waveform automatically; its intentionally incorrect 1s hint resolves to the actual 56.1s audio duration. Text draft remains unchanged and active capture tracks return to zero.
- The authenticated 390px conversation still has 717px of message history, a 63px contextual header and 62px composer, with zero document overflow and no global dock/brand reserve. Its microphone tooltip correctly states five minutes/4MiB. These are browser viewport measurements, not a physical-phone keyboard or touch test.
- The real inbox's **New group** entry opens the existing group-name/search/invitation dialog. Create stays disabled until its required selections are present. No test invitations or groups were created in the absence of the third account.
- Authenticated history reload exposed a pre-existing query omission: `voice_duration_ms` was absent from the selected message columns, leaving older WebM notes with no duration hint or automatic waveform. A projection-aware regression failed before the fix and passed after the shared field list included duration. Inbox, text-send and artwork-send queries now reuse that list. This release targets the already-activated voice schema; fresh installations must apply the documented voice migration before this client.
- After that repair, the signed-in conversation at 390px reloaded all three visible existing voice notes with measured 48-bin waveforms and their respective actual durations. No private note was played aloud, sent or copied into the repository.

## Verification boundaries

Three agents own the recording/backend limits, waveform player, and responsive layout/audit respectively; the primary agent verifies integration and release. Automated browser input is synthetic audio only: the owner's ambient microphone is never captured. Local fixture sends append browser-only test bubbles, not actual messages.

Deployment and backup completion are tracked in [GitHub issue #1](https://github.com/trinegod/Fvck-Art-Gallery/issues/1) and the release backup manifest after publication. Real iOS/Android recording, interruptions, keyboard/safe-area behavior and recipient delivery remain hands-on checks. Browser full-file decoding cannot be preempted internally: bounded input, downsampled single-job decoding and post-decode bounds reduce exposure, but do not constitute a trusted media scanner or a hard predecode duration guarantee.

The requested “Princess Sakura (Test)” account now has owner approval to use a reserved test address. It needs normal authorized admin creation because ordinary signup requires a working confirmation mailbox. Dashboard sign-in is pending; no account, invitation, public activity, or access-control bypass has been fabricated.

## References

The existing project design contract and owner-supplied UX playbook guided fixed touch targets, readable themed surfaces, bounded layout, truthful feedback and recovery. Agent Reach's webpage route could not resolve its reader host; the browser API facts were verified through the available web reader against primary documentation instead. No tools or dependencies were installed.

- [MediaRecorder options](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/MediaRecorder): explicitly request an audio bitrate; unspecified browser defaults are adaptive.
- [decodeAudioData](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData): analysis requires the complete file and returns audio resampled to the context rate. A live recording trace is not a substitute for decoding the sent file.
