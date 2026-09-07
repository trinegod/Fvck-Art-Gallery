# Design resources: what to use across Steven's projects

Reviewed September 7, 2026. Start with the [reusable UX review playbook](../design/ux-review-playbook.md). It preserves the owner's supplied instructions and connects them to actual task, mobile, accessibility, recovery, and verification decisions. The repository instruction file and the owner's personal Codex instructions point future UI work to it; each project's own identity remains authoritative.

## Source and scope

The [supplied Google Doc](https://docs.google.com/document/d/14Ae912m5EZTfWobLUAQaiUPSfLs4DwGDjNZX7BwggkQ/mobilebasic) is titled **10 Claude Skills That Make Your App Look Expensive**. Its document body and native hyperlinks were retrieved. It provides nine exact GitHub links; the tenth item, Epic Design, has no link. The separate pasted **UX Design Instructions** are [preserved here](../design/ux-instructions-supplied.md); they are not the same document as this tool list.

Three research agents inspected the linked repositories' primary READMEs, pinned source, license material, and selected installation/runtime behavior. This is a bounded adoption assessment, not an exhaustive audit of every file or a runtime benchmark. No third-party skill suite, script, package, hook, or graphics engine was installed or executed. The research did not change the other applications.

## Decision map

| Supplied item | Useful contribution | Decision for now |
| --- | --- | --- |
| [Impeccable](https://github.com/pbakaus/impeccable) | Focused interface critiques and deterministic review tooling | Strong candidate for a later report-only pilot. Inspect its native runtime/downloads/hooks first; no broad installation. |
| [Frontend Design](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design) | Original art direction and brief-led visual choices | Comparative reading; largely covered by our existing design workflow. Exact linked plugin has an unresolved license pointer. |
| [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Searchable UX, palette, typography, and stack references | Selective reference use. It is not another AI model, and its current installer adds seven skills. |
| Epic Design | The source describes cinematic/scrolled layouts | **Unresolved:** no URL in the source. A similarly named repository is not enough to identify the intended tool. |
| [Interface Design](https://github.com/Dammyjay93/interface-design) | Hierarchy, composition, and scoped interface reviews | Borrow useful review questions; keep the active project's `DESIGN.md` as the single authority. |
| [Responsive Craft](https://github.com/kylezantos/responsive-craft) | Explicit component behavior across widths, scrolling, keyboard and safe-area checks | Highest immediate relevance to the cramped mobile chat. Use the review approach; hold stock scripts pending repair/license clarification. |
| [Hue](https://github.com/dominikmartn/hue) | Reusable token models, component specimens, and provenance distinctions | Optional future design-system export experiment. Its validation has limitations and can execute an unpinned npm dependency. |
| [Scroll Craft](https://github.com/nateherkai/scroll-craft) | Scroll-led motion choreography | Reference for an isolated portfolio/portal experiment, not the feed or chat shell. Lifecycle and reduced-motion behavior require adaptation. |
| [Mobile App UI Design](https://github.com/ceorkm/mobile-app-ui-design) | Mobile interaction, hierarchy, and accessible control guidance | Reference material, not a native-app implementation. Clarify missing license text before copying. |
| [Claude Design Skills](https://github.com/freshtechbro/claudedesignskills) | Motion examples and a range of implementation starting points | Selective study only. Check stale references, dependency compatibility, and mixed license metadata before reuse. |

Source details, audited commits, license evidence, and distinctions between source facts and inferred risks:

- [Impeccable, Frontend Design, UI UX Pro Max](2026-09-07-design-tools-audit.md)
- [Interface Design, Responsive Craft, Hue](2026-09-07-design-system-tools.md)
- [Scroll Craft, Mobile App UI Design, Claude Design Skills](2026-09-07-motion-mobile-tools.md)

## What this means for the apps

**NODEINE:** first reclaim mobile chat space with a focused conversation layout and a clear return to the inbox. Keep all message bubbles readable over artwork, make disabled delivery/removal states honest, and keep Forge's measured reference analysis distinct from a future generation service. The [mobile chat-space audit](../audits/2026-09-07-mobile-chat-space.md) is a recommendation, not an implemented layout change.

**108 Yokai / Fourth Portal:** use one original ink/portal visual moment with an immediately understandable entry, return, skip, and static/reduced-motion path. Keep navigation and reading independent of a GPU effect.

**Trinefield:** emphasize real artwork and project outcomes with direct résumé/contact links. A small optional motion demonstration can express craft; generic generated marketing claims and forced intro sequences would weaken it.

**Biao / Chinese site:** use actual Chinese copy when evaluating reflow, typography, forms, and tap targets. Preserve its own visual language, native copy review, and regional asset-delivery requirements instead of inheriting Latin-only templates.

These are application-specific recommendations based on the user's project descriptions; only NODEINE's source was inspected in this assessment. Shared instruction guidance is now available for their future UI tasks, but no feature or restyle was silently applied to those sites.

## Earlier references remain useful

- [Elemental Sandbox assessment](2026-09-07-elemental-sandbox.md): a real Three.js effects playground, not a reference-aware image generator. Borrow layered controls/presets or a small optional atmosphere study; avoid importing the full combat scene into everyday interfaces.
- [Logo-reveal review](2026-09-07-logo-reveal-review.md): learn from the choreography of a mark resolving clearly, using original assets. NODEINE already has its original World Aperture loading identity; keep it tied to real pending work.
- [UX screenshot research](2026-09-07-ux-laws-review.md): records what the named principles support and where simplistic interpretations fail. The later supplied Markdown is retained separately.

## Working policy

One project-owned visual contract, supplemented by task-specific evidence. Before adopting a new tool, establish a concrete gap it fills, inspect its pinned source/license/install scope, and test one isolated use. A tool's style score or attractive screenshot is neither user validation nor accessibility certification. Useful principles can improve a project without importing an entire framework or changing its identity.
