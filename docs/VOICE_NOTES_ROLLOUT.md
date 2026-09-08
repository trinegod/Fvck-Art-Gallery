# Voice notes rollout

## Sent waveforms and five-minute recordings — September 7 refinement

The owner approved publishing the inline interaction and requested waveform playback, longer notes and a bounded desktop recorder. Recording/client/route validation now allow 1–300,000ms. The complete file stays capped at 4 MiB; the recorder requests 64 kbit/s audio (nominally 2.4 MB for five minutes), but a browser can exceed this hint, so the size limit remains independent. The UI says **Up to 5 minutes or 4 MiB**. Reaching the duration limit stops to review, never auto-sends.

For the existing activated database, apply only [voice-notes-five-minute-limit.sql](../supabase/voice-notes-five-minute-limit.sql) after its [rollback-only rehearsal](../supabase/tests/voice-notes-five-minute-limit.rollback.sql) and preflight checks. It widens the two existing duration CHECK constraints without changing the bucket, policies, grants, validation trigger, rate limit or existing messages. The canonical first-install migration below also uses 300,000ms. Deployment alone does not migrate the database; application/database activation results are recorded in the [refinement audit](audits/2026-09-07-voice-waveform-refinement.md).

Visible sent/preview bubbles lazily derive an RMS waveform from the actual authorized audio source in the browser. No AI or external analysis service receives the file. Analysis is size-bounded, serialized and downsampled; cancel/source changes discard late results. If the browser cannot analyze the file, ordinary playback/seeking remains available with a progress line. The visual waveform is not identity verification, transcription, or trusted server media validation.

## Inline interaction review — September 7 follow-up

Historical checkpoint before the five-minute refinement above: the owner rejected the released dialog-plus-Record interaction. The review candidate started recording on a single microphone action in the actual message composer, showed a real input-level trace and timer, and supported direct Send or optional Stop/listen-back. Sent and preview audio used the selected text-bubble palette with compact accessible playback/seek controls. That UI-only checkpoint retained one-minute/4MiB limits and required no migration; the current five-minute refinement does require the narrow migration above.

The separate [inline-voice audit](audits/2026-09-07-inline-voice-review.md) records source, synthetic browser evidence, and remaining phone/network checks. A published review preview does not promote the public app.

Status, September 7, 2026: the owner explicitly authorized activation. The reviewed migration has been applied to the existing NODEINE Supabase project after a successful rollback rehearsal with42 database assertions plus a coverage guard. A fresh metadata query confirms the capability, voice column, validation trigger, three storage policies, private bucket and4MiB limit; authenticated execution is allowed and anonymous execution is denied. Local recording/preview remain independent of sending. Physical-device recording/playback and the full HTTP/Storage/concurrency matrix below are still outstanding and are not implied by database activation.

## Activation record

The initial project was missing the capability RPC, column and bucket. The rollback rehearsal caught and repaired two real migration defects: PL/pgSQL required parentheses around the CASE expression in the trigger condition; Supabase's explicit default `anon` execution grant required a function-specific revoke in addition to revoking PUBLIC. Source regression checks now cover both.

All42 database assertions then passed under transaction-local anonymous/member/non-member/former-member identities, including read isolation, own-path insertion, sender/path/MIME/size binding, exact4MiB acceptance, excess-size rejection, six sequential messages/seventh denied, timestamp override and ordinary text compatibility. Deletion coverage evaluated the combined policy expressions without bypassing Storage's deletion protection. These were metadata-only objects and synthetic identities, not actual recordings or real users. A separate post-rollback session confirmed no schema or fixtures remained before applying the real migration with2s lock/30s statement timeouts.

The existing backup listing returned no listed backups and PITR disabled; do not describe this as a verified full database backup. Application/iCloud snapshots do not include live chat data. No existing messages or media were deleted by this additive rollout.

Emergency delivery pause: through an authorized database session, replace only `nodeine_voice_notes_available()` with the same signature/security/grants and a `select false` body. Do not drop the voice column, bucket or accepted-message constraint after users have sent notes. Pausing new sends should preserve playback/history and stored data; re-enable only after the issue is resolved.

## Contract

`GET /api/messages/voice?conversationId=<uuid>` requires `Authorization: Bearer <Supabase access token>`. The route verifies the token with Supabase `auth.getUser`, then checks the caller's own conversation membership. It returns:

