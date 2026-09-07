# Voice notes rollout

Status: local recording and preview are available. Sending remains gated until private audio delivery is activated by applying `supabase/voice-notes.sql` and completing the runtime checks below.

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

The request body is read with an exact 5 MiB + 64 KiB cap before multipart parsing; the file is then independently capped at 5 MiB. The endpoint accepts browser recorder MIME values with parameters for `audio/webm` and `audio/mp4`, strips parameters for storage, and confirms respectively an EBML/WebM or `ftyp` MP4 header. It ignores user-provided filenames and generates `conversationId/voice/senderId/uuid.webm|m4a` in the private `conversation-voice-notes` bucket.

`durationMs` is a bounded recorder report (1–60,000ms), stored for UI display. It is **not** server-proven audio duration and must never be used for billing, moderation timing, quota measurement, or a completion claim.

## Migration safeguards

Run [voice-notes.sql](../supabase/voice-notes.sql) after `messages.sql` and `group-chat-expansion.sql`, in one transaction. It adds the `voice` payload option and `voice_duration_ms`, creates the capability RPC, creates the private audio-only bucket (5 MiB), and leaves existing image/video bucket policies untouched.

The migration's `before insert` trigger checks that a voice message uses a path for its authenticated sender and conversation, has a matching sender-owned object in that bucket, and matches the object MIME/size metadata. It overwrites caller-supplied voice-message `created_at` with server time, serializes a sender's inserts with an advisory transaction lock, and limits that sender to six accepted voice messages per rolling minute.

The route creates a message UUID before inserting. On a confirmed database rejection, it cleans up only its own freshly generated uploaded path with the caller-scoped authenticated client. On a transport failure or lost insert response, it first reconciles by that message UUID and generated attachment path; if it still cannot establish the result, it preserves the private object and returns an explicit uncertain-delivery outcome rather than claiming the note was not sent. Bucket RLS separately permits members to read, only the sender to create their own path, and the owner or a conversation manager to delete.

## Required runtime and security tests before enabling

1. Apply the SQL to a disposable Supabase project, then verify `GET` reports migration-pending before it is applied and enabled afterward for a real member only.
2. Exercise POST with real bearer tokens for a member, a non-member, an expired token, malformed multipart, absent/lying `Content-Length`, a body over the exact cap, a file over 5 MiB, and each supported recorder output (Chromium WebM and Safari MP4).
3. Verify storage RLS directly with the publishable key: members can read only their conversation, a sender cannot upload under another sender's path, a member cannot delete another sender's object, and an owner/admin can delete it.
4. Send seven simultaneous voice-message inserts from one sender and confirm exactly six succeed; verify client-supplied historical `created_at` cannot bypass the window.
5. Force a confirmed messages insert rejection after a successful upload and verify the generated private object is removed. Separately simulate a response loss after a committed insert: reconciliation must return that row and must not delete its object. If reconciliation itself is unavailable, verify the object is preserved and the user sees the uncertain-delivery state. Also simulate cleanup denial/failure and confirm the user receives the safe failure state without a path leak.
6. Validate MIME/header mismatch rejection and inspect WebM and MP4 fixtures with a media tool. The endpoint checks containers, not codecs, tracks, spoken content, or actual duration. Because the storage bucket accepts caller-authenticated uploads as required for the no-service-role route, a malicious caller can directly upload a correctly typed object that bypasses this endpoint's header check before linking it; the trigger still validates path, owner, metadata, cap, membership, and rate. Add a trusted media scanning/transcoding stage or a server-distinguishable upload authority before treating file content as verified.
7. Confirm the messages history query, realtime type union, signed-URL hydration, player controls, retention/deletion policy, reports/moderation workflow, and accessibility labels are updated by the client integration work before release.
