# Chat expansion review — September 7, 2026

Base: `71bb8fe8b35887922c12b75841ec786fcf384d54` on `codex/slim-navigation-audit-repairs`. Application candidate: `479c8a517d05666a04e7dea73f970a6660562486`. This document records source/local-browser evidence and the subsequently approved preview, not a production promotion or proof that SQL is activated.

## Implemented

- Personal appearance: explicit Done footer; device photo preparation, preview, persistence, hide/show/remove; existing shared-art backgrounds and opaque bubble palettes retained. JPEG/PNG/WebP inputs are bounded to 8 MiB and re-encoded in the browser to a bounded JPEG preference. No background image upload or chat send occurs.
- Real explicit-action microphone recorder, preview/discard/send states, 60-second / 5 MiB cap, actual MIME fallback, player and playback retry. Private delivery route verifies identity/membership and uses a separate private audio bucket. Sending is disabled until activation.
- Capability-gated own-text editing, own-message tombstones, and personal clear cutoff. Contextual actions stay in the conversation/message rather than expanding global navigation.
- Original World Aperture loading primitive in the root fallback, feed skeleton and pending inbox/conversation states. No added packages, raster generation, startup delay or third-party logo.

## Independent review and repairs

Three agent workstreams covered voice/controls, loading/backend, and independent integration/security research. Findings were returned to the writer, repaired, then reviewed against the fixed base. Key repairs:

- Cancel local photo preparation safely; prevent Hide/source controls from racing an in-flight decode.
- Release late microphone grants, tracks, timers and preview URLs; keep recorder setup usable after React Strict Mode cleanup/replay.
- Reconcile a voice insert with a lost response before deciding whether upload cleanup is safe. Unknown delivery does not claim the note was not sent; response identities and paths are validated.
- Never use a legacy caller-supplied attachment path as authority to delete storage. Voice removal uses sender/owner/path proof and a private durable receipt for authorized retries. Failed storage cleanup does not undo a confirmed tombstone.
- Server-generate creation/edit/removal/cutoff timestamps; reject forged metadata and NULL edits. Preserve fractional PostgreSQL timestamps to avoid stale microsecond edits overwriting newer rows or dropping newly received messages after clearing.
- Separate conversation identity from history refresh cancellation. Membership realtime must not strand a successful clear on “Clearing…” or invalidate unrelated same-conversation operations. Keep post-cutoff messages already received while the clear response is pending; filter delayed pre-cutoff rows at the display boundary.
- Preserve old-schema compatibility by checking capabilities and falling back only on recognized missing-column errors. Authorization errors are not compatibility fallbacks.
- Disable the old whole-group-delete client handler: it deleted old media before the database operation and did not include the new voice bucket. The older server RPC is not changed or globally disabled by this UI gate.

## Evidence

| Check | Result and scope |
| --- | --- |
| Automated tests | **143 passed**, zero failed. Pure helpers, actual Supabase query-boundary fake fetch, injected media lifecycle, and AST-extracted production callback regression tests. No live private-data mutations. |
| TypeScript | `npx tsc --noEmit` passed. |
| Lint | `npm run lint -- --quiet` passed (no errors; quiet suppresses preexisting warnings). |
| Build | `npm run build -- --webpack` passed, including type checking/static generation. Default Turbopack hit the local child-process/port permission restriction; the alternate supported compiler was used without changing project configuration. |
| Patch integrity | `git diff --check` passed. |
| Real browser file picker | Selected an existing public fixture through the browser picker; local JPEG preparation, Done, full-page reload persistence, Hide/show and remove succeeded. Existing personal appearance choice was restored through the UI. |
| Narrow phone | 320×568 and 390px-wide checks showed no document-level horizontal overflow. At 320×568 the appearance dialog stayed inside the viewport and Done remained visible with a 44px target. The microphone entry was 44px at 390px. |
| Actual gated UI | Voice panel opens with explicit Record and a pending-activation explanation. Message actions and personal clearing are disabled when their RPC is unavailable. No simulated success path. |
| Loading | Observed the actual pending inbox fallback in the signed-in browser; it retained the app shell. Reduced-motion styling is source-checked, not physical-device preference QA. |
| Approved Vercel preview | Existing GitHub-triggered deployment is READY at the immutable link below; metadata matches `479c8a5`, and the cloud Turbopack build succeeded. Public signed-out feed artwork loaded; 390px feed/messages checks had no horizontal overflow. No Vercel login wall; chats correctly require NODEINE sign-in. |

## Not verified or activated

- Neither `supabase/voice-notes.sql` nor `supabase/message-controls.sql` was applied. SQL review and mocked tests do not establish working production RLS, storage, realtime or rate limiting.
- No microphone was activated and no real voice note was recorded, sent or deleted. Hardware Safari/Chromium recording, playback, permission interruption and mobile-keyboard checks remain human/runtime gates.
- No real private text was sent/edited/removed, no user's chat was cleared, and no group or stored user file was deleted.
- Live audio rooms, shared group-wide themes and Forge image generation remain unconnected. This is not a claim of full Instagram feature parity.
- The local photo's declared dimensions are checked after browser decoding; unusually compressed/deceptive inputs still depend on browser decode safeguards. It is not a general hostile-image processing service.
- Storage cleanup is not an automatic background job. Legacy media retention, failed voice cleanup retries, whole-group deletion and server-distinguishable media inspection need the separate rollout checklist.
- The public hosts and production database remain unchanged by this review. Git/source backups are not live database/storage backups, and local iCloud copy checks do not prove cloud sync.

## Review route

Open the [live preview's messages](https://fvck-art-gallery-efr2wo7x6-satur-n.vercel.app/messages), sign in, select a conversation, then use **Chat appearance → device photo → Done**. The microphone next to the composer opens **Voice notes**; recording is an explicit user action and private sending remains gated. **Conversation options** holds save-all, group settings where applicable, and personal clearing. Own-message options remain beside your messages and inactive until approved backend activation. The local server's `/messages` remains an alternative.

Next: review the preview, then approve a disposable-database migration test and real-device recording session using [voice rollout](../VOICE_NOTES_ROLLOUT.md) and [message controls rollout](../MESSAGE_CONTROLS_ROLLOUT.md). Production promotion remains separate. The September 8 10:00 AM America/Phoenix reminder points back to this task.
