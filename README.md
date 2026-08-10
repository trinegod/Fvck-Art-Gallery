# NODEINE

**The TRINE Archive — an interactive platform for AI-generated visual worlds.**

NODEINE is a responsive digital art archive built by Steven Adkins. It organizes more than 240 AI-generated works into cinematic collections spanning cyberpunk, fashion, character design, mecha, urban storytelling, and original worldbuilding.

## What this project demonstrates

- Product design and information architecture for a large visual archive
- Responsive UX/UI for collection discovery across desktop and mobile
- A masonry-style gallery with optimized thumbnails and lazy-loaded artwork
- Collection filtering, detailed artwork views, keyboard navigation, and metadata
- Creator profiles with public portfolio routes
- Authenticated artwork comments with row-level security
- An administrative workspace for managing creator profiles, collections, and artwork
- Supabase-backed content with a resilient local fallback when the database is unavailable
- A distinct editorial identity developed under the NODEINE and TRINE visual systems

## Core experience

Visitors can:

- Explore ten themed visual-world collections
- Open individual pieces in an immersive lightbox
- Navigate artwork with buttons or keyboard controls
- View moods, tags, collection context, and creator information
- Read and leave authenticated comments
- Browse public creator galleries

Creators can manage their profile, upload an avatar, organize collections, and edit artwork details through the administrative interface.

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
app/                     Gallery, creator, comments, and admin experiences
public/art/              Full-resolution visual archive
public/thumbs/           Performance-optimized gallery thumbnails
supabase/                Database policies and comment schema
```

## Status

NODEINE is an active creative-technology project combining product thinking, UX/UI, visual storytelling, content systems, and full-stack development.

© Steven Adkins
