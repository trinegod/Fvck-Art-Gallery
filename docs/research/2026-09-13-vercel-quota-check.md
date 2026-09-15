# Vercel Deployment Storage quota check

Research date: 2026-09-13; publication review: 2026-09-14. This is general operational guidance, not a live account-usage or billing report. Private email, billing and usage details are deliberately excluded from this public note. The quota investigation made no deployment, deletion, retention-setting or billing changes.

## Verified application checkpoint

- GitHub main and the review branch matched local application release `4380b66b797abc0822c1522c0803914054ad33ad` when rechecked on September 14. The only uncommitted change was this research note; there was no missing application-code update. The application release adds group About, shared group/personal avatar framing, and snug text bubbles.
- The configured Vercel CLI reported both maintained production deployments Ready on September 14. NODEINE: `dpl_Cj7XJBGyxBSq7F6ncVkhJPfnniQb`; original gallery: `dpl_HPB3wJQfWVZjejNZCTYe9Ejxapcz`. These remain the September 8 application release, not a newly published feature update.
- The September 8 iCloud release package was rechecked on September 14: SHA-256 validation passed for the source archive, complete Git bundle, manifest and UX guidance copy. Local validation is not proof of Apple's remote synchronization or a backup of live Supabase rows/private media.
- A docs-only publication can advance GitHub beyond the application release without implying that app features were previously unsaved. A Git-connected hosting integration may independently build that commit. Inspect the resulting deployment separately; do not infer publication from a successful Git push.

## What the warning measures

Vercel's August 21, 2026 announcement explicitly lists **10 GB included for Hobby teams**. It also says existing teams retain their current pricing for now; that is not a promise that all existing teams are exempt from limits. [Official announcement](https://vercel.com/changelog/deployment-storage-keeps-your-deployments-rollback-ready)

Deployment Storage holds retained build output and static assets; Functions Storage separately measures retained Function bundles in their deployment regions. More deployments, larger output, and longer retention increase usage. These are separate from Blob and build-cache storage. The metric is measured in GB-months using each project's daily maximum, so deleting history does not retroactively erase prior days' measured usage. The last sentence is an inference from Vercel's measurement method. [Deployment Storage](https://vercel.com/docs/deployment-storage)

## Does this stop commits or deployments?

- **Local Git commits and GitHub pushes are separate operations.** Vercel consumes branch pushes to create deployments. A Vercel storage warning does not itself mean that the Git commit or push failed. A push can be stored successfully while its subsequent Vercel deployment fails; this is an architectural inference from the documented integration. Repository-specific rules may independently require successful deployment checks before merging. [Git integration](https://vercel.com/docs/git)
- **A 100% email is not sufficient proof that the site is paused or a new deployment is blocked.** Vercel distinguishes usage alerts from deployment-failure notifications. Inspect the current deployment status, any blocking error, and the production URL. [Notifications](https://vercel.com/docs/notifications)
- **Do not guarantee unlimited continued deployment on Hobby.** The general Hobby guide says exceeding most usage limits requires waiting 30 days before using the affected feature again. However, the Deployment Storage documentation and announcement reviewed here do not specify a storage-specific enforcement threshold, grace period, or whether enforcement blocks new deployments, existing serving, or both. Applying the generic rule as a definite storage-specific shutdown would overstate the evidence. [Hobby plan](https://vercel.com/docs/plans/hobby), [Deployment Storage](https://vercel.com/docs/deployment-storage)

## Safe next steps to approve separately

1. Open the correct team's **Usage → Deployment Storage** and compare projects for both Deployment Storage and Functions Storage over the same last-30-days range. The usage total does not identify individual large files; inspect the largest project's deployment Resources view. [Optimization guide](https://vercel.com/docs/deployment-storage/optimize)
2. Consider a project-specific retention change after choosing the needed rollback/review window. Vercel recommends retention before code changes. Avoid applying a team policy to every project unintentionally. For persistent high usage, investigate large output files and duplicate deployment triggers. [Optimization guide](https://vercel.com/docs/deployment-storage/optimize)
3. Preserve current production and needed rollback releases. Automatic retention exempts deployments with production aliases and also keeps recent deployments, including the last 20 Ready production and last 20 Ready non-production deployments. Hobby defaults are 30 days for every deployment state, but custom policies override defaults. Expiry generally becomes a deletion candidate within 48 hours; after an exemption disappears, reevaluation can take up to 30 days. [Deployment Retention](https://vercel.com/docs/deployment-retention)
4. Delete individual old deployments only after reviewing exact targets and getting authorization. Deleting removes their instant-rollback availability and may break old preview/PR links. Successfully built deleted deployments generally have a 30-day recovery period; cleanup and displayed-usage reduction are not guaranteed to be immediate. [Managing Deployments](https://vercel.com/docs/deployments/managing-deployments), [Deployment Retention](https://vercel.com/docs/deployment-retention)

Research method: the configured agent-reach Exa backend failed its network negotiation; built-in web browsing was used as the fallback. All substantive sources above are Vercel-owned documentation or the official changelog. No community-user claims were used as policy evidence.