```json
{ "enabled": true }
```

If private audio delivery is not activated, it instead returns HTTP 200 with `enabled: false` and the user-facing reason `Private audio delivery has not been activated yet.` Authentication, ID, and membership errors use `{ "error": "…" }` with 401, 400, and 403 respectively.

`POST /api/messages/voice` uses multipart fields `conversationId`, `file`, and `durationMs`, with the same Bearer token. It returns:

```json
{ "message": { "id": "…", "message_type": "voice", "voice_duration_ms": 1234 } }
```

The request body is read with an exact 4 MiB + 64 KiB cap before multipart parsing; the file is then independently capped at 4 MiB (4,194,304 bytes). The recorder and browser delivery validation use the same file-limit constant. The endpoint accepts browser recorder MIME values with parameters for `audio/webm` and `audio/mp4`, strips parameters for storage, and confirms respectively an EBML/WebM or `ftyp` MP4 header. It ignores user-provided filenames and generates `conversationId/voice/senderId/uuid.webm|m4a` in the private `conversation-voice-notes` bucket.

Vercel limits a Function request body to 4.5 MB and rejects oversized payloads with HTTP 413 before the route can handle them. The complete app body cap is 4,259,840 bytes, leaving 240,160 bytes below a conservative decimal 4,500,000-byte host limit. The 64 KiB multipart allowance is already included in the app body cap; it is not extra space above the host limit. This replaces the previous 5 MiB file allowance, which could not fit the deployed host's request limit. [Vercel Function request-body limits](https://vercel.com/docs/functions/limitations#request-body-size) (verified September 7, 2026).

`durationMs` is a bounded recorder report (1–300,000ms after the five-minute migration), stored for UI display. It is **not** server-proven audio duration and must never be used for billing, moderation timing, quota measurement, or a completion claim.

## Migration safeguards

The current client requires the baseline voice schema before use: history, inbox and text/artwork/media insert-return queries all select `voice_duration_ms`. Optional TypeScript row values and sending capability gates do not make those queries compatible with a database missing that column. Apply the prerequisites below on a fresh installation; use only the narrow five-minute upgrade above for the existing activated deployment.

Run [voice-notes.sql](../supabase/voice-notes.sql) after `messages.sql` and `group-chat-expansion.sql`, in one transaction. It adds the `voice` payload option and `voice_duration_ms`, creates the capability RPC, creates the private audio-only bucket (4 MiB), and leaves existing image/video bucket policies untouched. The bucket limit and message-trigger metadata check both use 4,194,304 bytes. If an earlier voice migration was already applied, the revised SQL must also be applied through an authorized database workflow to align those stored limits; changing application code alone does not update the database.

The migration's `before insert` trigger checks that a voice message uses a path for its authenticated sender and conversation, has a matching sender-owned object in that bucket, and matches the object MIME/size metadata. It overwrites caller-supplied voice-message `created_at` with server time, serializes a sender's inserts with an advisory transaction lock, and limits that sender to six accepted voice messages per rolling minute.

The route creates a message UUID before inserting. On a confirmed database rejection, it cleans up only its own freshly generated uploaded path with the caller-scoped authenticated client. On a transport failure or lost insert response, it first reconciles by that message UUID and generated attachment path; if it still cannot establish the result, it preserves the private object and returns an explicit uncertain-delivery outcome rather than claiming the note was not sent. Bucket RLS separately permits members to read, only the sender to create their own path, and the owner or a conversation manager to delete.

## Existing-project rollback rehearsal

When an authorized database session is available but no disposable project exists, the following bounded rehearsal can check migration compatibility and database policy behavior without purchasing a project, minting tokens, reading private messages, or committing fixture data. It does not replace the HTTP/Storage/browser tests below.

