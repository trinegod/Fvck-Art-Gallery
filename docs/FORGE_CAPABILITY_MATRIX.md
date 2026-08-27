# NODEINE Forge Capability Matrix

Status: working product contract
Last updated: August 26, 2026

## Product boundary

NODEINE remains a free social art archive first. Forge is an optional creator system layered onto Worlds, artwork permissions, Threads, Signal Trails, Lineage, and Film Continuity. It must help creators understand, describe, generate, and refine work without silently changing canon or exposing private references.

Forge is three connected modules:

1. **Visual DNA** measures and interprets creator-authorized artwork.
2. **Prompt Foundry** turns those measurements and World rules into portable prompts.
3. **Character Forge** calls an image model for generation and controlled editing.

## Capability matrix

| Capability | User outcome | Technical approach | Stage | Charging posture | Acceptance gate |
| --- | --- | --- | --- | --- | --- |
| Pixel palette | Dominant colors and proportions | Deterministic browser/server image sampling | Building now | Free | Stable output for a fixed image; transparent pixels ignored |
| Tonal profile | Measured luminance, shadows, highlights, contrast, saturation, warmth | Deterministic pixel statistics | Building now | Free | Golden fixtures produce expected bands |
| Composition signal | Explainable focal weight and aspect behavior | Contrast/saturation-weighted pixel centroid | Building now | Free | Labeled as a signal, never as semantic certainty |
| Texture signal | Minimal-to-dense edge detail | Neighbor luminance-gradient sampling | Building now | Free | Deterministic and resolution-normalized |
| Portable prompt | Copyable visual recipe from an owned work | Visual DNA plus artwork metadata | Building now | Free | Includes originality and continuity constraints |
| Semantic visual analysis | Materials, lighting direction, shot type, motifs, subject regions | Structured-output vision model | Next | Small free allowance, then credits if provider-metered | Confidence, model version, and unknown states stored |
| Silhouette extraction | Mask and shape profile for characters/objects | Segmentation model plus shape descriptors | Next | Free analysis allowance | Human-visible mask; correction supported |
| Visual similarity | Actual-pixel Signal Trails and reference recommendations | Versioned embeddings in pgvector | Next | Free discovery | Human-labeled precision benchmark beats metadata baseline |
| World Pack | Creator-selected references and locked/flexible rules | Permissioned World-scoped profile | Next | Free setup | No cross-World leakage; owner controls inclusion |
| Prompt adapters | Recipes formatted for external generators | Provider-specific template adapters | Next | Free or plan benefit | Universal prompt always available; adapters versioned |
| New image generation | Original World-consistent concepts | Hosted premium image-generation API | Benchmark before release | Forge credits | World fit and quality approved on diverse golden Worlds |
| Guided variation | New pose, outfit, age, environment, or role | Reference-conditioned generation/edit | Benchmark before release | Forge credits | Locked traits survive agreed comparison set |
| AI critique | Concrete improvement suggestions before editing | Visual analysis against creator intent and World DNA | Benchmark before release | Included with paid operation | Suggestions cite visible evidence and do not mutate work |
| Precision remove/replace | Change one selected object and preserve everything else | User/AI mask, inpainting, original-pixel compositing outside mask | Benchmark before release | Forge credits | Pixels outside protected mask remain identical |
| Identity lock | Preserve an approved face/body across revisions | Master reference pack, high-fidelity edit, drift scoring | Research | Higher-credit operation | Human review passes portrait/turnaround/action benchmark |
| World lock | Prevent palette/material/motif drift | World DNA constraints plus post-generation comparison | Research | Included with generation | Drift is surfaced; it is never silently accepted |
| Upscale/detail recovery | Final delivery image after design approval | Provider upscale/edit or dedicated restoration model | Research | Forge credits | Detail improves without identity or composition drift |
| Version lineage | Compare, branch, revert, and canonize revisions | Immutable assets plus parent/child lineage records | Next | Free history; storage policy later | Original is never overwritten; provenance remains visible |
| Film continuity | Detect visual drift across shots | Keyframe sampling, shot profiles, character/wardrobe comparison | Later | Creator/Studio plan | Flags are explainable and dismissible |
| Video generation/editing | Generate or revise moving scenes | Separate metered video provider | Later | High-cost credits | Cost, latency, consent, continuity, and moderation proven |
| Browser/on-device models | Private preview analysis without server inference | WebGPU/WASM small models | Research | Free | Graceful fallback and acceptable download/performance |
| Creator-trained adapters | Stronger consistency for opted-in Worlds | Isolated training/adapters on authorized datasets | Research | Studio plan | Explicit consent, deletion path, isolation, provenance |

## First tracer slice

The first production slice intentionally performs no paid model calls:

- Signed-in creators choose one of their own image works.
- The browser downsamples the image for analysis and keeps pixel processing local.
- Visual DNA reports measured palette, tonal behavior, composition signal, and texture signal.
- Prompt Foundry produces an editable, provider-neutral recipe.
- No generated output is published, no canon is changed, and no credits are consumed.

