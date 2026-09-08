# NODEINE

**The TRINE Archive — an interactive platform for AI-generated visual worlds.**

NODEINE is a responsive digital art archive and creator network built by Steven Adkins. It currently organizes 399 images and short-form videos across 18 cinematic collections spanning Japanese folklore, cyberpunk, fashion, character design, landscapes, urban storytelling, and original worldbuilding.

**Public app:** [Open NODEINE](https://nodeine.vercel.app/feed), on the app host linked from Trinefield. The [original gallery address](https://fvck-art-gallery.vercel.app/feed) is maintained too. Individual Vercel preview URLs are for testing.

## September 8, 2026 — clearer groups, receiver verification and mentions

- Group headers distinguish **members** from **pending invitations** and open group details directly. Invitations arrive automatically; recipients choose **Join group** or **Decline**, with existing-history access explained before joining. The reported one-member group contained two pending invitations, not missing members.
- Verified both perspectives using the designated **Princess Sakura (Test)** account: accepted the real invitation, opened the founder's direct reply and observed **Seen**, then sent, edited, removed one labeled test message and cleared only the test account's view. The other invitee remains pending.
- Type **@** for current-member suggestions. **@everyone** is limited to owners/admins. The server classifies existing in-app Activity notifications, honors personal mute, excludes pending/nonmembers/self, and enforces mention rate limits without duplicate alerts. This first version resolves usernames at original send; it does not preserve historical mention identity through renames or deliver OS push.
- **Edit text**, **Remove for everyone**, and **Clear chat for me** are activated through reviewed permission tightening. Direct client message/role writes and private cleanup-receipt access remain restricted. Whole-group deletion remains disabled, now enforced on the server too.
- The independent audit, 50-assertion mention rollback rehearsal, actual receiver checks and remaining device/concurrency limits are recorded in the [group release audit](docs/audits/2026-09-08-group-receiver-and-controls.md). The [receiver master prompt](docs/prompts/group-chat-receiver-master-prompt.md) captures the broader matrix for future work; it is not a claim that every roadmap feature exists. Deployment and backup completion are tracked in the [release checklist](https://github.com/trinegod/Fvck-Art-Gallery/issues/1).

## Previous checkpoint — September 7 voice seeking and conversation controls

- Latest refinement: a smaller **16px seek handle** retains its 44px-high interaction area. A reproduced replay race is fixed; repeated browser first-tap checks passed, although the owner's intermittent physical-device report still needs retesting. See the [playback and activation audit](docs/audits/2026-09-07-playback-and-message-activation.md).
- Drag the visible waveform handle to a timestamp with a mouse or touch; keyboard seeking is supported too. Seeking a paused note does not start it. A playing note resumes from the chosen position after release.
- Tap the speed label to cycle **1× → 1.5× → 2×** on mobile or desktop. The real audio changes speed; the progress display stays tied to its media clock. The default remains 1×.
- Narrow bubbles and 200% text reflow controls while retaining 44px targets and the aligned, opaque chat palette.
- The latest outgoing message shows **Sent / Seen**; groups show **Seen by N / Seen by all**. New read acknowledgements require foreground, focused, visible message content—not merely loading a background tab. Seen does not prove somebody listened to a voice note.
- **Conversation options → Mute notifications** works for direct and group chats and can be undone there. Muting is personal: messages/unread counts still appear, but future notifications are suppressed for your account. Exact verification and public rollout are tracked in the [chat-controls audit](docs/audits/2026-09-07-seeking-seen-mute.md) and [release checklist](https://github.com/trinegod/Fvck-Art-Gallery/issues/1).
- **Princess Sakura (Test)** was created as a clearly labeled test account and sent the founder the requested test message. Its actual group acceptance and receiver verification followed on September 8, above.
- Own-message editing/removal and personal clearing passed a **92-assertion rollback-only database rehearsal** before the September 8 explicit approval and activation; see [Message controls rollout](docs/MESSAGE_CONTROLS_ROLLOUT.md).
- The [shared UX playbook](docs/design/ux-review-playbook.md#personal-component-library-preference) now records the owner's maintained personal-component-library direction. NODEINE already has project-owned UI primitives; a distributed cross-project registry/package is not yet built or installed.

## Previous checkpoint — sent waveforms and five-minute voice notes

The owner approved the inline voice direction and requested this public refinement:

- Sent and preview bubbles show a waveform measured from the actual recording, with real playback progress and the current Glacier/Orchid/Ember bubble colors. Analysis is local and lazy; if unavailable, the ordinary seek line still works.
- Playback polish: Play, waveform and duration now share one visual centerline on mobile and desktop. The position marker samples actual media time on animation frames, avoiding sparse-event stepping without changing audio speed. Paused, buffering, hidden and disposed players stop frame work. The owner's optical-alignment preference is saved in the design contract and shared UX playbook.
- Voice notes allow **up to 5 minutes or 4 MiB**. The recorder requests speech-oriented 64 kbit/s encoding; the byte cap remains independent because browsers may encode differently. The client, endpoint and narrow database migration share the new duration boundary.
- The desktop recording cluster is centered and capped at 500px. Its live samples fill a fluid trace instead of occupying a small corner of a screen-wide bar. Narrow-screen and enlarged-text controls remain 44px or larger.
- **Inbox → New group** opens the existing invitation flow. The owner authorized a clearly marked test account with a reserved fake address. Normal signup requires confirmation, and the dashboard currently needs owner sign-in before admin creation; no test account or public account activity has been fabricated.

See the [refinement audit](docs/audits/2026-09-07-voice-waveform-refinement.md), [voice rollout](docs/VOICE_NOTES_ROLLOUT.md), and [GitHub release checklist](https://github.com/trinegod/Fvck-Art-Gallery/issues/1) for observed tests, deployment/backup evidence and remaining physical-phone checks. Source implementation alone does not establish production activation.

## Historical checkpoint — inline voice review

The owner-requested revision removes the voice-note dialog and second Record action. Press the microphone to start immediately; a compact live input-level trace and timer replace the text row. Send finishes and submits the recording; Stop offers optional listen-back. Discard preserves the existing text draft. Playback bubbles use the current outgoing chat palette, with Play/Pause, duration, and a real seek line instead of native browser controls.

- One-minute/4MiB limits and the already activated private delivery backend are unchanged. No new migration or audio provider.
- **New group** is now directly visible in the inbox and opens the existing invitation-based group flow.
- 245 automated tests pass. Actual browser checks use synthetic audio, not the owner's microphone or messages; physical phone recording/delivery still needs review. [Evidence and review status](docs/audits/2026-09-07-inline-voice-review.md), [official messaging references](docs/research/2026-09-07-inline-voice-messaging-references.md).
- At this historical checkpoint the stable public links remained on the preceding release. The owner subsequently authorized the public refinement above; publishing, GitHub and backup evidence remain separate from implementation.

## September 7, 2026 — focused mobile chat and centered loading

### Previous approved release

- Mobile conversations use the full screen without the global brand row, bottom dock or wasted dock padding. Outside conversations, a 54px icon-only dock retains four 44px accessible destinations and unread indicators. Desktop chat uses the available width with a 280–360px inbox column.
- Both **Opening your inbox…** and **Opening your conversation…** center the complete World Aperture/status group in the correct viewport or message panel. Enlarged text reflows without squeezing the message input.
- Incoming group/direct messages preserve your position while reading older content; **Jump to latest** takes you back. Group creation is already available at **You → Inbox → + → Group chat**, and member settings now have safer session handling, 44px controls and recoverable loading errors.
- **Private voice delivery is activated** in the existing Supabase project after 42 rollback-only database assertions and independent post-activation checks. Tap the microphone, **Record voice note → Stop → Preview → Send**. Recording is always explicit, limited to 60 seconds/4 MiB, and access-controlled—not end-to-end encrypted. Real-phone recording/playback, physical Storage and the full concurrent/network-failure matrix still need verification; see [Voice rollout](docs/VOICE_NOTES_ROLLOUT.md).
- Own-message editing/removal and **Clear chat for me** still require their separate migration. Whole-group deletion, live audio rooms and in-app image generation are not activated by this release.
- 186 automated tests pass, with clean TypeScript/build and no lint errors (five existing warnings). [Detailed evidence](docs/audits/2026-09-07-chat-space-and-voice-release.md), [group capabilities](docs/GROUP_CHAT.md), and [deployment/backup checklist](https://github.com/trinegod/Fvck-Art-Gallery/issues/1) separate observed behavior from remaining device checks.

The following review descriptions are historical checkpoints, not the latest activation status.

The review branch now gives an open mobile conversation more space: one contextual header, no global bottom dock, and no empty dock reserve. Back restores the normal inbox navigation; unresolved conversations retain an explicit escape. The desktop split view remains intact.

- At 390×844, the measured message region grows from 518.5px to 717px (about 38%), and the text field from 160px to 210px. Larger-text wrapping and 44px action targets are preserved.
- **Add attachment** groups photo/video and World artwork sharing; the microphone stays visible. Message delivery, private-audio gates, and deletion/editing activation are unchanged.
- The original **World Aperture** and “Opening your inbox…” status are centered together horizontally and vertically in the current viewport. Panel loading remains contained; there is no artificial wait.
- [Verification and limitations](docs/audits/2026-09-07-mobile-chat-space.md). The three self-contained project handoffs are ready for [Trinefield](docs/handoffs/trinefield-motion-prompt.md), [BIAO](docs/handoffs/biao-motion-prompt.md), and [108 Yokai](docs/handoffs/108-yokai-motion-prompt.md). Those other repositories were not changed.

The prior immutable chat preview below remains a historical checkpoint. Use the latest verified review URL recorded in the [GitHub rollout checklist](https://github.com/trinegod/Fvck-Art-Gallery/issues/1) for this follow-up. Stable production links above are not changed by review-branch publication.

## September 7, 2026 — chat expansion review candidate

This is feature-branch work for review, not an announcement that new audio or database capabilities are live on the public links above.

**Phone-ready review:** [Open the chat expansion preview](https://fvck-art-gallery-efr2wo7x6-satur-n.vercel.app/messages) or [browse its feed](https://fvck-art-gallery-efr2wo7x6-satur-n.vercel.app/feed). This immutable preview runs application commit `479c8a5`; conversations require normal NODEINE sign-in. The stable production addresses above remain on the earlier release.

- Chat appearance now has an explicit **Done** action and a device-photo background picker. Photos are resized and re-encoded locally; preferences remain personal to this device, account, and conversation. No background photo is uploaded or sent to another participant.
- Real voice recording, preview, discard, delivery integration, and playback components are implemented. Recording requires an explicit microphone action; private sending is capability-gated until the SQL and real-device/security checks pass.
- Own-text editing, own-message removal (including voice notes), and **Clear chat for me** have server-checked implementations. These controls remain disabled without the new migration. Clearing your view does not delete another member's copy.
- Contextual conversation options keep the header and mobile dock compact. Whole-group deletion is temporarily unavailable in this client while its private-file cleanup protocol is upgraded; leaving a group is separate.
- An original, name-independent **World Aperture** loading mark accompanies actual pending work, with static reduced-motion support and no artificial splash delay.
- Review evidence and activation limits: [Chat expansion audit](docs/audits/2026-09-07-chat-expansion.md), [Voice rollout](docs/VOICE_NOTES_ROLLOUT.md), and [Message controls rollout](docs/MESSAGE_CONTROLS_ROLLOUT.md).
- Separate research—not imported app features: [Elemental Sandbox assessment](docs/research/2026-09-07-elemental-sandbox.md), [logo-reveal review](docs/research/2026-09-07-logo-reveal-review.md), and [UX-laws review](docs/research/2026-09-07-ux-laws-review.md). Live audio rooms and in-app image generation remain unconnected.
- The supplied UX instructions are preserved in a [reusable review playbook](docs/design/ux-review-playbook.md), linked from the repository's agent instructions. The [design-resource assessment](docs/research/2026-09-07-design-resource-index.md) covers the Google Doc's nine linked repositories and one unlinked item; no external skills or packages were installed.

## September 7, 2026 — earlier public appearance and navigation release

- One compact bottom row opens Feed, Explore, Create, and You. Shared desktop navigation uses the same destinations.
- Explore groups discovery, the archive, Threads, and credited World previews; You groups saves, conversations, activity, and the current account.
- Create adds an owner-only Your work index to resume private Thread drafts. Forge revisions are not stored here.
- Audit repairs address stale private state after account changes, individual Activity seen updates, newest-message pagination/read position, cold feed scrolling, browser history, and multi-hop return links.
- The real inbox now has an initial personal-appearance slice: opaque Glacier/Orchid/Ember bubbles, background selection from artwork shared in the active conversation, dimming, hide-artwork, and reset. Preferences are scoped to the viewer and conversation on this device; shared group-wide themes are not implemented yet.
- The authenticated mobile audit fixed conversation height and double-reserved dock spacing, keeping the composer visible on normal and short screens. Temporary appearance choices remain labeled correctly if browser storage is blocked, including when returning to a conversation.
- The approved visual study is preserved on [`codex/chat-visual-study`](https://github.com/trinegod/Fvck-Art-Gallery/tree/codex/chat-visual-study). Its simulated voice notes/rooms were not included in that public release. See the newer review-candidate status above for subsequent voice-note work; shared room-wide themes and live audio remain unimplemented.
- Verification and remaining physical-device checks are recorded in [Repair verification](docs/audits/2026-09-06-repair-verification.md), [Authenticated appearance audit](docs/audits/2026-09-07-chat-release.md), and the [GitHub rollout checklist](https://github.com/trinegod/Fvck-Art-Gallery/issues/1). No new audio service, generation provider, or database migration is enabled by this update. The checklist records deployment completion separately from source verification.

## September 4, 2026 public release

- A cleaner mobile dock keeps Feed fixed and groups destinations under Explore, Create, and You.
- Equally sized, centered section tabs replace the extra arrow. Native horizontal swiping, labeled tap controls, keyboard navigation, and activity indicators remain available.
- Forge clearly distinguishes its working reference analysis and prompt export from planned in-app image generation. Copying a prompt does not transfer its source image to an external generator.
- The release passed 39 automated tests, TypeScript checks, mobile browser verification, and a production build. Lint has no errors; four existing admin image-optimization warnings remain.

Deployment and recovery boundaries are documented in [Release and backup notes](docs/RELEASE_AND_BACKUP.md).

## What this project demonstrates

- Product design and information architecture for a large visual archive
- Responsive UX/UI for collection discovery across desktop and mobile
- A masonry-style gallery with optimized thumbnails and lazy-loaded artwork
- Collection filtering, detailed artwork views, keyboard navigation, and metadata
- Native image and short-form video playback across discovery, collection, World Thread, and Film Continuity Map views
- Creator profiles with public portfolio routes
- Personalized discovery, follows, likes, comments, activity, and private saves
- A connected Feed with For You, Discover, and Following modes, plus World Portals for Gallery, Threads, Film, and Signals
- A compact mobile dock with four accessibly named icon links, keyboard navigation, and activity indicators; secondary destinations live in Explore, Create, and You
- World Threads for arranging 2–12 saved works into credited visual lineages with typed relationships, notes, drafts, public publishing, shareable Lineage Maps, and provenance-preserving forks
- Signal Trails on artwork pages for deterministic, explainable discovery across shared worlds, moods, and visual tags
- A creator-only Forge Lab with browser-local Visual DNA analysis and provider-neutral Prompt Foundry recipes
- Direct and group messaging with realtime delivery, invitations, owner/admin/member roles, private media sharing, moderation controls, and archive-to-chat artwork cards
- Personal chat appearance with opaque bubbles, shared-artwork or locally prepared photo backgrounds, dimming, hide/reset, and Done controls scoped to this device and conversation
- A Bulk Drop Studio for publishing up to 50 images or videos in one batch
- An administrative workspace for managing creator profiles, collections, artwork, and media
- Supabase-backed content with a resilient local fallback when the database is unavailable
- PostgreSQL functions and row-level security that enforce group membership and role permissions at the data layer
- A distinct editorial identity developed under the NODEINE and TRINE visual systems

## Core experience

Visitors can:

- Explore 18 themed visual-world collections containing 399 pieces
- Browse the connected Feed, enter a World or Chronicle, and return to the originating artwork in the feed
- Open individual pieces in an immersive lightbox
- Navigate artwork with buttons or keyboard controls
- View moods, tags, collection context, and creator information
- Discover and filter image or video work, creators, and visual moods
- Save, like, comment on, and share artwork
- Follow explainable Signal Trails from one artwork to another
- Browse public World Threads and inspect the maker and world credit behind every step
- Browse public creator galleries and personalized recommendations

Creators can manage their profile, upload an avatar, organize collections, edit artwork details, publish media in bulk, and build private direct or group conversations. They can also turn saved references into ordered World Threads, keep drafts private, publish them, and allow credited forks without losing source lineage. Forge Lab lets signed-in creators measure palette, tonal behavior, compositional weight, and texture from their own artwork in the browser, then export an editable visual recipe without spending credits or calling an AI provider. Group owners and admins can manage invitations, member roles, avatars, notification settings, reports, and membership. Whole-group deletion is held behind the cleanup safety gate in this review candidate. Conversation members can share archive artwork or privately stored images and videos, then save shared artwork to their personal collection.

## Forge generation status

In-app image generation and editing are not connected yet. The planned integration sends creator-authorized references through a server-side model API, keeps provider credentials out of the browser, and saves outputs as private, versioned drafts. Quality, permission, moderation, and spending controls must be validated before public generation is enabled. See the [Forge capability matrix](docs/FORGE_CAPABILITY_MATRIX.md).

## Technology

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase
- PostgreSQL row-level security
- Responsive image and interaction design

## Run locally

Node.js 20 or newer is recommended.

```bash
npm install
npm run dev
```

Then open the local address printed by Next.js.

## Configuration

Create a local `.env.local` file containing your own Supabase project values:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Environment files, dependencies, build output, private keys, and deployment state are excluded by `.gitignore`. No private credentials should be committed.

For a fresh messaging installation, apply `supabase/messages.sql`, then `supabase/group-chat-expansion.sql`, then `supabase/voice-notes.sql` through an authorized database workflow. Current chat queries select `voice_duration_ms` for all message types, so the baseline voice schema is required even for text-only chats. For the already-activated live project, do not rerun those broad migrations: use the narrow five-minute upgrade and checks documented in [Voice notes rollout](docs/VOICE_NOTES_ROLLOUT.md).

## Validation

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

## Project structure

```text
app/                     Archive, discovery, social, messaging, and admin experiences
app/feed/                Connected Signal Deck with public inventory and social actions
app/worlds/              World Portals with Gallery, Threads, Film, and Signals layers
app/threads/             World Threads gallery, composer, detail, edit, and fork flows
app/forge/               Creator-only Visual DNA and Prompt Foundry foundation
lib/                     Thread contracts, Signal Trail ranking, and Visual DNA analysis
public/art/              Full-resolution visual archive
public/thumbs/           Performance-optimized gallery thumbnails
public/video/            Short-form video archive
supabase/                Database schema, functions, migrations, and RLS policies
tests/                   Deterministic product and validation tests
```

The World Threads v1 product contract, authorization model, and proof checklist are documented in `docs/WORLD_THREADS_V1.md`.

Forge capabilities, quality gates, rights boundaries, and future credit-ledger rules are documented in `docs/FORGE_CAPABILITY_MATRIX.md`.

The connected feed is documented in `docs/FEED_V1.md`. Mobile grouping, interaction rules, and verification are in `docs/MOBILE_NAVIGATION.md`; the shared visual contract is in `DESIGN.md`.

## Curated world imports

- **Ashigara** contains 54 unique character studies. An August 23 master-level duplicate audit confirmed that the current Ibaraki-dōji, Minamoto no Yorimitsu, Sakata no Kintoki, Shuten-dōji, Urabe no Suetake, Usui Sadamitsu, Watanabe no Tsuna, and Yamauba masters already have matching NODEINE derivatives, so none were re-imported.
- **Martyrs** adds five editorial works: Martyrs, Persona, Unfinished, Below, and Evidence.
- **Vessels** adds six portrait-master bonsai scenes, six paired botanical detail studies, Tea Master, and a dedicated hand-and-cup detail.

Import provenance, source hashes, deterministic IDs, and generated asset sizes are recorded in `scripts/nodeine-martyrs-vessels-manifest.json`. The idempotent Supabase content migration is `supabase/import-august-2026-martyrs-vessels.sql`.

## Status

NODEINE is an active creative-technology project combining product thinking, UX/UI, visual storytelling, content systems, and full-stack development.

© Steven Adkins
