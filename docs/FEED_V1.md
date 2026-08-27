# NODEINE Feed v1

## Product contract

Feed v1 turns the three Feed Lab explorations into one connected product:

1. `/feed` is the default discovery stream. It uses the Signal Deck language,
   explains why each piece appears, and exposes real like, save, share, comment,
   World, Chronicle, and Forge actions.
2. `/worlds/[collectionId]` is the World Portal. Its Gallery, Threads, Film, and
   Signals tabs are URL-addressable layers backed by existing content.
3. `/threads/[slug]` remains the canonical Braided Chronicle. Feed and World
   surfaces link into it instead of creating a second lineage system. Its
   Branch Point turns “Enter responses” into public descendant forks with
   source lineage and maker credit intact.

The existing `/` archive remains available as a complete collection browser.
The `/feed-lab` prototype stays on its separate prototype branch and is not a
production dependency.

## User stories

- As a visitor, I can browse a complete visual feed and understand why an item
  was recommended without signing in.
- As a signed-in creator, I can like, save, and comment using the existing
  Supabase-backed controls.
- As any visitor, I can share a durable artwork URL and enter a real World or
  public Chronicle.
- As a World explorer, I can switch layers and receive meaningfully different
  content with honest empty states.
- As an artwork owner, I can hand a selected image to Forge for local Visual DNA
  analysis and prompt construction. This is not presented as image generation.

## Durable route state

- `/feed?mode=for-you|discover|following`
- `/feed?mode=<mode>&signal=<artwork-uuid>#signal-<artwork-uuid>` restores an
  exact feed position after visiting a World, artwork, or Chronicle.
- `/worlds/<collection-uuid>?layer=gallery|threads|film|signals`
- `/threads/<slug>#piece-<artwork-uuid>`
- `/forge?artwork=<artwork-uuid>`

## Acceptance seams

- All production feed inventory comes from the existing public artwork,
  collection, profile, and public World Thread data. Prototype accounts and
  generated Feed Lab assets never enter the production read model.
- Recommendation ranking is deterministic and testable outside React.
- Visible actions are links or working controls; no decorative action buttons.
- Only an opened discussion mounts its comments query.
- Images below the first card are lazy-loaded; videos use `preload="none"`.
- Mobile uses the existing app navigation and 44px minimum action targets.
- Reduced-motion preferences retain usability without relying on animation.
- Empty, missing-environment, signed-out Following, and no-layer-content states
  are explicit.

## 13-layer engineering assessment

| Layer | v1 decision |
| --- | --- |
| Product | One feed, deeper World and Chronicle views; Archive remains distinct. |
| Domain | Artwork belongs to a World; Threads connect artwork; Signals explain discovery. |
| Data | Read existing Supabase tables only; no schema migration is required. |
| Contracts | A pure feed composer accepts inventory plus viewer signals. |
| Server | Server pages build the public read model close to Supabase. |
| Client | One shared auth/signal model drives ranking and optimistic engagement across every visible card. |
| Routing | Mode and World layer are durable URL state. |
| UX | Natural vertical scroll with mixed World/Chronicle interludes. |
| Accessibility | Semantic navigation, headings, labels, focus rings, modal focus management, and live action feedback. |
| Performance | Thumbnail-first images, lazy media, bounded initial batch, one open discussion. |
| Security | Public reads use publishable credentials and existing RLS; mutations reuse audited controls. |
| Observability | Errors surface as bounded UI states; browser QA checks console and failed media. |
| Delivery | Local branch, tests, lint, build, browser QA, then explicit remote/deploy authorization. |

## Deferred

- Cursor-based server pagination for a much larger inventory.
- Pixel-embedding similarity; v1 Signals use declared World, mood, and tag
  metadata and say so plainly.
- A Community layer, until a stable community-content model exists.
- Paid generation and credit charging. Forge v1 remains local analysis and
  prompt construction.