This slice proves the browser boundary, deterministic analysis contract, creator-owned source selection, prompt portability, responsive interface, and test seam needed by later AI work.

## Monetization architecture

### Free product promise

Browsing, publishing artwork, Worlds, profiles, social activity, saves, Threads, public Lineage, basic Visual DNA, and the universal Prompt Foundry recipe should remain useful without payment. Paid AI creation must not degrade the archive into a paywall.

### Forge Credits

Expose understandable **Forge Credits**, not provider tokens. Different operations may consume different credit weights because their real costs differ:

- deterministic browser analysis: zero credits;
- basic prompt recipe: zero credits;
- hosted semantic analysis: low weight;
- image generation or variation: medium weight;
- precision edit/upscale: operation-dependent;
- video or training: high weight.

Do not set prices until production benchmarks measure provider cost, retries, storage, moderation, payment fees, support load, and target margin. Credits should communicate the exact estimated charge before a creator confirms an operation.

### Ledger contract

The future credit ledger must be server-authoritative and append-only:

1. Create a short-lived, server-issued quote containing operation, provider/model, quality, resolution, output and reference counts, catalog version, maximum charge, and expiry.
2. Atomically reserve the quoted maximum with a unique idempotency key before dispatch, preventing a negative available balance.
3. Persist the provider request fingerprint and advance a recoverable job through `reserved → dispatched → provider_succeeded → asset_stored → settled`.
4. Treat timeouts as an unknown outcome that needs reconciliation. Never blindly retry an operation that may have succeeded at the provider.
5. Settle only delivered output, or release the reservation if failure occurred before dispatch. A refund is a separate journal event, not a renamed release.
6. Record provider, model snapshot, operation, input count, output asset, quote, and originating credit bucket.
7. Never put provider keys, balance mutation, price calculation, or trusted job-state transitions in the browser.

The journal needs explicit `purchase`, `grant`, `reserve`, `settle`, `release`, `expiry`, `refund`, `chargeback`, and audited `adjustment` entries. Purchased, subscription, promotional, and manual-adjustment credits remain separate buckets with source linkage, consumption priority, refund destination, and independently reviewed expiration rules. Promotional credits are noncash and nontransferable; purchased-credit expiration requires legal review.

### Failure and spend controls

- Failure before provider dispatch: fully release the reservation.
- Moderation rejection: disclose the charging rule before confirmation.
- Provider timeout or unknown state: hold for reconciliation using the provider result ID.
- Partial output: charge only the documented deliverable.
- Provider success plus storage failure: recover from the persisted provider result rather than generating again.
- User cancellation after dispatch and subjective-quality rerolls: use explicit product policies, not the technical-failure path.
- Refunds restore the originating bucket and its original expiry conditions.
- Enforce per-operation, daily, monthly, concurrent, and global provider-budget ceilings with alerts and model/provider kill switches.
- Verify payment webhooks, restrict administrative adjustments, and defend promotional allowances against farming and chargebacks.

Monthly allocations, one-time packs, refunds, taxes, stored-value treatment, and regional consumer rules require legal and accounting review. No live billing is part of the first slice.

## Rights, privacy, and safety gates

- Private references stay private and are never placed into another creator's World Pack.
- Full prompt export is available for owned work; other creators must explicitly opt into remix/prompt permissions.
- Every generated or edited asset starts as a private draft.
- Store independent creator permissions for analysis, prompt export, generation reference, public remix, and adapter training; a single rights checkbox is not enough.
- Provider keys remain server-side, and output metadata records the provider/model version.
- Document each provider's retention, training, deletion, subprocessors, and data-region behavior before sending private references.
- Recognizable-person and minor-safety rules, likeness consent, output licensing, and provenance are release gates.
- Semantic model output is untrusted input: validate it against a bounded schema.
- Generation requires rate limits, moderation, abuse reporting, and spend limits.
- Deleting a private draft must include a documented asset and metadata deletion path. Adapter deletion must also cover datasets, embeddings, and model artifacts.

## Quality benchmark

Character Forge does not ship merely because it can return an image. The release benchmark must cover several visually distinct creator-owned Worlds—not only Ashigara or Cyber X—and test:

- one original character that fits each World without copying a source subject;
- portrait, full-body, turnaround, and action continuity;
- one targeted remove/replace with pixel-identical protected regions;
- one lighting or detail refinement with identity lock;
- creator rating for quality, World fit, originality, and usefulness;
- model/provider cost and retry rate.

The generation backend remains replaceable until a provider passes this benchmark.

## Recovery and feature controls

- Browser analysis can be disabled independently from hosted semantic analysis.
- Prompt Foundry can remain available if image generation is disabled.
- Each provider route requires a kill switch and per-user spend ceiling.
- Immutable originals and parent links make refinement reversible.
- Schema/model versions allow Visual DNA profiles to be reprocessed without corrupting lineage.
