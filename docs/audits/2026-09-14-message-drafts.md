# Conversation drafts — September 14, 2026

## Scope and completion

The owner approved a small “pick up where you left off” upgrade: account-isolated text drafts during the current open app session and a quiet inbox Draft indicator. No new global navigation, database tables, cloud persistence, or audio retention.

Completion: type in a direct/group conversation, navigate away, return and find the exact unfinished text. Sending consumes only the confirmed revision. Erasing the field discards it; refresh, closing the tab, logout, and account changes reset the memory-only state. Client-side navigation away from Messages retains it through the root provider.

## Implementation boundaries

- `lib/message-drafts.ts`: per-app instance, immutable subscription snapshots, auth generation, destination-scoped pending lock, and revision-checked one-shot completion.
- `app/components/message-drafts-provider.tsx`: root client lifetime and auth observation even when Messages is unmounted. No shared server singleton, local/session storage, IndexedDB, telemetry, or draft upload.
- Messages reads/writes the active account/conversation entry. Navigation still releases audio and contextual UI. A keyed input prevents mention/caret state crossing chats.
- Confirmed media captions use the same revision boundary. Failed or unconfirmed outcomes preserve text. This does not add exactly-once server delivery: after an unknown result, check history before manually retrying.
- Draft previews retain the current inbox ordering and received-message timestamp; they do not simulate new incoming activity. Unread/mute indicators remain separate. Whitespace-only text is retained in the composer but does not display a Draft label.

## Observed checks

- 446 automated tests passed, including model isolation, auth refresh/logout/account switches, same-account re-login, text/newline/Chinese preservation, edits during sends, edits back to identical text, pending navigation locks, caption completion, unknown/error retention, safe escaped previews, independent app instances, and real production send/auth callback integration.
- TypeScript passed. Lint: zero errors; five existing warnings outside this feature (four Studio image warnings and one unused error binding in message actions).
- Signed-in local browser at 582 × 922: separate group/direct drafts restored through Back to inbox and selecting another conversation. Chinese characters, emoji and line breaks retained. No document-level horizontal overflow (582px document width).
- Navigated Messages → Explore → You → Inbox through real links. Both drafts survived the Messages route unmount/remount.
- Normal keyboard Select All → Backspace cleared the unsent group draft and disabled Send. This used keyboard interaction because the browser automation's empty-string fill did not clear its textarea; no application workaround was added.
- A full document reload of the same signed-in conversation cleared a newly typed synthetic draft, as the memory-only scope promises. No test drafts remain in the reviewed tab.
- Sent one explicitly labeled upgrade test to the designated Princess Sakura (Test) conversation through the real UI. It appeared with Sent, and the composer cleared/Send disabled. The group draft remained separate. This is delivery evidence, not a claim of a receiver's Seen acknowledgement.
- Existing 44px composer targets, focused mobile shell, and message-history space are unchanged. Draft notice appears only in the inbox header, not inside conversation space. No new motion.
- Initial local production build could not fetch the existing Google fonts under restricted networking. Network-approved retry passed that stage but Turbopack hit a local port-binding permission restriction. Hosted build verification is recorded separately after publishing; no bundler/config workaround was made.

## Remaining checks

Physical iOS/Android keyboards, screen-reader announcements, 320/390px and desktop visual measurements, browser back/forward gestures, and actual logout/account-switch UI remain untested for this pass. Auth/history boundaries have executable regression coverage, not a claim of complete physical-device verification. No real audio recording, profile edit, group membership change, or destructive chat cleanup was needed.

## Delivery

This file records source/browser verification, not by itself a completed deployment or remote iCloud sync. Exact Git/deployment/backup results belong to the release checkpoint and its verified manifest. Backups exclude live Supabase data and secrets.
