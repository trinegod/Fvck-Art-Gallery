# World revisits and pinpoint feedback

**Status:** pinpoint-feedback implementation and verification; owner explicitly approved completing the full feedback feature and demo on September 20. World revisit indicators remain a separate future slice.

## Outcome

Show meaningful new artwork on a return to a World, and let people discuss a precise image location in an explicit feedback mode without marking normal artwork viewing.

## Canonical artifacts

- Wayfinder map: not required; two bounded additions to existing routes.
- Approved pinpoint spec / implementation ticket: https://github.com/trinegod/Fvck-Art-Gallery/issues/2. World revisit indicators remain a separate future slice.
- Domain glossary: [CONTEXT.md](../../../CONTEXT.md).
- Preliminary evidence: [preflight](../../../docs/audits/2026-09-20-feedback-preflight.md).
- ADRs: none proposed yet.

## Current frontier

Complete the approved image-feedback release through existing Discussion. The additive database migration is activated; 29 rollback-only behavior checks and 530 automated tests pass. Real browser demo notes use the already-signed-in Founder account and explicit QA labels. Sakura's separate-origin session is signed out; no credentials were recovered or account reset performed. Publication evidence and remaining checks live in the [feature audit](../../../docs/audits/2026-09-20-pinpoint-feedback.md).

## Agent work

- Root: repository/design review, scope, access checks and integration planning.
- Feedback architecture agent: completed read-only comments/schema/permissions/integration audit.
- World visit agent: completed read-only inventory/lifecycle/privacy audit.
- Independent data/security and UI implementation reviews: completed; resulting fixes and evidence are recorded in the feature audit.
