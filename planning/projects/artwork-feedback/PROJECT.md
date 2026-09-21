# World revisits and pinpoint feedback

**Status:** pinpoint feedback released on both public hosts; owner phone QA remains. World revisit indicators remain a separate future slice.

## Outcome

Show meaningful new artwork on a return to a World, and let people discuss a precise image location in an explicit feedback mode without marking normal artwork viewing.

## Canonical artifacts

- Wayfinder map: not required; two bounded additions to existing routes.
- Approved pinpoint spec / implementation ticket: https://github.com/trinegod/Fvck-Art-Gallery/issues/2. World revisit indicators remain a separate future slice.
- Domain glossary: [CONTEXT.md](../../../CONTEXT.md).
- Preliminary evidence: [preflight](../../../docs/audits/2026-09-20-feedback-preflight.md).
- ADRs: none proposed yet.

## Current frontier

The additive database migration is activated; 29 rollback-only behavior checks and 530 automated tests pass. Both Vercel production builds passed and both public aliases expose the three labeled Founder QA notes on Moon Companions. Sakura's separate-origin session is signed out; no credentials were recovered or account reset performed. Publication evidence and remaining phone/accessibility checks live in the [feature audit](../../../docs/audits/2026-09-20-pinpoint-feedback.md). Recovery verification is recorded in issue #2 after artifacts are copied and checked.

## Agent work

- Root: repository/design review, scope, access checks and integration planning.
- Feedback architecture agent: completed read-only comments/schema/permissions/integration audit.
- World visit agent: completed read-only inventory/lifecycle/privacy audit.
- Independent data/security and UI implementation reviews: completed; resulting fixes and evidence are recorded in the feature audit.
