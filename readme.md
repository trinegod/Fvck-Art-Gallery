# NODEINE

**The TRINE Archive — an interactive platform for AI-generated visual worlds.**

NODEINE is a responsive digital art archive and creator network built by Steven Adkins. It currently organizes 399 images and short-form videos across 18 cinematic collections spanning Japanese folklore, cyberpunk, fashion, character design, landscapes, urban storytelling, and original worldbuilding.

**Public app:** [Open NODEINE](https://nodeine.vercel.app/feed), on the app host linked from Trinefield. The [original gallery address](https://fvck-art-gallery.vercel.app/feed) is maintained too. Individual Vercel preview URLs are for testing.

## September 4, 2026 release

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
- A mobile dock with an always-accessible Feed and swipeable Explore, Create, and You sections, labeled tap controls, keyboard navigation, and activity indicators
- World Threads for arranging 2–12 saved works into credited visual lineages with typed relationships, notes, drafts, public publishing, shareable Lineage Maps, and provenance-preserving forks
- Signal Trails on artwork pages for deterministic, explainable discovery across shared worlds, moods, and visual tags
- A creator-only Forge Lab with browser-local Visual DNA analysis and provider-neutral Prompt Foundry recipes
- Direct and group messaging with realtime delivery, invitations, owner/admin/member roles, private media sharing, moderation controls, and archive-to-chat artwork cards
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

Creators can manage their profile, upload an avatar, organize collections, edit artwork details, publish media in bulk, and build private direct or group conversations. They can also turn saved references into ordered World Threads, keep drafts private, publish them, and allow credited forks without losing source lineage. Forge Lab lets signed-in creators measure palette, tonal behavior, compositional weight, and texture from their own artwork in the browser, then export an editable visual recipe without spending credits or calling an AI provider. Group owners and admins can manage invitations, member roles, avatars, notification settings, reports, membership, and group deletion. Conversation members can share archive artwork or privately stored images and videos, then save shared artwork to their personal collection.

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