1. Before changing anything, read metadata for the live `messages` columns and all payload/body constraints, RLS flags, table grants, all applicable `storage.objects` policies, and the signatures/security settings of `is_conversation_member` and `can_manage_conversation`. Inspect the foreign keys and required columns needed to create synthetic profiles/memberships. Inspect triggers on the fixture tables (including `auth.users`, profiles, messages, and storage objects) for external side effects without exposing embedded credentials: an HTTP webhook cannot be undone by SQL rollback. Stop if the prerequisites differ from the reviewed schema or safe fixture isolation is not possible; do not blindly rerun the broader group-chat migration.
2. Use one database connection and one explicit transaction with local short lock and statement timeouts. The migration file already contains `BEGIN` and `COMMIT`: create a reviewed rehearsal copy with **only those top-level wrappers removed**, apply that body between the rehearsal's `BEGIN` and final `ROLLBACK`, and never execute its embedded `COMMIT`. The schema alterations take locks even though the transaction rolls back, so abort on lock contention rather than waiting on production traffic.
3. In that transaction, create randomly identified, collision-checked synthetic profiles/users only as required by the verified foreign keys, a synthetic conversation, an owner, a second member, and a non-member. Use no real users, passwords, access tokens, recordings, or message bodies. Synthetic `storage.objects` rows with explicit owner/MIME/size metadata are sufficient for the database trigger rehearsal; they do not represent physical uploads or prove Storage API behavior.
4. Run assertions under `SET LOCAL ROLE authenticated` with transaction-local `request.jwt.claims` containing only the synthetic `sub` and `role`; assert `current_user` and `auth.uid()` before each role scenario. Test member/non-member reads, own/wrong-sender storage inserts, owner/member/manager deletes, and voice-message sender/path/MIME/size binding. Assert exact-cap acceptance and one-byte-over rejection, six sequential accepted messages followed by a rejected seventh, and overwriting a caller-supplied historical timestamp. Check anonymous execute denial and authenticated null-identity behavior separately. Use savepoints or narrow expected-SQLSTATE exception handling for rejection cases, and fail on unexpected errors. Testing as the privileged migration role alone would not exercise RLS.
5. Finish with `ROLLBACK` on both success and failure. In a fresh session, compare capability function, column, bucket, policy, and synthetic-ID existence against the preflight state to confirm that neither the migration nor fixtures survived. Transaction-local claims simulate database identity only; they do not test Supabase JWT validation, concurrent rate limiting, physical object ownership/MIME enforcement, signed URLs, or playback.
6. Only after the rehearsal passes and remaining release checks are explicitly accounted for, apply the unchanged reviewed migration in its own authorized transaction. This is the actual activation point. Recheck the private bucket, 4 MiB limits, grants/policies, and member-gated endpoint, then test the deployed preview with authorized synthetic/non-private fixtures. Keep unperformed HTTP, concurrency, and physical-device checks visible rather than counting the rehearsal as their completion.

## Required runtime and security tests before enabling

1. Test migration compatibility in a disposable Supabase project or with the existing-project rollback rehearsal above. Separately verify `GET` reports migration-pending before authorized activation and enabled afterward for a real member only; a SQL role simulation does not verify that HTTP contract.
2. Exercise POST with real bearer tokens for a member, a non-member, an expired token, malformed multipart, absent/lying `Content-Length`, a body over the exact cap, a file exactly 4 MiB and one byte over, and each supported recorder output (Chromium WebM and Safari MP4). Repeat the maximum-size valid multipart case on the deployed preview to verify the host path, using a synthetic, non-private audio fixture.
3. Verify storage RLS directly with the publishable key: members can read only their conversation, a sender cannot upload under another sender's path, a member cannot delete another sender's object, and an owner/admin can delete it.
4. Send seven simultaneous voice-message inserts from one sender and confirm exactly six succeed; verify client-supplied historical `created_at` cannot bypass the window.
5. Force a confirmed messages insert rejection after a successful upload and verify the generated private object is removed. Separately simulate a response loss after a committed insert: reconciliation must return that row and must not delete its object. If reconciliation itself is unavailable, verify the object is preserved and the user sees the uncertain-delivery state. Also simulate cleanup denial/failure and confirm the user receives the safe failure state without a path leak.
6. Validate MIME/header mismatch rejection and inspect WebM and MP4 fixtures with a media tool. The endpoint checks containers, not codecs, tracks, spoken content, or actual duration. Because the storage bucket accepts caller-authenticated uploads as required for the no-service-role route, a malicious caller can directly upload a correctly typed object that bypasses this endpoint's header check before linking it; the trigger still validates path, owner, metadata, cap, membership, and rate. Add a trusted media scanning/transcoding stage or a server-distinguishable upload authority before treating file content as verified.
7. Confirm the messages history query, realtime type union, signed-URL hydration, player controls, retention/deletion policy, reports/moderation workflow, and accessibility labels are updated by the client integration work before release.
