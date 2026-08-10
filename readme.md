# NODEINE

**The TRINE Archive — an interactive platform for AI-generated visual worlds.**

NODEINE is a responsive digital art archive and creator network built by Steven Adkins. It currently organizes 344 images and short-form videos across 16 cinematic collections spanning Japanese folklore, cyberpunk, fashion, character design, landscapes, urban storytelling, and original worldbuilding.

## What this project demonstrates

- Product design and information architecture for a large visual archive
- Responsive UX/UI for collection discovery across desktop and mobile
- A masonry-style gallery with optimized thumbnails and lazy-loaded artwork
- Collection filtering, detailed artwork views, keyboard navigation, and metadata
- Native image and short-form video playback across discovery and collection views
- Creator profiles with public portfolio routes
- Personalized discovery, follows, likes, comments, activity, and private saves
- Direct and group messaging with realtime delivery, invitations, owner/admin/member roles, private media sharing, moderation controls, and archive-to-chat artwork cards
- A Bulk Drop Studio for publishing up to 50 images or videos in one batch
- An administrative workspace for managing creator profiles, collections, artwork, and media
- Supabase-backed content with a resilient local fallback when the database is unavailable
- PostgreSQL functions and row-level security that enforce group membership and role permissions at the data layer
- A distinct editorial identity developed under the NODEINE and TRINE visual systems

## Core experience

Visitors can:

- Explore 16 themed visual-world collections containing 344 pieces
- Open individual pieces in an immersive lightbox
- Navigate artwork with buttons or keyboard controls
- View moods, tags, collection context, and creator information
- Discover and filter image or video work, creators, and visual moods
- Save, like, comment on, and share artwork
- Browse public creator galleries and personalized recommendations

Creators can manage their profile, upload an avatar, organize collections, edit artwork details, publish media in bulk, and build private direct or group conversations. Group owners and admins can manage invitations, member roles, avatars, notification settings, reports, membership, and group deletion. Conversation members can share archive artwork or privately stored images and videos, then save shared artwork to their personal collection.

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
npm run lint
npm run build
```

## Project structure

```text
app/                     Archive, discovery, social, messaging, and admin experiences
public/art/              Full-resolution visual archive
public/thumbs/           Performance-optimized gallery thumbnails
public/video/            Short-form video archive
supabase/                Database schema, functions, migrations, and RLS policies
```

## Status

NODEINE is an active creative-technology project combining product thinking, UX/UI, visual storytelling, content systems, and full-stack development.

© Steven Adkins
