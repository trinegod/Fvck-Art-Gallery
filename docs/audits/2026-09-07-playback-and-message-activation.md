# Playback refinement and message-control activation review

## Audio evidence

The owner requested a smaller seek circle and an audit of intermittent two-tap playback. Both browser-native thumb styles now use 16px instead of 20px, with centered 8px waveform/progress insets and the unchanged 44px-high native range target. Existing smooth media-clock progress, cancellation, keyboard seeking and 1×/1.5×/2× behavior remain intact.

The controller regression reproduced a specific failure: a queued `ended` event from an earlier run could clear new playback intent and cause the next `playing` event to pause it. The terminal listener now checks the live native paused state, matching the existing stale-pause guard. The test was red before the fix and green afterward. Cold first-play tests already passed before this fix; it is not evidence that every instance of the owner's intermittent device report has the same cause.

Browser checks used the actual player in a temporary, muted, four-minute synthetic WAV fixture. An initial first click and five repeated fresh mounts all produced native `paused=false` with advancing `currentTime` and no media error. Single-tap start and replay from End also passed at an actual 320px viewport; 1440px first playback passed. At both widths the range remained 44px high with zero document overflow. Cursor dragging at phone width moved the paused note to about 197 seconds; Play resumed at the selected position with actual `playbackRate=2`. Screenshot inspection confirmed the smaller graphic. Browser pseudo-element computed styles did not expose the native thumb dimensions, so 16px is verified by production CSS/SSR regression plus visual inspection, not that unreliable readout.

The fixture was removed before production build. No ambient microphone recording, private-audio download, or public synthetic audio upload was used. Physical iOS/Android thumb interaction, audio routing and the owner's intermittent first-tap case remain device checks.

## Backend review and safety boundary

The owner signed into the correct Supabase dashboard. Read-only preflight inspected messaging/storage constraints, table/column grants, RLS policies, and triggered functions including downstream notifications. No nontransactional webhook was present in the inspected path. Existing default grants were broader than the original migration assumed: a table-level membership UPDATE would override a column-only cutoff revoke.

Three reviewed repairs are included in the pending migration:

- Normalize messages, membership, and private cleanup-receipt table/column grants. Retain authenticated message SELECT/INSERT, membership SELECT and direct UPDATE of last_read_at only. Existing group/mute/control mutations use security-definer RPCs. Anonymous access to these private tables is removed.
- Keep clear cutoffs and edit/removal versions monotonic when statements acquire row locks out of start-time order.
- Replace existing exact-message notification quotes with neutral Message edited/Message removed text, including authorized removal retries. Preserve notification identities, read state and counts; do not leak replacement text to former recipients. Mounted Activity already subscribes to notification updates.

The exact migration was rehearsed inside a transaction using collision-checked temporary conversation/message/notification/storage-metadata records and existing profile IDs as read-only identities. No auth/profile records were inserted or changed by the rehearsal; no real chat records were edited, cleared or removed. No Storage API delete, direct storage delete, trigger disabling or protected-workflow bypass occurred. The script enforced exactly **92 assertions**, then returned **rollback_restored=true** with no SQL error. The dashboard displayed the final result, not the earlier per-assertion result set; the enforced count gate and exact script comparison provide the coverage evidence.

- Migration SHA-256: `873b622d3f331861b820a0acf1a54ec967508b680816bfae82c828521f72c95c`.
- Rehearsal SHA-256: `a19d3c106b488e343944783c16cc681a142237efadb0a9e2bff1f4ce79d1e300`.

The subsequent production activation confirmation was rejected by automatic safety review because broad permission changes require more specific owner approval. That rejection was respected; no alternate execution path was attempted. **Production edit/remove/clear activation remains pending**, despite the passing rehearsal. Live multi-client edits/removal/clearing, HTTP/JWT expiry, actual concurrent sessions and physical private-file cleanup remain unverified.

## Authorized test account

Princess Sakura (Test) was created through the dashboard's normal admin flow with a reserved non-deliverable test email and a random private password. No confirmation email was sent and global signup settings were unchanged. Its profile was configured through normal NODEINE UI at `@princess-sakura-test`, with a bio explicitly identifying it as a test account.

The account signed in on a separate app origin without replacing the owner's local session. One requested test message was sent to the creator identified by the UI as NODEINE Founder / @founder and confirmed in both the sender conversation and founder inbox. No invitation or group acceptance is claimed. Test credentials and private user identifiers are not included in source, issues or backup artifacts.

## Shared library direction and verification

The owner's first supplied shadcn post informed a new personal-component-library section in the existing shared UX playbook. Future UI work should reuse/refine project-owned components and test affected consumers, while retaining each project's visual identity. The existing global instruction pointer already reaches this playbook. No external CLI, registry, package or unrelated project was installed or edited.

Independent agents audited audio, SQL authorization, client mutation paths and Activity behavior. The notification-preview issue was repaired in the pending SQL; no additional blocker was reported. **312 app tests passed**, including exact rehearsal/migration synchronization and permission-contract regressions. TypeScript, zero-error lint (five existing warnings), whitespace checks and the optimized webpack production build passed. Public deployment and local iCloud-folder backup are recorded separately in the GitHub release checklist and release manifest after completion; source tests do not establish either.
