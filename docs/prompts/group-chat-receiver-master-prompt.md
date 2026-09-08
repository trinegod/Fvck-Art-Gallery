# NODEINE group-chat receiver master prompt

Use this prompt when diagnosing, implementing, or auditing group invitations, membership, mentions, and receiver-visible outcomes. It is a reusable execution checklist, not permission to mutate production or a claim that every listed feature exists.

**Current V1 boundary (September 8):** the implemented mention slice resolves username text against current accepted members at original send. It does not persist stable-ID mention tokens across renames or distinguish valid pasted/quoted tokens from typed ones. Those stronger policies below are future audit/design targets, not completed capabilities. Consult [current group capabilities](../GROUP_CHAT.md) and [release evidence](../audits/2026-09-08-group-receiver-and-controls.md) before assigning work.

## Objective and authority

Make a group creator's action and every recipient's actual experience agree. The motivating case is **The District** showing one member after its owner selected two invitees. Determine whether this is correct pending-invitation state, a discovery problem, or a failed transition before changing data or counts.

Follow the current user's authorized mode: diagnosis/audit means read-only; implementation means bounded code changes and safe fixture verification. Use explicitly designated consenting test accounts and a dedicated test conversation for mutating tests. The real District, its recipients, existing messages, stored media, and invitations are not disposable fixtures. A previous message-controls migration approval does not authorize new membership, history, mention, or notification migrations. Production writes require current authorization for the specific operation and targets.

## Execution sequence

1. **Establish the baseline.** Read `AGENTS.md`, `DESIGN.md`, `docs/design/ux-review-playbook.md`, and relevant installed Next.js guides before UI/code work. Inspect the current invitation RPCs, membership/message RLS, receiver UI, notification generation, and deployed capabilities. Consult [the primary-source comparison](../research/2026-09-08-group-chat-receiver-patterns.md) when deciding invitation, history, or mention behavior. Record the branch/commit, route, environment, account roles, actual member rows, and separate invitation states without exporting private message bodies or credentials. Complete when source capability, deployed capability, and observed UI are separately identified.
2. **Lock the behavior contract.** Record the selected joining model, who can invite/add, history exposure, mention permissions, mute policy, and notification surface. Keep pending invitations distinct from joined membership. The source baseline creates owner membership plus pending invitations; acceptance creates membership, and membership-wide message RLS exposes earlier history. Re-inspect rather than assuming this snapshot remains current. Complete when every policy below has an explicit supported behavior or a named unresolved decision.
3. **Implement only the authorized slice.** Reuse the existing direct/group conversation shell, composer, scoped requests, invitation RPCs, and account boundaries. For a repair, reproduce the receiver failure before changing it. For new mentions, confirm the public test boundaries, then cover persistence and receiver outcomes with real client interfaces and mocked transport or an authorized isolated database. Complete when the changed slice has safe evidence and unrelated user work is preserved.
4. **Run the scenario matrix.** Give every row a result: `pass`, `fail`, `not implemented`, or `not tested`, with evidence and reason. Exercise both creator and receiver perspectives; rendering a control is not proof its action succeeds. A blocked live check does not justify impersonating a recipient or broadening access.
5. **Report and gate release.** Summarize behavior actually delivered, concrete failures, migrations/deployment status, and remaining device/backend checks. Update the feature's existing audit/rollout record. Complete only when required scenarios have evidence or explicit outstanding boundaries; backlog entries stay backlog.

## Policy checklist

- **Membership:** In invitation mode, owner A plus pending B/C means one member and two invites. Successful acceptance adds exactly one member; decline/cancel changes only the invitation. Automatic delivery of an invitation is different from automatic membership. Direct-add requires an explicit authorized product contract, truthful receiver disclosure, and an exit/recovery path.
- **History:** Verify exactly which messages and attachments a pending, newly joined, departed, or removed person may read. If membership grants prior history, disclose this before joining/adding. Enforce any future joined-since/history-sharing restriction at server/storage boundaries, not only in rendered lists.
- **Mentions:** `@person` selects a current member by stable ID. Disambiguate duplicate names and preserve identity across renames. Server validation controls mention targets and `@everyone` permissions at send time. Define edit/retry behavior and deduplicate ordinary-message plus mention notifications. A visible mention must correspond to actual intended metadata; user-supplied markup remains inert text unless safely rendered.
- **Receiver attention:** Specify whether a mute suppresses mentions; the safe proposed default is suppression. Separate in-app Activity, unread counts, mention highlighting, OS notifications, and Seen. OS push needs its own verified delivery path. Seen indicates foreground display under the implemented rules, not that text was understood or audio was played.
- **Privacy lifecycle:** Account/conversation changes, logout, unmount, and delayed network responses cannot commit old private state. Pending invitees receive only the approved invitation summary, not private history, message-attachment URLs, other invitees' private details, or unsolicited mention notifications.

