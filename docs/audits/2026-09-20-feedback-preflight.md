# World revisits and pinpoint feedback — preflight

Historical preflight. The owner subsequently approved completing and publishing pinpoint feedback. Current implementation, database activation, authorized Founder QA alternative and release evidence are recorded in [the feature audit](2026-09-20-pinpoint-feedback.md). The proposal/status statements below describe the earlier checkpoint, not the current release.

## Owner intent

Implement quiet New since your last visit and image-location feedback. Normal art stays free of markers. Users must be able to discover that feedback exists and read it in an explicit mode. The owner requested a few clearly labeled demonstration comments by the existing Princess Sakura test account on Aspects of the Moon, plus independent audits.

## Read-only findings

- Existing public comments already produce owner Activity notifications, deduplicated by comment ID. A separate feedback table/notification type is unnecessary.
- Additive nullable normalized pin coordinates can preserve ordinary comments. A paired-null/range constraint is necessary; SQL three-valued logic must not allow half-null coordinates. Reference source/version should prevent a later source replacement from silently relocating old feedback.
- Feedback is image-only in the first proposed slice. Video annotation requires frame/time semantics and is not silently approximated with a poster-image pin.
- Comments appear in canonical artwork, feed, archive, creator and Saved views. All entry points must retain ordinary discussion and discoverable pinned notes. Normal viewing and the existing full-size viewer must not intercept pointer events for feedback.
- The existing comments UI needs stale-account/artwork guards, scoped drafts, logical-attempt IDs, read retry, safe errors and verified delete results in the touched flow. Reuse the existing account lifecycle helpers. Unknown post outcomes must reconcile by the same ID, not regenerate an ID or downgrade to an unpinned comment.
- World display order is editorial, not chronological. The real public artwork endpoint successfully returned a non-null `created_at` in a read-only check on September 20. Its schema/default/immutability still need database inspection. Public inventory currently reads one unpaginated artwork result; newness must never advance from a capped/partial read.
- Proposed small-scope visit history is signed-in, account-and-World-scoped on the current browser/device. First visit silently establishes a baseline; an active visit freezes its delta across layer changes. Newest timestamps and tied IDs should merge monotonically across tabs. No background/prefetch acknowledgement, activity-badge reuse, forced filtering, or guest-history fallback from unresolved authentication.

## Access boundaries

The Supabase SQL Editor opened with the existing owner session. No SQL was executed. No suitable Supabase connector or installed CLI was found; the dashboard is the available normal administration surface.

The original gallery's normal You page showed signed-out state, not Princess Sakura. Previous audits document a separate-origin session but no stored test credential path. No password/token was extracted, no authentication profile was changed, and no demo comment was posted. Restore the normal test-account session before the public demo; do not post as the founder or impersonate the test user via a privileged database write.

## Proposed verification seams (owner confirmation pending)

1. Existing artwork route/discussion flow: feedback entry/exit, discoverable count/list, precise image coordinates, keyboard placement, 320/390px and desktop, reflow and markers absent outside the mode. Failed image, signed-out, empty and failed reads remain usable.
2. Real Supabase client boundary with injected transport: legacy read compatibility, stable attempt-ID reconciliation, draft preservation, account/artwork races, complete pagination and retry semantics.
3. Database constraints and permissions: read live policies/grants/triggers first, then reviewed rollback-only allow/deny assertions. Anonymous and forged-author mutations denied; author-only deletion; finite coordinate pairs; existing ordinary comments and one owner notification retained. Activation requires the normal approved workflow, not just SQL source tests.
4. World lifecycle: first/repeat visit, tied timestamps, ordering/deletion, malformed/blocked storage, same-World layer changes, hidden tab, account changes, cross-tab older writes, failed final page.
5. Two owner-authorized, clearly labeled Sakura demo comments on one chosen Moon image through normal authenticated app UI; confirm their positions/text and the founder-visible feedback indicator. These are test content, not organic testimonials.

## Foundation assessment

| Layer | Classification | Contract and acceptance |
| --- | --- | --- |
| Frontend | Required | Explicit marker mode; responsive, keyboard-operable controls; actual image-content coordinates; browser evidence. |
| API/backend | Affected | Existing comment identity with additive anchor data; retry/unknown/denied and stale-response tests. |
| Database/storage | Required | Additive constraints, unchanged ordinary rows, reviewed migration and rollback rehearsal; no new media uploads. |
| Authentication | Required | Normal authenticated writer; author scope; auth epoch/draft reset and cross-user negatives. |
| Hosting | Affected | Verified builds and authorized publication to both existing hosts; previous release remains rollback target. |
| Compute | Affected | Bounded paginated metadata reads; no AI/GPU/paid provider. |
| CI/version control | Required | Scoped source, tests/types/lint/build, independent review, documented commit/backup after approval. |
| Security/RLS | Required | Inspect live grants/policies/triggers; server-enforced coordinates/author/image validation; no service credentials in client. |
| Rate limiting | Affected | Preserve current comment protections; assess abuse and request bounds without silently claiming a server quota. |
| Caching | Affected | Public art remains public; account history never server-cached/shared; refreshed comment evidence after writes. |
| Load balancing | Not applicable | No new service, worker or shared connection infrastructure. |
| Errors/logs | Affected | Safe user-facing retry, preserve drafts, do not log comment/search bodies or credentials. |
| Recovery | Required | Additive feature disable/rollback, source recovery checkpoint; repository backup is not a live database backup. |

Active advanced gates: existing Next.js server/client route boundaries and Supabase migration/RLS lifecycle. No model integration, new market-validation program, regulated-data determination or external visual-code adoption is part of this slice.

## Status

Initial audit only. The proposed feature behavior and test/tracker choices were presented for confirmation; implementation and live verification have not started. No feature completion or public release is claimed.
