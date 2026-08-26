# World Threads v1

World Threads turns NODEINE's Saved/Stash behavior into a creative act: a maker orders 2–12 existing works, explains why each reference follows the last, and publishes a navigable visual lineage without stripping the original artist or world credit.

## Product contract

- The first item is the only `origin`.
- Later items use `palette`, `mood`, `composition`, `character`, `setting`, `motion`, `continuity`, `lore`, or `contrast`.
- A thread can be a private `draft` or `public`.
- Forking is opt-in. A fork begins as a private draft and permanently records its source.
- Every item retains its artwork ID, collection/world, and maker credit. `added_by` records the curator who placed it in the current thread; `forked_from_id` preserves the source path.
- The composer uses Saved/Stash works, with an artwork-detail seed allowed through `/threads/new?artwork=<uuid>`.
- Signal Trails are read-only, deterministic, capped at six, exclude the current work and duplicates, and explain the connection.
- Every published path includes a server-rendered Lineage Map with keyboard-accessible, shareable deep links to each artwork step. Video paths automatically present it as a Film Continuity Map with poster-frame nodes.

## Routes

- `/threads` — server-rendered public gallery
- `/threads/new` — signed-in client composer
- `/threads/[slug]` — public server view with owner-only draft fallback
- `/threads/[slug]/edit` — owner-only client editor
- `/artwork/[id]` — server-ranked Signal Trail plus `Thread it` entry point

Public reads remain server-first and dynamically fresh. Signed-in draft, create, update, and fork operations use the browser's Supabase session so PostgreSQL RLS receives the viewer identity.

## Data and authorization

`supabase/world-threads.sql` owns the persistent contract:

- `world_threads` stores owner, visibility, fork permission, and immutable lineage.
- `world_thread_items` stores ordered artwork relationships, notes, and `added_by` provenance.
- `create_world_thread`, `update_world_thread`, and `fork_world_thread` are atomic RPCs with a restricted search path.
- Deferred constraints enforce 2–12 committed items.
- Table constraints enforce the sole origin at position one, unique artwork, unique position, valid relationships, and text limits.
- RLS allows anonymous/public reads, owner draft reads, and owner-only mutation. v1 deliberately omits end-user thread deletion: immutable descendants and source takedowns require a separate tombstone/moderation workflow. UI visibility is not treated as authorization.

The migration includes a deterministic, conditional Ashigara seed and destructive rollback notes. User-created threads must be exported before rollback.

## Faction proof loop

The implementation follows the learned sequence Direct → Validate → Architect → Enforce → Escalate → Specialize → Prove:

1. Direct: add an explicit creative traversal loop rather than another generic feed.
2. Validate: ship deterministic Signal Trails as the smallest useful traversal experiment.
3. Architect: keep public reads server-first and isolate the thread data contract in `lib/world-threads.ts`.
4. Enforce: put item counts, origins, ownership, visibility, and lineage in PostgreSQL/RLS.
5. Escalate: reserve moderation, collaboration, Collect commerce, and similarity embeddings for separate risk gates.
6. Specialize: use World Threads as NODEINE's signature lineage format.
7. Prove: run unit, type, lint, build, RLS allow/deny, responsive, and production smoke checks.

## Verification

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Required live database cases:

- anonymous: public read allowed; draft read and all writes denied
- owner: own draft/public read and create/update mutation allowed; thread deletion denied in v1
- second user: another owner's draft and mutations denied
- fork: authenticated only, public source only, and `allow_forks = true`
- provenance: a fork keeps `forked_from_id`; each copied item records the forking curator in `added_by`