## Receiver scenario matrix

Use A as owner/admin, B as intended receiver, C as a second receiver, and D as an unrelated account. Run membership-changing cases in separate fixtures or reset through an explicitly approved fixture workflow; do not recycle real user history.

| Case | Required observable result |
| --- | --- |
| A creates a group with B and C | Owner sees truthful accepted-member and pending-invite counts. B/C each discover one invitation without a manual reminder from A. Verify online realtime and offline-then-reopen separately. |
| B is pending; D knows the conversation URL | Both are denied unauthorized history/send/media access. B can see only the approved invite summary and response controls; D cannot enumerate invitees or private group details. |
| B accepts | Server confirmation precedes success UI. B reaches the correct conversation with expected history disclosure and composer access. A/B agree on membership/counts; C remains pending. |
| C declines, or A cancels C's invitation | C is not added. The invite disappears or gains the correct final status after confirmation. Reopening a stale invite cannot join accidentally. |
| Duplicate accept, accept versus cancel, or lost response | At most one membership exists. Reconcile authoritative state before claiming success/failure; retry cannot create duplicate membership or notifications. Preserve useful error and retry paths. |
| Owner explicitly chooses supported direct-add mode | Test only the approved policy. Count actual memberships, deliver a truthful receiver notice, disclose old-history access, preserve receiver privacy controls and leave/report recovery. If mode is absent, mark not implemented. |
| B joins after earlier text/artwork/photo/video/voice messages | Authorized history matches the policy for every type, pagination, signed URL, reload, and deep link. Fetching older rows does not mark unseen content as read. |
| B receives a new message | Test foreground at latest, foreground reading older history, hidden tab, unfocused window, and offline reconnect. Preserve reading position; unread/Seen states reflect the actual observation boundary, not only fetch completion. |
| A selects `@B` | Only accepted B is an eligible target; C-pending and D are excluded. B sees a distinct accessible mention and the defined notification outcome. Other members see readable text without a false direct-mention notification. |
| Similar names, rename, self-mention, pasted `@text`, email, quoted text | Identity and notification targets remain correct; no display-name collision, HTML injection, phantom ping, or self-notification. Unsupported syntax remains ordinary text. |
| A sends `@everyone`; a normal member tries | The server enforces the chosen role policy and current membership. Each eligible recipient receives at most one defined notification; outsiders, pending/departed users, and the sender are excluded. |
| B mutes before ordinary / direct-mention / everyone messages | Each case follows the documented mute policy without erasing unread history. Unmute affects future notifications; failed/unknown setting writes do not falsely confirm state. |
| Mention send retries, text is edited, or message is removed | No duplicate fan-out or unintended re-ping. Stored and mounted notification previews do not retain removed text or disclose post-departure edits. Confirmed tombstones survive stale history responses; failed cleanup is reported honestly. |
| B leaves or is removed during loading/sending/mention selection | Subsequent server access and notification eligibility follow membership policy. Old pending responses cannot restore a private pane or perform actions under another account. |
| B switches account/chat during invite response, loading, or notification refresh | The new session receives no old member list, success/error toast, navigation, draft, signed media, or count update. The original operation's unknown outcome is reconciled only in its proper scope. |
| Phone, keyboard, and assistive technology | Test 320px/390px, desktop, short landscape, enlarged text, reduced motion, keyboard-only navigation, and labeled 44px controls. Join/Decline, mention selection, cancellation, feedback, and focus restoration remain reachable. Mark physical-device keyboard/push checks separately from browser simulation. |

## Completion record

For each tested row record: scenario, test identity/role labels, environment/build, route, device/viewport, action, expected state, observed state, persistence evidence, notification effect, and remaining uncertainty. Use sanitized IDs only where needed; keep credentials, signed URLs, and private contents out of reports.

The handoff must distinguish **implemented locally**, **tests passing**, **migration applied**, **deployed**, and **observed by the receiver**. List `@person`, `@everyone`, direct-add privacy preferences, invitation expiry/reminders, restricted history, and OS push as **not implemented / not tested** wherever that is the actual state. This prompt defines checks, not blanket authorization or a promise that those features are already available.
