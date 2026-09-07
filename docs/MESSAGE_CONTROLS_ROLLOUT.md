# Message controls rollout

Status: implementation and mock-based verification only. `supabase/message-controls.sql` has not been applied to production or a disposable database. The client fails closed when its capability RPC is unavailable. Public activation requires approval and the checks below.

## User contract

- Edit only your own, nonremoved text message. Save persists a server timestamp and shows an edited label. An edited message is not a new message.
- Remove only your own message after confirmation. Other members see a tombstone; this cannot recall files, audio, screenshots, or text they already saved or played.
- Clear chat for me advances your server-owned history cutoff. It hides older rows in this client's view, not everyone else's copies, and is not data erasure or an access-control boundary. The empty conversation remains in the inbox and can receive new messages.
- Whole-group deletion is disabled in this review client. The older server RPC is not changed by that UI gate. A safe transaction/outbox and voice/media cleanup protocol must be reviewed before reenabling it.

## Deployment order and data boundaries

1. Start with a disposable copy of the existing messaging schema (`messages.sql`, `group-chat-expansion.sql`).
2. Apply `voice-notes.sql`, then `message-controls.sql`, in their transaction boundaries. The controls migration expects the voice-duration column.
3. Verify `nodeine_message_controls` before enabling UI mutations. Missing optional columns fall back only for known missing-column errors; permission errors are never bypassed. Existing base history queries do not select optional control/audio metadata before capability availability.
4. No service-role key goes to the browser. RPCs enforce authenticated current membership and exact sender ownership; client checks are supplemental. Direct table-update/delete privileges are not added.

The insert trigger rejects forged edit/removal metadata and overwrites message creation time with server time. The edit/remove functions lock the row and generate their own timestamps. Clients preserve PostgreSQL fractional timestamp precision for history ordering, stale-event rejection, and clear cutoffs.

Removal clears the row's attachment/body fields and keeps a tombstone. Only a validated sender-owned object in the dedicated voice bucket can produce a cleanup descriptor. A private RLS/no-client-grants receipt makes removal retries return the same verified descriptor after a lost response. Storage cleanup begins only after a confirmed tombstone; failed cleanup does not undo it. Legacy image/video cleanup is deliberately not inferred from user-supplied old attachment paths. Those objects need a separately verified retention/cleanup process. Receipts are not a background cleanup worker, so failed cleanup may still require operator action.

## Required runtime tests (not completed)

- Member, nonmember, former member, anonymous, expired-session, forged-sender and forged-conversation requests for each RPC.
- Direct UPDATE/DELETE denied; fake insert timestamps/edited/removed metadata rejected or normalized as designed; NULL, blank, oversize, nontext and removed-message edits rejected.
- Concurrent edit/removal, duplicate removal, lost first removal response, missing object and storage denial; verify no unrelated image, voice file or avatar can be deleted via a forged attachment path.
- Two clients observe edit/removal realtime updates without duplicate messages or stale-page resurrection. Preserve submillisecond order and use server cutoffs for paging and newly arriving rows.
- Clearing in one client while another receives messages; response arrives after membership realtime refresh; no stuck progress, lost post-cutoff message, unread rewind or stale-account update.
- Refresh, load older, change account/conversation, reconnect, and sign out while mutations are pending. Ensure unauthorized or uncertain responses never trigger guessed file cleanup.
- Verify receipt-table SELECT/INSERT/UPDATE/DELETE fail with publishable-key clients, and only the authenticated sender with current membership can recover a receipt through the function.
- Audit existing schema policies, triggers, function ownership/search paths and storage policies together; static SQL review alone is not a production authorization test.

No actual private messages or stored files were edited, cleared or deleted to test this implementation.
