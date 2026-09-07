# Design-system tools: interface-design, responsive-craft, and Hue

Reviewed September 7, 2026. Scope: the three exact repositories supplied in the user's Google Doc. This is a primary-source assessment, not an installation, executed benchmark, full security audit, or adoption of external skill instructions.

## Recommendation

Keep the existing project-owned design-system workflow. The best incremental contribution is **responsive-craft's behavior specifications and responsive review checklist**; selectively add **interface-design's scoped visual-review lenses**. Consider **Hue's structured design model and specimen approach** only when creating a reusable identity across several surfaces. Do not install all three broadly or create three competing sources of design truth.

None supplies working messaging, authentication, a native mobile application, or production-ready application components. They guide an agent's work; some additionally supply local preview/validation scripts. [Interface Design README](https://github.com/Dammyjay93/interface-design/blob/2f9be3206855bcb2d1d0af262c8bae25cba6658d/README.md), [Responsive Craft README](https://github.com/kylezantos/responsive-craft/blob/4863701762d243d0517b38cb36473b9a70861b72/README.md), [Hue README](https://github.com/dominikmartn/hue/blob/a910e31cd24b45b9455c0c3502150413aa5a3b32/README.md).

## Pinned evidence and licenses

GitHub's API resolved these `main` commits during this review; all repository links below are pinned to them.

