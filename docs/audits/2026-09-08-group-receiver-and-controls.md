# Group receiver flow and message-controls activation

September 8, 2026 UTC. This record separates production observations from source changes and remaining checks. The owner explicitly approved restricting direct database writes on messages/memberships, keeping cleanup receipts private, and activating Edit/Remove/Clear. They also requested a group receiver audit, mentions, and publication of the verified update.

## Observed receiver flow

- Reproduced the reported group header showing one member. The owner's existing Group settings showed one active member and two pending invitations; neither invitation was missing.
- Restored the existing Princess Sakura (Test) session through the normal application on its separate deployment origin. No password or session token was extracted. The recipient inbox showed the pending group invitation and the founder's unread direct message.
- Opened that direct conversation through the test account's UI. The founder's conversation subsequently showed **Seen** for the reply. No read watermark was written manually or via SQL. This establishes foreground display under the implemented receipt rule, not comprehension or audio listening.
- Accepted the test account's actual invitation using **Join group**. Both perspectives then showed two members. The other recipient remains pending; no action was taken as that account.
- Joining exposed the group's earlier message, matching the existing membership-wide history policy. Automatic invitation delivery and actual joined membership remain distinct. The revised invitation explains history access before joining.

## Approved migration activated

Applied the exact previously rehearsed `supabase/message-controls.sql` through the signed-in Supabase SQL Editor and its ordinary destructive-query confirmation. SHA-256: `873b622d3f331861b820a0acf1a54ec967508b680816bfae82c828521f72c95c`. The 92-assertion rollback rehearsal is recorded in the [previous activation audit](2026-09-07-playback-and-message-activation.md); this turn's explicit permission resolved its approval gate.

The editor returned success. Read-only postconditions confirmed the capability RPC exists, authenticated direct message UPDATE/DELETE are denied, `last_read_at` column UPDATE remains allowed, direct membership-role UPDATE is denied, and the cleanup receipt table is not client-readable. The installed message-notification function still matches the existing muted-recipient/deduplicated implementation.

Using only a new, clearly labeled test message sent by Princess Sakura:

- Sent into the joined group successfully after privilege normalization.
- Edited through Message options → Edit text → Save edit. The test account showed the edited label; the founder received the updated text and inbox preview.
- Removed through the explicit **Remove for everyone** confirmation. Both accounts showed the tombstone. Only this test message was removed; it cannot be restored through the app.
- Used **Clear chat for me** on Princess Sakura's test account, with its explicit confirmation. Its view became the explained empty state. This advances only the test account's presentation cutoff; it is not erasure or whole-group deletion.

The original founder messages and stored files were not edited or deleted. Real voice-file cleanup, native-device recording, concurrent network connections, and expired-JWT authorization were not retested in these browser actions.

## Receiver repairs and mention activation

The independently reviewed implementation distinguishes member and pending counts, gives the header a direct group-details action, retains matching invitations in search, and improves response feedback/44px targets. Reviews repaired email-token false positives, case-folded name ambiguity, stale Join navigation, duplicate response actions, member lookups beyond the discovery cap, and Activity-label spoofing through message text. The full receiver matrix is in the [master prompt](../prompts/group-chat-receiver-master-prompt.md); comparison sources are in the [research notes](../research/2026-09-08-group-chat-receiver-patterns.md).

Applied `supabase/group-mentions.sql` after a successful **50-mandatory-assertion rollback-only database rehearsal**. Migration SHA-256: `dc91424d0c05658ef49305af3ebf41ff7ed694d2131578b05a971b198873fb56`; rehearsal SHA-256: `c1ff9f8eac4ea3a530a3deab05798b884b7cf6e55dd0f64e54435f9fbadc586e`. Reviewed all relevant existing triggers before running the approved fixture transaction; the rehearsal used collision-checked fixture rows and restored schema/grants/rows by rollback. It did not modify authentication profiles or disable triggers. The normal SQL Editor then returned success for the exact migration. Postconditions confirmed validation/classification functions, allowed message-body INSERT, denied client writes to server markers/notification metadata, retained notification read acknowledgements, and denied client execution of whole-group deletion.

This first slice resolves visible `@username` text against current members at original send, reserves `@everyone` for owners/admins, honors muted recipients, and classifies the existing notification instead of issuing duplicate alerts. The rehearsal covers actual PostgreSQL token parsing, denied outsider/pending/former/anonymous actions, role restrictions, mute, deduplication, edit/remove behavior, immutable rate history, multirow atomicity and grants. Separate-connection concurrency, runtime nondefault isolation, a legacy ambiguous-name fixture and more-than-10-target/49-recipient large fixtures remain untested; their source guards are covered separately.

Actual browser/server checks after activation:

- Sakura, an ordinary member, attempted a clearly labeled `@everyone` test. The server rejected it with the owner/admin-only explanation, and the draft remained. It was replaced with a valid direct mention before sending.
- Sakura sent one labeled `@founder` test. The founder's conversation displayed the highlighted mention, Activity displayed **mentioned you**, and a read-only metadata check found exactly one corresponding person-mention notification. Sakura subsequently saw **Seen by all** through the ordinary UI.
- Sakura muted this group through Conversation options. The owner sent one labeled `@everyone` test; Sakura still received its conversation bubble. The database showed no broadcast notification for that muted receiver. Sakura's setting was then restored through **Unmute notifications** with the confirmed unmuted state. No recipient was silently unmuted to deliver a ping.
- At the actual available browser width of 582px, the group header displayed **2 members · 1 invited**, the message region measured 795px and there was no document overflow. Enter on `@prin` inserted the real current-member token without sending. Existing narrow/44px rendering contracts pass; attempts to apply a 320px/390px browser override did not change the measured viewport, so this turn does **not** claim those viewport or native-keyboard checks.

Stable historical identity tokens across renames, distinct pasted/quoted-token rules, direct-add privacy preferences, invitation expiry, joined-since history, and operating-system push remain separate work. Valid pasted tokens currently follow the same original-send rules as typed tokens. Neither this audit nor the master prompt claims all popular-chat features are implemented.

Development refreshes exposed an empty-history effect-restart gap while retaining the same viewer. Back → inbox → group restored the correct rows, and SQL confirmed the founder's cutoff was unchanged. The actual callback/dependency regression reproduced zero history fetches after the account scope rebound to the same viewer. A reactive account generation now restarts scoped history, capability and read-observation readers without resubscribing auth or weakening stale-response/foreground guards. Tests also cover late pages from a prior account and a prior same-viewer generation, and preserve ordinary same-user auth events without an unnecessary reload. This was not evidence of cross-account clearing or lost stored history; native-device acceptance is still separate.

## Release evidence

The final source suite passes **348/348 automated tests**, including five new lifecycle checks. Independent source review completed. TypeScript, lint, final production build, deployment and backup completion are recorded separately in the [canonical release checklist](https://github.com/trinegod/Fvck-Art-Gallery/issues/1) and the external release manifest after verification. A local iCloud-directory checksum does not prove remote cloud synchronization, and a source/Git backup does not contain live Supabase rows, Auth, private Storage or provider configuration.
