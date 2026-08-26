# NODEINE Product Roadmap

Updated August 2026. This file is the durable product memory for the launch path and the ideas we want to revisit after the current media expansion.

## Launch target: the next 1–2 weeks

- Ship the responsive web app first; an App Store build is not required for creators to upload.
- Start with an invite-only creator cohort so moderation, storage limits, copyright reporting, and the publishing workflow can be tested safely.
- Open creator onboarding more broadly after upload reliability and moderation controls are proven.

## Bulk Drop Studio

Creators can select a collection and drop up to 50 images or short videos in one batch. Shared metadata applies to the batch, titles can be numbered automatically, and videos receive a generated poster frame. Future iterations should add drag-and-drop reordering, background uploads, resumable transfers, per-item metadata editing, duplicate detection, moderation status, and saved drafts.

## Collect / Buy Art

Add an optional **Collect** action to artwork pages. The first version sends a buyer to the artist's chosen destination instead of making NODEINE the merchant of record.

Supported destinations and sale types:

- Original physical artwork
- Prints and merchandise
- Digital editions or downloads
- Licensing inquiries
- Gallery, Etsy, Shopify, personal store, or other verified listing

Artwork records will eventually need `collect_url`, `sale_type`, `price_label`, `availability`, and an optional disclosure. Creator controls must include link validation and a clear way to mark work sold or unavailable. A later native marketplace phase can add checkout, payouts, commissions, taxes, refunds, fraud controls, shipping, and seller verification after the audience and transaction volume justify that complexity.

## Signature feature: World Threads

Move beyond ordinary boards by letting people connect images and videos into a navigable visual lineage. A World Thread can show palette, mood, composition, setting, character, motion, and story relationships between references while preserving creator credit and Collect links. People can fork a thread into a new interpretation, but the original lineage remains visible.

This creates something more useful than another infinite feed: a living map of how an idea evolves.

### Shipped in v1

- Public World Thread gallery and shareable thread detail pages
- Signed-in composer sourced from Saved/Stash with 2–12 ordered pieces
- Origin, palette, mood, composition, character, setting, motion, lore, and contrast relationships
- Optional curator summary and per-step notes
- Private drafts, public publishing, owner editing, opt-in forks, and permanent source lineage
- Original artwork, world, and maker credit on every step
- Signal Trails on artwork pages as a small, explainable discovery layer using shared world, mood, and tag signals
- Atomic PostgreSQL RPCs, row-level authorization, reproducible SQL, and deterministic unit tests

### Next validation gates

- Measure whether Signal Trail clicks and completed Thread reads improve meaningful archive traversal
- Add Named Stashes only after the save-to-thread loop shows repeat use
- Add collaboration after ownership, moderation, deletion, and notification rules are specified and tested
- Carry verified Collect destinations through threads after link validation and creator controls ship

## Discovery ideas informed by current Pinterest

- Visual vocabulary: derive editable palette, material, silhouette, atmosphere, and composition facets from an image so people can search a vibe without knowing the right words.
- Reference remixes: turn saved pieces into layered, credit-preserving moodboards with creator-controlled remix permission.
- Similarity lens: select an area or subject inside a piece and discover related NODEINE work.
- World recommendations: recommend related collections from a person's saves and follows, with an explanation of why each world was suggested.
- Trend signals: surface emerging aesthetics inside NODEINE without letting popularity erase niche work.

## Later platform work

- Moderation queue, reporting, blocked-file fingerprints, and creator trust levels
- Storage quotas and paid creator tiers
- Rights and AI-generation disclosures
- Collaborative and private reference worlds
- Search indexing, accessibility checks, analytics, backups, and export tools
- Native mobile apps only after the web upload and discovery loops are proven
