# Message controls rollout

Status, September 8 UTC: **activated** after the owner's explicit approval of the table/column permission restrictions. The exact previously rehearsed migration succeeded, and read-only privilege postconditions passed. A clearly labeled test message was sent, edited, and removed through the real test account's UI; personal clearing was also verified on that test account. See the [live receiver/controls audit](audits/2026-09-08-group-receiver-and-controls.md). The [earlier audit](audits/2026-09-07-playback-and-message-activation.md) retains the 92-assertion rollback rehearsal and historical approval gate.

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

## Runtime coverage and remaining checks

The checked-in [rollback rehearsal](../supabase/tests/message-controls.rollback.sql) defaults to NOT_REVIEWED and must not be run without reviewing live trigger side effects and schema. Its exact embedded migration is guarded by a source test. Its successful run required all 92 assertions and the final rollback postcondition. Role/claim simulation tests SQL authorization, not JWT signatures or expiry, actual concurrent connections, physical Storage deletion, or browser realtime delivery. The list below remains the broader rollout checklist; individual SQL cases have evidence in the audit and are not a claim that every item is complete.

- Member, nonmember, former member, anonymous, expired-session, forged-sender and forged-conversation requests for each RPC.
- Direct UPDATE/DELETE denied; fake insert timestamps/edited/removed metadata rejected or normalized as designed; NULL, blank, oversize, nontext and removed-message edits rejected.
- Concurrent edit/removal, duplicate removal, lost first removal response, missing object and storage denial; verify no unrelated image, voice file or avatar can be deleted via a forged attachment path.
- Two clients observe edit/removal realtime updates without duplicate messages or stale-page resurrection. Preserve submillisecond order and use server cutoffs for paging and newly arriving rows.
- Clearing in one client while another receives messages; response arrives after membership realtime refresh; no stuck progress, lost post-cutoff message, unread rewind or stale-account update.
- Refresh, load older, change account/conversation, reconnect, and sign out while mutations are pending. Ensure unauthorized or uncertain responses never trigger guessed file cleanup.
- Verify receipt-table SELECT/INSERT/UPDATE/DELETE fail with publishable-key clients, and only the authenticated sender with current membership can recover a receipt through the function.
- Audit existing schema policies, triggers, function ownership/search paths and storage policies together; static SQL review alone is not a production authorization test.

Only the explicitly labeled test message was edited/removed during the live activation check, and only the designated test account's group view was cleared. Original founder messages and stored files were not edited or deleted. Whole-group deletion and unproven file cleanup remain gated.
