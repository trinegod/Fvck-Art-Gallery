# Release and backup notes

## Public delivery

- GitHub repository: [trinegod/Fvck-Art-Gallery](https://github.com/trinegod/Fvck-Art-Gallery).
- Trinefield's NODEINE button points to `https://nodeine.vercel.app/`; the [direct Feed link](https://nodeine.vercel.app/feed) uses that same host.
- The [original gallery address](https://fvck-art-gallery.vercel.app/feed) is maintained too.
- Vercel projects: `nodeine` and `fvck-art-gallery`, both in the existing `satur-n` team. These are separate deployments, not interchangeable aliases. Publish the same approved commit to both while both public addresses are in use.
- Public release branch: `main`; feature work is reviewed and verified on a `codex/` branch first.
- Use production deployments to update the stable public aliases. An immutable preview URL does not update an existing portfolio link.

The September 4 release adds grouped, centered mobile navigation and clearer Forge availability labels. It does not change Supabase schema or enable paid model calls. Before publishing, verify unit tests, types, lint, a production build, and the mobile interaction flow. After publishing, check both stable public aliases rather than only the preview. Keep the workspace's existing `.vercel` link intact; use an explicit project selection for the second deployment.

## iCloud recovery layers

The existing iCloud Drive folder is `Steven Project Backups`:

- `Current/Documents/NODEINE APP` is the current project mirror. Manual refreshes preserve existing files instead of using destructive deletion.
- `Releases/NODEINE/` holds timestamped release backups. Each release directory contains a tracked-source archive, a self-contained Git bundle, a manifest identifying the commit, and SHA-256 checksums.
- `Full Snapshot - 2026-08-29` is the earlier frozen snapshot and must remain untouched.

Release archives include committed application code, documentation, migrations, and bundled artwork/video assets. Git bundles retain local refs and their reachable history. Environment files, provider keys, dependencies, and build caches are not added to these release packages. Existing private files in the older mirror are not removed or republished.

These are application/repository backups, not exports of live Supabase database rows, private storage, authentication accounts, or Vercel configuration. Those services require their own recovery procedures. Never claim that a local checksum proves a completed iCloud server upload: local backup verification and cloud synchronization are separate checks.

## Restore safely

1. Download the chosen release folder from iCloud Drive and verify its SHA-256 checksums.
2. Clone `repository.bundle` into a new, intentionally chosen directory, or extract `source.tar.gz` to inspect the committed release without Git.
3. Compare the restored commit with `release-manifest.json`; select that commit or its documented release branch.
4. Install dependencies from the lockfile and restore required environment values from an approved secret store or provider dashboard.
5. Inspect the live hosting/database state before deploying or applying any migration. Never overwrite the existing project as the first restore step.