| Repository | Reviewed commit | License evidence |
| --- | --- | --- |
| Dammyjay93/interface-design | [`2f9be3206855bcb2d1d0af262c8bae25cba6658d`](https://github.com/Dammyjay93/interface-design/commit/2f9be3206855bcb2d1d0af262c8bae25cba6658d), June 20, 2026 | [MIT license file](https://github.com/Dammyjay93/interface-design/blob/2f9be3206855bcb2d1d0af262c8bae25cba6658d/LICENSE), copyright 2026 Damola Akinleye. |
| kylezantos/responsive-craft | [`4863701762d243d0517b38cb36473b9a70861b72`](https://github.com/kylezantos/responsive-craft/commit/4863701762d243d0517b38cb36473b9a70861b72), April 4, 2026 | README says MIT, but the [pinned tree](https://github.com/kylezantos/responsive-craft/tree/4863701762d243d0517b38cb36473b9a70861b72) contains no LICENSE file; GitHub API license metadata was `null`. Resolve the missing license text/attribution before vendoring or redistributing its files. |
| dominikmartn/hue | [`a910e31cd24b45b9455c0c3502150413aa5a3b32`](https://github.com/dominikmartn/hue/commit/a910e31cd24b45b9455c0c3502150413aa5a3b32), June 11, 2026 | [MIT license file](https://github.com/dominikmartn/hue/blob/a910e31cd24b45b9455c0c3502150413aa5a3b32/LICENSE), copyright 2026 Dominik Martin. |

The two complete MIT notices require retention in copies or substantial portions. Repository licensing does not establish rights to third-party brand imagery, proprietary typefaces, logos, or other materials encountered during reference analysis. No third-party assets were copied here.

## What is already covered locally

The existing [design-system-synthesis skill](/Users/stevenadkins/.codex/skills/design-system-synthesis/SKILL.md) already prioritizes existing product evidence, original identity, semantic tokens, component states, restrained/reduced motion, responsive behavior, WCAG 2.2 AA targets, bilingual English/Chinese typography, and regional dependency fallbacks. Its project-owned `DESIGN.md` contract is more directly tailored to this portfolio than these repositories' general workflows.

[NODEINE's current design contract](</Users/stevenadkins/Documents/NODEINE APP/DESIGN.md>) already preserves artwork-first graphite/cyan/Geist styling, the four-destination navigation model, 44px controls, safe-area clearance, 320px overflow checks, readable opaque chat surfaces, account/conversation-scoped personal appearance, and honest voice-message states. New tools should strengthen these decisions, not reopen them by default.

Current user-direction addendum: after viewing the mobile chat, the owner requested substantially more message space and removal of the global Feed/Explore/Create/You dock inside an open conversation; icon-only navigation elsewhere is a possibility, not a settled requirement. That explicit direction supersedes preservation of the dock in that context. The implementation and layout audit are separate work, not performed in this research note.

| Candidate | Actual incremental value | Overlap or conflict to manage |
| --- | --- | --- |
| interface-design | Explicit hierarchy/composition review and scoped cleanup passes | High overlap in direction, tokens, states, reuse, and visual QA; its `.interface-design/system.md` would duplicate `DESIGN.md`. |
| responsive-craft | Component-by-component responsive behavior, ambiguous layout choices, sticky/scroll failure checks | Complements the existing high-level mobile gate; its generic layout rules still need project-specific judgment. |
| Hue | Machine-readable design model, observed/derived provenance, generated component specimens and mappings | High overlap in system authoring; another canonical token model and opinionated output templates add maintenance. |

These are comparative judgments based on the local contract and the sources detailed below.

## 1. interface-design

The core skill targets product interfaces, explicitly excluding marketing/landing/brand-only work. It emphasizes focal hierarchy, deliberate density, accessible existing primitives, semantic styling, complete states, and visual checks. Saved decisions live in `.interface-design/system.md`; image generation and inline rendering are optional companions, not included rendering engines. [Core skill](https://github.com/Dammyjay93/interface-design/blob/2f9be3206855bcb2d1d0af262c8bae25cba6658d/.claude/skills/interface-design/SKILL.md).

Its two command files distinguish a findings-first review from an editing pass: `design-review` evaluates intent, hierarchy, typography, surfaces, composition, states, and reuse; `design-deslop` is a diff-scoped cleanup that excludes intentional deviations and unrelated code. This separation is useful, but a cleanup request must actually authorize changes. [Review command](https://github.com/Dammyjay93/interface-design/blob/2f9be3206855bcb2d1d0af262c8bae25cba6658d/.claude/commands/design-review.md), [Cleanup command](https://github.com/Dammyjay93/interface-design/blob/2f9be3206855bcb2d1d0af262c8bae25cba6658d/.claude/commands/design-deslop.md).

Codex portability is strong for the instruction-only core: the repository documents Codex installation and includes [OpenAI agent metadata](https://github.com/Dammyjay93/interface-design/blob/2f9be3206855bcb2d1d0af262c8bae25cba6658d/.claude/skills/interface-design/agents/openai.yaml). The Claude plugin's namespaced commands are separate files outside that core folder; do not assume a core-only installation carries their full procedures. No mandatory framework/runtime or image-generation service is bundled with the core.

Bounded use: a findings-only review of NODEINE's inbox and appearance dialog against the existing contract. Preserve Geist, the current semantic token names, contextual artwork, and intentional palette choices; do not replace them merely because generic anti-default rules dislike common fonts, gradients, or multiple accents. This is a review aid, not a reason to restyle the app.

## 2. responsive-craft

It offers existing-layout transformation, mobile-first construction, and multi-width preview. The central ideas are explicit component behavior before CSS, intrinsic layout before added breakpoints, and visible discussion of ambiguous desktop-to-phone transformations. Its skill and reference corpus address independent scroll regions, sticky coordination, keyboard/safe-area constraints, and overflow. [Core skill](https://github.com/kylezantos/responsive-craft/blob/4863701762d243d0517b38cb36473b9a70861b72/SKILL.md).

The existing-layout workflow proceeds from audit to fixes, with a confirmation gate in the full audit path and direct fixing in its targeted path. Therefore, a research-only or review-only task should explicitly exclude implementation. [Transformation workflow](https://github.com/kylezantos/responsive-craft/blob/4863701762d243d0517b38cb36473b9a70861b72/workflows/transform-existing.md).

Its README documents Codex support, while script examples still use `CLAUDE_SKILL_DIR`; a Codex adaptation needs a resolved skill path. Preview uses Node and a browser with four default iframe widths: 375, 768, 1024, and 1440px. Screenshots additionally require the external `dev-browser` executable: `snapshot.js` invokes it through a shell and writes snapshots/comparison HTML. Node alone does not provide screenshot capture. [Preview launcher](https://github.com/kylezantos/responsive-craft/blob/4863701762d243d0517b38cb36473b9a70861b72/scripts/preview.js), [Snapshot source](https://github.com/kylezantos/responsive-craft/blob/4863701762d243d0517b38cb36473b9a70861b72/scripts/snapshot.js).

Source-level cautions before using the bundled tools:

- **Likely launcher failure, not runtime-tested:** the launcher creates a preview URL containing `?url=...`, but the static server resolves the entire `req.url` as a filesystem path without removing the query string. That appears to make its normal preview request a nonexistent filename and return 404. [Launcher](https://github.com/kylezantos/responsive-craft/blob/4863701762d243d0517b38cb36473b9a70861b72/scripts/preview.js), [Server](https://github.com/kylezantos/responsive-craft/blob/4863701762d243d0517b38cb36473b9a70861b72/scripts/serve-static.js).
- Static-file mode copies `_responsive-preview.html` into the target directory and removes it during cleanup, without first preserving an existing file of that name. The server uses `listen(port)` without an explicit loopback host and serves the selected directory. Do not point it at a sensitive source tree. URL mode uses a temporary directory but does not cure the query-path issue. [Launcher](https://github.com/kylezantos/responsive-craft/blob/4863701762d243d0517b38cb36473b9a70861b72/scripts/preview.js), [Server](https://github.com/kylezantos/responsive-craft/blob/4863701762d243d0517b38cb36473b9a70861b72/scripts/serve-static.js).
- The preview uses ordinary live iframes, not isolated test accounts or device emulation. Treat actions inside them as actions against the target app. The testing reference itself calls for real-device checks, including mobile keyboards and Safari; named-width screenshots alone are insufficient. [Iframe source](https://github.com/kylezantos/responsive-craft/blob/4863701762d243d0517b38cb36473b9a70861b72/scripts/preview.html), [Testing checklist](https://github.com/kylezantos/responsive-craft/blob/4863701762d243d0517b38cb36473b9a70861b72/references/testing-checklist.md).

Bounded use: adopt the behavior-spec/checklist ideas for NODEINE's message list, composer, navigation dock, and appearance dialog using the browser workflow already available. Check 320/390px, intermediate widths, tablet, desktop, short landscape, zoom, and keyboard-open behavior. Keep the stock scripts on hold pending repair, review, and license clarification.

## 3. Hue

Hue is a meta-skill: it directs an agent to analyze a URL, screenshots, description, or local codebase, then generate a design-language skill. The proposed source of truth is `design-model.yaml`; derived outputs include token/component/platform documentation plus dashboard, component-library, landing-page, and app-screen HTML specimens. It distinguishes observed brand properties from derived components and licensed fallback assets. These are generated artifacts, not an automatic design-token compiler or implemented application. [Core workflow](https://github.com/dominikmartn/hue/blob/a910e31cd24b45b9455c0c3502150413aa5a3b32/SKILL.md).

Its tool mapping supports Codex equivalents, with browser/computed-style analysis preferred and reduced-confidence URL-only fallbacks. The README advertises 17 examples, but the core identifies only two completed app-screen proofs, both browser dashboards; mobile conversational output is a described archetype, not a demonstrated messaging implementation. [README](https://github.com/dominikmartn/hue/blob/a910e31cd24b45b9455c0c3502150413aa5a3b32/README.md), [Core workflow](https://github.com/dominikmartn/hue/blob/a910e31cd24b45b9455c0c3502150413aa5a3b32/SKILL.md).

The validation script is useful but limited. It checks generated-file syntax/patterns and selected token contrast, not the rendered application. Specifically, `text1` contrast failures below 4.5:1 are errors; `text2` below 3:1 is only a warning. Missing/unresolvable color pairs may be skipped, CSS checks use text matching rather than computed cascade, and a passing exit code permits warnings/skips. It cannot certify chat text over artwork, focus behavior, localization, or accessibility conformance. Its YAML check also runs **unpinned `npx --yes js-yaml`**, which can fetch and execute a package. Review and pin/localize that dependency before any future execution. [Validator source](https://github.com/dominikmartn/hue/blob/a910e31cd24b45b9455c0c3502150413aa5a3b32/scripts/validate.mjs).

Platform templates emit a JavaScript `tailwind.config.js` and default Google Fonts links, with package-based font loading also described. They are not a drop-in mapping for NODEINE's existing Tailwind 4/token conventions, and Biao needs explicit Chinese typography and regional font-delivery fallbacks. Preserve the local synthesis gate rather than treating a generated template as authoritative. [Platform mapping template](https://github.com/dominikmartn/hue/blob/a910e31cd24b45b9455c0c3502150413aa5a3b32/references/platform-mapping-template.md), [NODEINE package manifest](</Users/stevenadkins/Documents/NODEINE APP/package.json>).

For expressive projects, Hue's separation of background, optional subject, and their visual relationship is a useful composition vocabulary. A text-safe static composition is a valid outcome; no shader or decorative object is inherently required. [Hero-stage reference](https://github.com/dominikmartn/hue/blob/a910e31cd24b45b9455c0c3502150413aa5a3b32/references/hero-stage.md).

## Bounded opportunities across the four apps

These are proposed experiments, not claims that the other products have been audited or changed.

| Product | Small useful application | Acceptance boundary |
| --- | --- | --- |
| NODEINE art social app / messaging | Responsive behavior spec for composer, conversation pane, contextual navigation, and appearance controls; focused visual hierarchy review. | Increase message space and assess dock removal within an open conversation per the owner's direction. Keep readable surfaces and route access; avoid unrelated database/runtime changes. Test mobile keyboard, safe areas, long usernames/URLs, and pending/error states. |
| 108 Yokai — Fourth Portal | One original hero/entry specimen using Hue's background/subject relationship vocabulary, followed by a responsive text-safe layout review. | Keep entry/return/skip legible, include a static/reduced-motion presentation, use owned artwork, and avoid importing another brand's signature composition. |
| Trinefield portfolio | One project-case-study specimen demonstrating identity consistently across desktop and phone; optional component/token sheet if repeatability is valuable. | Projects, résumé, and contact remain accessible without playing an effect. Interface-design is not the primary tool for the marketing/portfolio page itself. |
| Biao Chinese app | Responsive form/navigation review plus a token/state specimen based on its own source and actual Simplified Chinese content. | Keep local bilingual rules, CJK fallbacks, natural line breaking, native copy review, zoom, and region-appropriate asset delivery; do not ship Latin-only typography defaults. |

## Adoption boundary

Official OpenAI documentation confirms the portable unit is a folder containing `SKILL.md` with `name` and `description`, optionally with scripts, references, and `agents/openai.yaml`. It documents local repository/user discovery and explicit invocation; it does not turn Claude plugin command files or unavailable executables into Codex tools. [Build skills](https://learn.chatgpt.com/docs/build-skills).

If implementation is later authorized, start with one project-scoped, instruction-only experiment. Keep `DESIGN.md` authoritative; do not generate a parallel `system.md` or YAML token authority without a deliberate migration/synchronization decision. Preserve notices for copied licensed material, review every script, and check the installed Next.js guides before writing application code. No installation is necessary to act on the original recommendations in this note.

## Method and limits

Used the Agent Reach GitHub read-only route, primary repository READMEs, pinned trees, selected skill/reference/command files, actual preview/validator source, license files, local design contracts, and official OpenAI documentation. Initial sandboxed GitHub access failed; first-party web fallback worked, then approved read-only GitHub API calls resolved fresh commit IDs and source. No supplied repository was cloned, installed, or executed. No live app state, credentials, project design files, or external content was changed.

The source-level preview findings were not executed or reported upstream. Repository popularity and marketing claims were not treated as evidence of production quality. Agent Reach's optional update check failed DNS resolution; no update was performed.
