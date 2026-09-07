# Release and backup notes

## Approved production rollout — September 7, 2026

The owner approved promoting the chat expansion and follow-up refinements to both maintained public hosts, not just a review preview. The release includes full-height mobile conversations, a 54px icon-only dock, full-width desktop chat, centered inbox/conversation loading, group-settings hardening and reading-position preservation. 186 automated tests, TypeScript, lint (zero errors/five existing warnings), an optimized build and a bounded independent standards/spec audit passed. See [the current audit](audits/2026-09-07-chat-space-and-voice-release.md).

Private voice delivery has now been activated in the existing Supabase project following 42 rollback-only database assertions; fresh metadata verification confirms the private 4 MiB bucket, authenticated-only capability and validation trigger. A signed-in local chat no longer shows the pending-activation warning. No real recording was captured automatically. Physical-phone send/playback and full HTTP/Storage/concurrent-rate checks remain explicit follow-ups. Message-controls SQL is still separate and unapplied.

The [GitHub rollout checklist](https://github.com/trinegod/Fvck-Art-Gallery/issues/1) records the exact source commit, completed production URLs and backup manifest after verification. A source document cannot establish a future deployment or iCloud server sync. The new release snapshot must include source, normal Git history, handoff prompts and checksums; it excludes secrets and live database/private Storage data. Supabase's backup listing currently returns no listed backups and PITR is disabled, so no full live-chat-data backup is claimed.

The earlier sections below are historical checkpoints superseded by this approved rollout and its verified checklist.

## Focused mobile chat follow-up — September 7, 2026

The same review branch now includes the focused mobile conversation shell, compact attachment menu, viewport-centered World Aperture, and three cross-project handoff prompts. See the [measured audit](audits/2026-09-07-mobile-chat-space.md) for 156 passing tests, build results, independent audit repairs, and real-device limits. The [GitHub rollout checklist](https://github.com/trinegod/Fvck-Art-Gallery/issues/1) records the verified deployment URL and source SHA after publication; the new iCloud release manifest records its exact backup commit and checksums. Do not treat the older immutable preview below as containing this follow-up.

Publishing this branch updates a review preview only. Neither stable production host nor backend capability activation is included. The other-project handoffs are instructions to copy, not evidence those projects were changed.

## Chat expansion preview — September 7, 2026

The owner approved pushing a phone-accessible preview and refreshing the iCloud backup. The review branch is `codex/slim-navigation-audit-repairs`; Vercel's existing GitHub integration deployed application commit `479c8a517d05666a04e7dea73f970a6660562486` successfully. Reused that verified deployment instead of creating a duplicate:

- [Review feed](https://fvck-art-gallery-efr2wo7x6-satur-n.vercel.app/feed)
- [Review chats](https://fvck-art-gallery-efr2wo7x6-satur-n.vercel.app/messages) — normal NODEINE sign-in required
- Vercel build: READY, default Turbopack; deployment metadata matches the application commit and review branch.
- Public signed-out browser check: feed artwork loaded; feed and messages had no document overflow at 390px; the chat route presented the expected sign-in state without a Vercel protection wall.

The stable production aliases and `main` remain on `71bb8fe8b35887922c12b75841ec786fcf384d54`. Subsequent documentation-only commits add the supplied UX guide and design-repository research without changing the code in the reviewed preview. The backup manifest records its own source commit separately from the preview's application commit.

No production voice bucket, message-controls SQL, live-room provider, or model provider has been activated. Review `VOICE_NOTES_ROLLOUT.md`, `MESSAGE_CONTROLS_ROLLOUT.md`, and `audits/2026-09-07-chat-expansion.md` before applying migrations or updating either stable public host. A source checkpoint or GitHub issue update is not a live database backup.

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

Release archives include committed application code, documentation, migrations, and bundled artwork/video assets. Git bundles retain normal branches, tags, remote-tracking refs, HEAD, and their reachable history; internal transient tool refs are excluded. Environment files, provider keys, dependencies, and build caches are not added to these release packages. Existing private files in the older mirror are not removed or republished. Each new manifest records the actual backup verification; this document alone is not evidence that a copy completed.

These are application/repository backups, not exports of live Supabase database rows, private storage, authentication accounts, or Vercel configuration. Those services require their own recovery procedures. Never claim that a local checksum proves a completed iCloud server upload: local backup verification and cloud synchronization are separate checks.

## Restore safely

1. Download the chosen release folder from iCloud Drive and verify its SHA-256 checksums.
2. Clone `repository.bundle` into a new, intentionally chosen directory, or extract `source.tar.gz` to inspect the committed release without Git.
3. Compare the restored commit with `release-manifest.json`; select that commit or its documented release branch.
4. Install dependencies from the lockfile and restore required environment values from an approved secret store or provider dashboard.
5. Inspect the live hosting/database state before deploying or applying any migration. Never overwrite the existing project as the first restore step.
