# Audit repairs and compact navigation — September 6, 2026

## Scope

Approved follow-up to the [read-only audit](2026-09-06-app-audit.md), based on commit `893cfbe2009d9a760a6a00813f61671531f94552`. Three bounded agents repaired account/chat, feed continuity, and private draft access; the main agent integrated navigation, reviewed the cross-cutting changes, and exercised the local browser. The feed agent independently reviewed the account/chat implementation and found three additional races; all were repaired before final verification.

This is a local implementation, not evidence of production deployment or independent usability research. Existing production accounts/content were not seeded, deleted, or modified during testing. No schema, provider, dependency, billing, audio, or theme changes are included.

## Implemented

- One four-link row: Feed / Explore / Create / You. Secondary destinations have real section pages; desktop shares the same links. New Thread loading/access/error screens keep navigation.
- Explore groups search, the archive, Threads, and public credited World previews. Create offers Forge/Publish/New Thread and an owner-only private-draft list with Resume, older pages, and honest access/error states. You groups Saved/Inbox/Activity and resolves the current viewer's profile.
- Activity, Saved, unread counts, and message state invalidate stale asynchronous responses on logout/account change. Thread editing also clears old private state and rejects late saves or loads.
- Individual Activity seen updates consume the lazy database request and report failures. Chat opens the newest 200 messages; older pages use stable timestamp/ID cursors. Read watermarks never advance to browser "now" or beyond a retrieved message.
- Feed observers bind when loaded cards mount, including same-sized mode changes. The URL is authoritative for mode/Back behavior. Deep returns reveal their card and related artwork/Thread response/fork-source links retain feed context.
- Chat review follow-ups: history navigation resets composer busy state; realtime arrivals during loading do not consume an unmounted scroll marker; same-account navigation preserves an attachment's originally authorized conversation while suppressing stale UI updates.
- Next's development badge is hidden because it overlapped Feed at narrow widths. Compile/runtime errors still surface; this setting does not remove production error handling.

## Verification

- `npm test`: **71/71 pass**. Tests include real PostgREST builders against controlled fake network responses, exported UI-independent behavior, and rendered related-link components. Existing ranking, Visual DNA, and Thread rules remain green.
- Temporary actual-component callback reproductions failed before fixes and passed afterwards: stale Activity preview after logout, zero cold-feed observers, wrong mode after Back, and sending state stuck after history navigation. Temporary diagnostic harnesses are not the permanent suite.
- `npm run lint`: zero errors; four pre-existing admin `<img>` optimization warnings remain.
- `npx --no-install tsc --noEmit --incremental false`: passed before final build; build also runs its own TypeScript gate.
- `npx --no-install next build --webpack`: passed, including TypeScript and all 11 static pages. Initial sandbox attempt could not resolve `fonts.googleapis.com`; the network-authorized rerun completed successfully.
- `git diff --check`: passed.

### Browser observations

Local development app, existing session, no live mutation actions:

| Check | Observation |
| --- | --- |
| 390 × 844 | Dock 366 × 70px; all four controls 56px high; no document overflow |
| 320 × 740 | Dock 296 × 70px; no document overflow on sampled Feed/Create/You/Thread editor pages |
| 1280 × 900 | Mobile dock hidden; desktop has Feed, Explore, Create, You; no document overflow on You |
| Feed cold pagination | Scrolling without pressing Load more increased 12 mounted cards to 24 |
| History | Bare `/feed` → Discover → Back restores For you and bare `/feed` |
| Multi-hop deep return | Artwork at feed position 24 → related image → Back to feed retains original ID, reveals original card at 112px below viewport top, and continues loading to 36 cards |
| Create | Existing session reaches the owner-only empty draft state; Forge/Publish/New Thread routes remain explicit; New Thread opens with Create selected and persistent navigation |
| You | Existing viewer profile resolves, with Saved/Inbox/Activity links; small-width profile-card spacing corrected after screenshot review |
| Visual review | Explore/Create/You screenshots inspected; existing graphite/cyan identity retained with lavender Create accents |

The old dock measured 122px; the new 70px dock frees 52px (about 43%). This is a layout measurement, not proof of improved task success.

## Remaining checks and boundaries

- A designated test environment/account should exercise create → private save → leave → resume → edit, account switching, nonzero unread delivery, actual long chats, and storage failure recovery end-to-end. No deployed RLS/storage policy certification is claimed.
- Physical touch/VoiceOver, mobile keyboard overlap, offline failure, translated labels, and OS reduced-motion behavior need device checks. Link semantics and reduced-motion paths exist; that is not equivalent to testing assistive technology.
- Inbox previews/counts retain the existing sampling of 300 recent messages across conversations. The open-conversation history is paginated, but the preview sampling is a separate remaining scaling limitation.
- Logout after an upload has reached storage can leave an unreferenced object. Do not clean it up under a different account; server-side orphan lifecycle handling remains separate work.
- Ordinary navigation does not auto-save unsaved forms. Your work lists saved Thread drafts only, not Forge revisions.
- Discover still has its existing feed-mode vocabulary; this change clarifies its search entry in Explore without rewriting its ranking or terminology.
- Chat artwork themes, voice messages, and a small audio-only live-room pilot remain future work. No microphone permissions or audio costs were introduced.

## Completion notes

Production build passed. The built app is running locally at `http://127.0.0.1:3000/explore`; its Explore page rendered correctly at 1280px with the four desktop destinations and no document overflow. TypeScript and lint were rerun after build artifacts settled and passed (the same four pre-existing lint warnings). Changes are prepared on `codex/slim-navigation-audit-repairs`, not merged into `main`. No public deployment or iCloud backup was performed in this repair pass. GitHub push status is reported separately at handoff.
