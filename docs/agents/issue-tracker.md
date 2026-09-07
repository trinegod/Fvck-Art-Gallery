# Issue tracker: GitHub

Specs, implementation tickets, and testing checklists live in GitHub Issues for
`trinegod/Fvck-Art-Gallery`. Verify the Git remote before an external write.
Use the `gh` CLI with the explicit repository. Search existing issues before creating one.

Read using `gh issue view` and `gh issue list`. Publish approved issue bodies with
`gh issue create --body-file`; use `gh issue edit` for approved revisions and labels.
Read back each external change and retain its URL. Never include credentials,
private chat content, or personal test data in issues.

Publishing to the issue tracker means creating a GitHub issue. Fetching a relevant
ticket means reading the issue and its comments. Present the proposed spec/ticket
breakdown and obtain approval before publishing it. Tracker authorization does
not authorize deployment, billing changes, or production data mutations.

## Pull requests as a triage surface

PRs as a request surface: no.

## Wayfinding

Keep a map issue labeled `wayfinder:map` and typed child issues linked as sub-issues.
Use the feature's `-wayfinding` namespace separately from implementation tickets.
Represent blockers with native GitHub issue dependencies. If unsupported, use
an explicit linked task list and `Blocked by` references. A ticket is ready only
when all blockers are closed. Read the map, linked children, and their blocker
status before claiming work. Record resolved decisions back on the map.
