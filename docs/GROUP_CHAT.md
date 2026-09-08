# Group chat: receiver flow and current capabilities

## September 8 receiver and mention update

The header exposes group details and separates active members from invitations. Only owners/admins see exact pending counts; loading/error never masquerades as zero. Matching invitations remain discoverable in inbox search. Join/Decline are labeled 44px actions with saved-response feedback, stale-account/chat guards, and disclosure that joining exposes existing history. Invitations are delivered automatically; membership still requires Join. No direct-add mode was introduced.

Type `@` for accepted-member suggestions; Enter inserts the first suggestion before a later Enter sends. Arrow keys or Tab reach ordinary suggestion buttons; Escape dismisses. The popup floats above the composer instead of permanently reducing history. The active member directory is resolved independently of the general 500-profile discovery limit. Display text stays inert React text, never injected HTML.

`supabase/group-mentions.sql` runs after `message-controls.sql`. The activated server classifies existing message notifications as `person` or `everyone`; Activity labels rely on that metadata, not message text. It keeps one notification per eligible recipient, honors mute, excludes pending/departed/outsider/self recipients, limits `@everyone` to owner/admin, and preserves original-send rate history after edits/removal. Limits: 10 direct targets/message, 49 other recipients/broadcast, 10 mention-bearing messages/minute and 2 broadcasts/minute per sender. An ordinary message is not blocked by those mention quotas. Whole-group deletion is denied server-side pending reviewed cleanup.

V1 matches conservative 3–30-character username tokens against current members at send time. Embedded email/path tokens and ambiguous case-folded usernames do not become accidental targets. Valid pasted tokens can notify just like typed tokens; there is no separate quote parser. Edits do not issue new mentions. Stable-ID historical mention tokens across renames, direct-add privacy preferences, invitation expiry, joined-since history and operating-system push are not implemented.

The real designated receiver joined, read a direct reply with Seen visible to the founder, and verified own-message edit/remove plus personal clear. See the [current audit](audits/2026-09-08-group-receiver-and-controls.md) for the 50-assertion SQL rehearsal, actual live checks, independent review and outstanding boundaries. The [receiver master prompt](prompts/group-chat-receiver-master-prompt.md) defines future scenarios, not blanket production permission.

## Historical September 7 hardening

The earlier update reused group chat without introducing a second implementation or new group schema.

The latest follow-up exposes **Mute notifications** directly in Conversation options for direct and group chats, with a confirmed personal setting, safe retry and an unmute action. Group settings reuse that control. Muted chats still receive messages and show unread counts. The latest outgoing message shows a compact Seen count for eligible current members; opening a hidden tab or loading offscreen messages no longer acknowledges them. [Verification and remaining multi-account checks](audits/2026-09-07-seeking-seen-mute.md).

## Existing path

The inline-voice review adds a visible **New group** shortcut in the inbox, opening this same creation flow directly. The existing **+ → Group chat** path remains available. No group schema or membership rule changes in this revision.

Open **You → Inbox → + → Group chat**, enter a name, and select 2–20 other creators. **Create group** creates an owner membership and sends invitations; selected creators become active members only after accepting. The current UI deliberately requires three intended participants including the owner. The expansion SQL permits one invitee, but the UI keeps its existing two-invitee minimum.

Pending invitations appear in the recipient's inbox with Accept/Decline. Accept opens the group through `/messages?conversation=…`. Group conversations use the same text, artwork, and image/video message paths as direct conversations, with member count and a group avatar in the compact contextual header. Voice remains subject to the separate voice rollout gate.

Within a group, **Conversation options → Group settings** provides:

| Capability | Existing server boundary |
| --- | --- |
| Create group and list/respond to invitations | `create_group_conversation`, `list_my_group_invites`, `respond_to_group_invite` |
| Edit name/avatar | `update_group_details` plus the private `conversation-media` bucket |
| Invite/cancel invitations | `invite_to_group`, `cancel_group_invite` |
| Promote/demote roles and remove members | `set_group_member_role`, `remove_group_member` |
| Personal notifications and reports | `set_conversation_mute`, `report_conversation` |
| Leave, transferring ownership when needed | `leave_group` |

Owners can change roles and manage admins. Admins can edit group details, invite creators, and remove ordinary members, not the owner or other admins. Members can use personal mute, leave, and report controls. Server-side membership/role checks and RLS remain authoritative; hiding a button is not authorization.

Whole-group deletion remains intentionally disabled pending private-file cleanup. The last owner cannot leave until another active member can receive ownership. The settings explanation now states this accurately; no destructive gate was bypassed.

Source: `app/messages/messages-view.tsx`, `app/messages/group-settings-dialog.tsx`, `app/messages/messages-types.ts`, `supabase/messages.sql`, and `supabase/group-chat-expansion.sql`. Apply migrations only through an approved deployment workflow; blindly rerunning the older expansion file can overwrite later voice/message payload constraints.

## What this hardening changes

- Group-settings state is isolated by account, conversation, and each open session. Closing or changing that identity invalidates pending responses before they can repopulate private lists, alter the new dialog, or invoke the old Leave callback against a new conversation. Already submitted server actions are not recalled by closing a dialog.
- Membership/invitation refreshes accept only the latest response. Loading has an accessible status, and a failed read exposes an inline error with **Try again** instead of an apparently empty settings panel. Existing operations continue to use their original RPCs.
- Group settings scroll within the dynamic viewport. Long group names can break naturally; member management actions wrap onto their own mobile row. Close, role, remove, cancel, avatar, mute, leave, save, and report targets meet the 44px design target at the default root size. Save/report labels can wrap at larger text sizes. Report fields have explicit accessible names and the avatar picker exposes keyboard focus.
- The active-chat dock exception, route/history handling, invitation minimum, upload behavior, RLS, database functions, and deletion gate are unchanged by this bounded group-settings patch. Creation-dialog sizing and entry controls are handled separately in the main messages screen.

## Evidence and remaining verification

Seven focused tests execute production callbacks against deferred database responses and render the production settings JSX with ready/loading/error and owner/admin/member fixtures. They cover stale reads, stale completion of all eight mutation callbacks, newest-refresh wins, successful Leave behavior, role-appropriate controls, field names, target-size classes, wrapping hooks, and retry/status text. Real shared buttons, inputs, avatars, and icons are rendered; only the portal boundary is flattened. These are not screenshot, focus-trap, or live database tests.

The main task's September 7 read-only live metadata inspection confirmed all eleven RPCs above with the expected signatures, invitation-based creation, and enabled RLS. This subtask inspected source only; no real group was created and no invitations, messages, reports, membership changes, or database writes were sent as verification.

Release checks still need a controlled multi-account flow: create → receive invitation → accept/decline → shared messages → role restrictions → leave/ownership transfer. Check signed-out and non-member denial, invitation cancellation, private avatar access, permission-change errors, browser Back, 320px/390px and larger-text dialog geometry, focus entry/return, native keyboard/safe areas, and real-device assistive technology. Function existence and static rendering do not establish that entire end-to-end flow.

Private-file cleanup remains a separate follow-up. Avatar saving uploads a private object before updating group details; if the dialog/account scope ends between those stages, the stale guard stops subsequent work, but an already uploaded private object can remain unreferenced. No orphan cleanup was added or performed in this release. A cleanup design needs separately approved account-binding, ownership/path checks, uncertain-upload handling, and tests before enabling additional deletion behavior.
