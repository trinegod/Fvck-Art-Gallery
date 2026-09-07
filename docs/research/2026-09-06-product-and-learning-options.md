# NODEINE: next product and learning options

Date: September 6, 2026. Exploratory research only; no app, branding, hosting, or account changes are authorized by these notes. Recommendations are design hypotheses, not user-research findings.

## What is already here

The repository already implements public Worlds, a connected feed, saved artwork, credited World Threads and film continuity, a three-step welcome tour, grouped mobile navigation, and browser-local Visual DNA / prompt export. Reference-conditioned generation, immutable artwork revisions, and guided creator onboarding remain future work. Sources: `PRODUCT_ROADMAP.md`, `docs/FEED_V1.md`, `docs/WORLD_THREADS_V1.md`, `docs/FORGE_CAPABILITY_MATRIX.md`, `app/components/nodeine-welcome.tsx`.

The roadmap still labels the navigation “implemented locally,” but the September 4–5 release was published to both production hosts. This is a stale documentation label, not evidence that the feature is still preview-only. This exploratory pass does not modify that roadmap.

## Recommendation for the upcoming job-search week

Prioritize an explainable end-to-end creator experience and a real case study, not feature count. NN/g's hiring-research-based portfolio guidance emphasizes the problem, individual contribution, evidence behind decisions, alternatives, constraints, and outcomes—not only final screens. Source: [5 Steps to Creating a UX-Design Portfolio](https://www.nngroup.com/articles/ux-design-portfolios/).

For Steven, show art direction, product decisions, information architecture, and the testing he personally conducted. Describe AI-assisted implementation honestly. Agent QA is not a substitute for interviews with independent people; seeded accounts are not audience growth; automated tests are not proof that a workflow is easy to use.

### Feature options, in suggested order

1. **World Kit:** a creator-owned visual brief inside a World/Forge. Choose a small reference set, write what must stay consistent and what may change, and save an approved palette and notes. Reuse existing image selection and Visual DNA. Unlike an ordinary gallery, this captures intent; unlike current Threads, it is not an ordered narrative. It is useful without generation and supplies a permissioned reference pack later. Validate whether creators can explain and reuse the resulting brief before adding more fields.
2. **Revision comparison:** attach versions to an artwork, compare side by side, annotate the change, and choose the preferred version without overwriting the original. Begin with creator uploads; generation can connect later. Reuse the provenance vocabulary of Threads while keeping an artwork revision distinct from a curated Thread relationship. Requires explicit ownership, storage, deletion, and restore rules.
3. **Guided first creation:** extend the current introductory tour into a task-driven path: create a World, add a first image, then complete one meaningful action such as a World Kit or Thread. Keep it optional and resumable. It should help users accomplish something, not add another layer of promotional slides.
4. **Reference-conditioned image generation:** the larger differentiation bet, already requested in principle. It needs a server-side provider integration, permissioned references, private draft outputs, version history, failure recovery, moderation, and spend controls. Current prompt export is not a hidden generator waiting to be enabled. Scope and benchmark this separately; don't promise delivery or quality parity from a name change.

These ideas live inside existing World/Create surfaces. Do not add another persistent bottom-nav icon for each feature.

## The bottom dock

The user says it still occupies too much space but is acceptable for now. Leave production unchanged. A future test candidate is one labeled row—Feed, Explore, Create, You—with secondary destinations on the selected section's page. The tradeoff is fewer simultaneously visible shortcuts. Test first-action discovery and return navigation before replacing the current swipeable layout; preserve touch targets, keyboard access, safe-area clearance, and predictable behavior.

## Practice loop: learning UX on this real product

- Pick one observable task, such as “save a reusable brief for this World.”
- Sketch two approaches before polishing either.
- Have a small formative group of willing creators try the task without coaching. Three to five sessions are a practical starting scope, not statistically representative proof.
- Record completion, wrong turns, requests for help, and the participant's explanation of what they think happened.
- Fix the clearest failure, then retest. Preserve the rejected design and the reason for changing it.
- Write a short case study with role, constraints, before/after evidence, and honest limitations. Do not invent improvement percentages or describe a hypothesis as a validated result.

This is our proposed learning plan. NN/g's own homepage case study provides a primary example of iterative prototypes and usability testing: [Iterative Design and Prototype Testing](https://www.nngroup.com/articles/case-study-iterative-design-prototyping/).

## The Faction public-material check

Identity was recovered from the August 29 KUA audit: Matt Murphy's **The Faction**, not a new product called Fraction.

- The current [community page](https://mattmurphy.ai/community/) advertises 77 courses across six free member tiers. Foundation covers production fundamentals; Launchpad addresses pricing, clients, and positioning. These are advertised offerings, not courses inspected in this pass.
- The first page of the public [blog](https://mattmurphy.ai/blog/) lists July 8, 2026 as its newest visible article date. No newly dated post after the August 29 audit was established from that page. This does not prove the member community has had no updates.
- The public [Vibecoding DIY Kit outline](https://mattmurphy.ai/vibecoding-diy-kit/) describes project definition, specs/tests, repeatable workflows, project-specific AI calibration, operating cadence, deployment, and readiness checks. Its actual playbook requires email delivery and was not downloaded. For NODEINE, approved visual examples, explicit acceptance criteria, and repeatable verification are the useful concepts—not an additional runtime dependency.
- Public pages did not establish a new reusable UI component, image-generation model, or tool to install in NODEINE. No gated lessons, private posts, or exams were accessed. The site [terms](https://mattmurphy.ai/terms/) reserve authored assets and restrict redistribution. This was a bounded public-page review, not a bulk scrape or a claim that the assistant has permanently trained on a course.

The Faction is a useful engineering discipline source; it should be complemented by actual UX research practice on this app. Completing engineering checklists and validating a user journey answer different questions.

## Retrieval and scope

Agent Reach's Exa backend failed connection/version negotiation and its Jina reader failed DNS resolution. Official pages were read using the available web tool as a disclosed fallback. No cookies, registrations, subscriptions, repository permissions, paid services, or downloads were requested. Naming research is recorded separately in `2026-09-06-naming-options.md`.
