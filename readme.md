# NODEINE

**The TRINE Archive — an interactive platform for AI-generated visual worlds.**

NODEINE is a responsive digital art archive and creator network built by Steven Adkins. It currently organizes 399 images and short-form videos across 18 cinematic collections spanning Japanese folklore, cyberpunk, fashion, character design, landscapes, urban storytelling, and original worldbuilding.

## What this project demonstrates

- Product design and information architecture for a large visual archive
- Responsive UX/UI for collection discovery across desktop and mobile
- A masonry-style gallery with optimized thumbnails and lazy-loaded artwork
- Collection filtering, detailed artwork views, keyboard navigation, and metadata
- Native image and short-form video playback across discovery, collection, World Thread, and Film Continuity Map views
- Creator profiles with public portfolio routes
- Personalized discovery, follows, likes, comments, activity, and private saves
- World Threads for arranging 2–12 saved works into credited visual lineages with typed relationships, notes, drafts, public publishing, shareable Lineage Maps, and provenance-preserving forks
- Signal Trails on artwork pages for deterministic, explainable discovery across shared worlds, moods, and visual tags
- Direct and group messaging with realtime delivery, invitations, owner/admin/member roles, private media sharing, moderation controls, and archive-to-chat artwork cards
- A Bulk Drop Studio for publishing up to 50 images or videos in one batch
- An administrative workspace for managing creator profiles, collections, artwork, and media
- Supabase-backed content with a resilient local fallback when the database is unavailable
- PostgreSQL functions and row-level security that enforce group membership and role permissions at the data layer
- A distinct editorial identity developed under the NODEINE and TRINE visual systems

## Core experience

Visitors can:

- Explore 18 themed visual-world collections containing 399 pieces
- Open individual pieces in an immersive lightbox
- Navigate artwork with buttons or keyboard controls
- View moods, tags, collection context, and creator information
- Discover and filter image or video work, creators, and visual moods
- Save, like, comment on, and share artwork
- Follow explainable Signal Trails from one artwork to another
- Browse public World Threads and inspect the maker and world credit behind every step
- Browse public creator galleries and personalized recommendations

Creators can manage their profile, upload an avatar, organize collections, edit artwork details, publish media in bulk, and build private direct or group conversations. They can also turn saved references into ordered World Threads, keep drafts private, publish them, and allow credited forks without losing source lineage. Group owners and admins can manage invitations, member roles, avatars, notification settings, reports, membership, and group deletion. Conversation members can share archive artwork or privately stored images and videos, then save shared artwork to their personal collection.

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
npm run lint
npm run build
```

## Project structure

```text
app/                     Archive, discovery, social, messaging, and admin experiences
app/threads/             World Threads gallery, composer, detail, edit, and fork flows
lib/                     Thread data contracts and deterministic Signal Trail ranking
public/art/              Full-resolution visual archive
public/thumbs/           Performance-optimized gallery thumbnails
public/video/            Short-form video archive
supabase/                Database schema, functions, migrations, and RLS policies
tests/                   Deterministic product and validation tests
```

The World Threads v1 product contract, authorization model, and proof checklist are documented in `docs/WORLD_THREADS_V1.md`.

## Curated world imports

- **Ashigara** contains 54 unique character studies. An August 23 master-level duplicate audit confirmed that the current Ibaraki-dōji, Minamoto no Yorimitsu, Sakata no Kintoki, Shuten-dōji, Urabe no Suetake, Usui Sadamitsu, Watanabe no Tsuna, and Yamauba masters already have matching NODEINE derivatives, so none were re-imported.
- **Martyrs** adds five editorial works: Martyrs, Persona, Unfinished, Below, and Evidence.
- **Vessels** adds six portrait-master bonsai scenes, six paired botanical detail studies, Tea Master, and a dedicated hand-and-cup detail.

Import provenance, source hashes, deterministic IDs, and generated asset sizes are recorded in `scripts/nodeine-martyrs-vessels-manifest.json`. The idempotent Supabase content migration is `supabase/import-august-2026-martyrs-vessels.sql`.

## Status

NODEINE is an active creative-technology project combining product thinking, UX/UI, visual storytelling, content systems, and full-stack development.

© Steven Adkins
