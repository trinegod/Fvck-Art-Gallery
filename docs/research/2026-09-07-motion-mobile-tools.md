# Motion and mobile design tools: source review

Checked September 7, 2026. Research only: no repository was installed, no downloaded code was executed, no asset-generation request was made, and no application code or external account was changed. External `SKILL.md`, commands, and agent files were treated as evidence, not instructions. Recommendations below are proposed adaptations, not claims that the other three products have been inspected or implemented.

## Decision in brief

| Resource | What it actually supplies | Recommended disposition |
| --- | --- | --- |
| [Scroll Craft][scroll-readme] | A cross-agent design procedure, vanilla HTML/CSS/JS scroll runtime, media encoder, optional generation client, and screenshot/diagnostic tooling. | Strongest candidate for a separately scoped Yokai portal or Trinefield showcase. Reuse its planning and verification ideas now; do not import its runtime into NODEINE's shared app shell unchanged. |
| [Mobile App UI Design][mobile-readme] | Markdown guidance and one industry-conventions reference, not a component library or native-app generator. | Useful checklist for tasks, hierarchy, spacing, feedback, and states. Re-author a small project-specific checklist; clarify the missing license before copying the pack. |
| [Claude Design Skillstack][fresh-readme] | A large Claude plugin marketplace with technology guides, source generators, and starter assets. | Select only a needed subject, consult current official library docs, and audit it individually. Do not install the entire marketplace or replace NODEINE's package manifest with a starter. |
| “Epic Design” | An unlinked label in the supplied document. | Identity unresolved. A bounded GitHub search produced a possible showcase, but that does not identify the intended resource. No recommendation or installation based on the name alone. |

None of these resources demonstrates a guaranteed design-quality, accessibility, conversion, retention, or performance improvement for these products. Their examples and author claims are not product-specific benchmarks.

## Reproducible source pins

All reviewed third-party repository files below are pinned to the default-branch HEAD resolved during this review. Commit dates are not installation dates, and GitHub's repository `pushed_at` can differ from the HEAD commit date.

| Repository | Reviewed commit | Commit date, UTC | License evidence |
| --- | --- | --- | --- |
| `nateherkai/scroll-craft` | [`0b816225945e45380397d6a0487efa3c98916858`][scroll-pin] | 2026-09-04 | Root MIT text, copyright Nate Herk; inspected plugin metadata also says MIT. [License][scroll-license] |
| `ceorkm/mobile-app-ui-design` | [`4c67a0e71727b6afaaafbcbb1b11c7660de5fac9`][mobile-pin] | 2026-02-15 | README claims MIT and links `LICENSE`, but the complete pinned tree has no license file; GitHub license metadata was null. [README][mobile-readme], [tree][mobile-tree] |
| `freshtechbro/claudedesignskills` | [`1da73febff0c3e1dfefc07f8a5ef8f7d1dfdb6cd`][fresh-pin] | 2025-11-20 | Root LICENSE is MIT, but each inspected Motion, GSAP, and R3F plugin manifest declares Apache-2.0. Do not silently resolve this inconsistency. [Root license][fresh-license], [Motion manifest][motion-manifest], [GSAP manifest][gsap-manifest], [R3F manifest][r3f-manifest] |

License observations are a provenance check, not a legal opinion. Preserve applicable notices for copied material; resolve ambiguous scope with the maintainer before distributing a vendored package. A repository's license is not a blanket license to its depicted brands, linked media, third-party fonts, models, or premium-library assets.

## 1. Scroll Craft

### Capabilities established by source

The skill plans a visitor journey, page structure, depth layers, an intentional highlight, and separate mobile composition. Its delivered artifact is an HTML page, not a Next/React package or a hosted service. It explicitly documents Codex use and treats supplied photography/footage as a first-class path without a generation key. [README][scroll-readme], [skill][scroll-skill]

The runtime exposes `window.ScrollCraft.mount(...)` and reads `data-sc-*` attributes. Source includes pinning, video seeking, parallax, reveals, horizontal rails, counters, text splitting, and fine-pointer effects. It has coarse-pointer/mobile handling and reads the reduced-motion preference. The JS and CSS source files total approximately 78 kB before minification/compression; this is source size, not a measured shipped bundle or performance score. No GSAP or Three.js dependency is imported by this runtime. [Engine][scroll-engine], [CSS][scroll-css]

The screenshot helper actually samples scroll positions, inspects cue opacity/video state, records request and console errors, estimates text/background contrast at sampled frames, and produces reports and contact-sheet input. Its diagnostics are valuable, but they are sampling-based and tailored to this engine. Inspection found diagnostic failures printed near the end without a corresponding nonzero exit status; the helper is not automatically a failing CI accessibility gate. Its skill itself distinguishes headless checks from real-phone verification. [Screenshot helper][scroll-shoot], [skill][scroll-skill]

### Dependencies and consequential behavior

- The documented full workflow needs Node 18+, a full FFmpeg build, `playwright-core` resolved from the build project, and a locally available browser. Reading the design guidance needs none of these. [README][scroll-readme], [screenshot helper][scroll-shoot]
- The encoder uses H.264, strips audio, emits separate desktop/mobile settings, uses dense keyframes for seeking, and overwrites the chosen output via FFmpeg's `-y`. Dense keyframes trade file size for scrub responsiveness; “mobile” encoding alone is not a mobile bandwidth budget. [Encoder][scroll-encode]
- Optional generation reads a configured `KIE_AI_API_KEY` or searches ancestor `.env` files for that key, uploads local reference images to the configured upload service, submits Kie jobs, polls, and writes downloaded results. It also explicitly sets `nsfw_checker: false` for still generation. This is a real external-data/spend boundary, not just a prompt template. Do not run this helper against user artwork, private photos, or production secrets without separate approval and provider review; do not carry its moderation setting into a product default. No provider prices, retention promises, or model availability were verified here. [Generation client][scroll-kie]

### Important integration findings

1. **Not a drop-in React lifecycle.** The engine evaluates browser globals, mutates DOM/style state, registers global listeners, starts persistent animation loops, and returns a mount API without a `destroy`/unmount method. Its reduced-motion flag is captured at script evaluation. Repeated client-side route mounts, development remounts, preference changes, and retained references therefore need explicit engineering and tests. This is a source-based integration risk, not a reproduced NODEINE bug. [Engine][scroll-engine]
2. **Global styles and progressive enhancement need work.** The stylesheet changes `html`, `body`, selection, focus, and native controls. Several cue/reveal selectors begin at opacity zero without requiring a JS-ready root, so affected content needs a no-JS/runtime-error escape path. Do not load the stylesheet globally into an existing app. [CSS][scroll-css]
3. **Taste rules are optional inputs.** Requirements such as four effect families, a bespoke interaction, a minimum structural-distance score, or a prohibition on certain punctuation are the author's creative rubric. They do not override a product brief or establish usability. The rubric is especially ill-suited to repetitive, task-oriented feed/chat screens. [Skill][scroll-skill]
4. **Sampling is not certification.** Preserve semantic content, keyboard and screen-reader access, readable intermediate states, and a static route through the same information. Audit the actual shipped page, not just its posters. Normal-size text generally needs 4.5:1 contrast; qualifying large text needs 3:1. The helper's “thin” diagnostic still requires a correct text-size assessment. [Helper][scroll-shoot], [W3C contrast explanation][wcag-contrast]

For a future build, start with an isolated page using owned stills and native scrolling. Only add video or 3D when its information value is clear. A React-native reimplementation of a chosen effect, with scoped cleanup and CSS, may be a better adaptation than wrapping the entire engine. This is a recommendation, not work completed here.

## 2. Mobile App UI Design

The pinned tree contains `.gitignore`, README, INDEX, `SKILL.md`, and `references/industry-conventions.md`; no runtime, component source, tests, package manifest, or native-app build pipeline is present. The main guide covers task/context definition, hierarchy, color and spacing, reachable actions, feedback, and empty/error/loading/success states. Implementation suggestions target React/HTML with Tailwind, Lucide, optional Recharts, and CSS transitions. Mentions of React Native, Flutter, and SwiftUI refer to visual-prototype intent, not demonstrated native components. [Tree][mobile-tree], [skill][mobile-skill]

Useful transferable questions: What is the user doing? What matters first? What happens before/after this screen? How do success, failure, and uncertainty differ? Use these without importing every visual preference.

The main document specifies precise numeric/style rules, while its reference makes unsupported causal claims about Duolingo growth, Disney return visits, and a simplified peak–end account; no supporting citations are supplied there. Treat them as unverified claims, not evidence for retention engineering. The guide's structure-first sequence also differs from the reference's visual-direction-before-UX workflow. [Skill][mobile-skill], [industry reference][mobile-industry]

Adaptation cautions:

- A 60/30/10 color split, four type sizes, large section padding, or bottom-third CTA placement can be a starting hypothesis, not a universal law. Dense chat, keyboards, longer translations, zoom, and errors can demand different solutions.
- Percentage opacity does not guarantee readable text. Measure the final composited colors; do not borrow the reference's “low-contrast” styling as a reading-text rule. [W3C contrast explanation][wcag-contrast]
- The guide uses 44×44 **pt** terminology; NODEINE's own contract uses 44 **CSS px** controls. Preserve the explicit product contract. WCAG 2.2 AA target-size guidance is 24×24 CSS px with exceptions, not an assertion that 44pt and 44px are interchangeable. [W3C target-size explanation][wcag-target], [NODEINE contract](</Users/stevenadkins/Documents/NODEINE APP/DESIGN.md>)
- Polish or animation is not proof that a financial/health action is trustworthy. Truthful states, clear consequences, and recoverability matter more than celebratory motion.
- No native accessibility, Chinese layout, screen-reader, input-method, or real-device tests come with the pack. Recharts should not become a dependency unless there is an actual chart to build.

The missing license is a practical pause on copying/distributing the pack, not a reason to stop using independently justified UX principles.

## 3. Claude Design Skillstack

The pinned tree confirms 22 individual plugin skill files plus bundle/plugin structure. Technology coverage includes Three.js/R3F, GSAP, Motion, alternative renderers and animation systems, and authoring pipelines such as Blender, Spline, and Rive. That breadth is an index of options, not a recommendation to combine all of them. The README's production-ready and command-count labels were not validated by executing its tooling. [README][fresh-readme], [tree][fresh-tree]

This review inspected the actual Motion, GSAP, and R3F guides, their starter manifests/plugin wrappers, and the Motion animation generator. These guides have substantive examples: state/layout/gesture animation in Motion; timelines, pinning, scrubbing and scoped React integration in GSAP; scenes, model loading, instancing, demand rendering and disposal in R3F. The selected Python generator writes boilerplate; it is not an autonomous tested application builder. Its output-file option uses a normal write mode that can replace an existing file. The remaining generators, archive packages, and authoring pipelines were not security-audited. [Motion guide][motion-skill], [GSAP guide][gsap-skill], [R3F guide][r3f-skill], [generator][motion-generator]

Specific reasons not to copy it wholesale:

- **Version mismatch:** its Motion starter uses React 18.3.1, `framer-motion` 11.15.0, and Vite 6; its R3F starter uses React 18.3.1, Fiber 8.18.8, Drei 9.123.0, and Three 0.172.0. NODEINE declares React 19.2.4 and Next 16.3.3. R3F's own source explicitly pairs Fiber 8 with React 18 and Fiber 9 with React 19. Resolve a compatible set instead of downgrading the app or transplanting the starter. [Motion starter][motion-package], [R3F starter][r3f-package], [official R3F README][r3f-official], [NODEINE package](</Users/stevenadkins/Documents/NODEINE APP/package.json>)
- **Stale/missing references:** the Motion guide lists `variants_patterns.md` and `gesture_guide.md`, but its inspected plugin reference directory contains only `api_reference.md`. Some examples are partial snippets, not independently compilable components. The current official Motion guide uses `motion` / `motion/react` and documents App Router usage; consult that guide and the project's installed Next docs before implementation. [Motion guide][motion-skill], [tree][fresh-tree], [official Motion installation][motion-official]
- **Lifecycle scope:** the GSAP guide contains useful `useGSAP` examples, but also shows a global kill-all-ScrollTriggers operation. In a multi-component app, cleanup should be owned by the component, not remove other views' animations. Official GSAP React guidance provides scoped contexts, reversion, and context-safe event handlers. [GSAP guide][gsap-skill], [official GSAP React README][gsap-official]
- **Portability is at the skill-content layer:** Claude slash commands, `.claude-plugin` manifests, and named Claude agent roles do not become Codex integrations simply by being copied. Preserve relative skill references, revise tool/path assumptions, narrow triggers, and test the chosen workflow. Do not silently activate its agents or scripts. [Command wrapper][motion-command], [plugin manifest][motion-manifest]
- **License ambiguity:** the selected plugins' Apache-2.0 metadata conflicts with the root MIT text. Resolve that before distributing a port, and check each actual runtime/asset license separately; the guide repository cannot grant rights to unrelated premium examples or services. [Root license][fresh-license], [Motion manifest][motion-manifest], [GSAP manifest][gsap-manifest], [R3F manifest][r3f-manifest]

## Codex portability, practically

Official OpenAI documentation defines a skill as a folder with required name/description metadata in `SKILL.md` and optional scripts, references, and assets; repository-local discovery uses `.agents/skills`. Consequently, well-scoped Markdown procedures can be portable even when their original packaging targets Claude. That does not make their code, dependency versions, tool names, credentials, or agent behavior automatically compatible. [Official OpenAI skill documentation][codex-skills]

If installation is requested later: pin a reviewed commit, resolve its license, inspect the complete selected folder and executable paths, convert only the host-specific assumptions, and run a small acceptance test before broadening scope. Keep external generation disabled unless separately requested. This review did not create a skill or change any skill directory.

## Product-specific adaptation proposals

These are hypotheses to validate with users/devices, not evidence that the other products currently work this way.

| Product | Good use | Avoid | First acceptance test |
| --- | --- | --- | --- |
| **NODEINE social art app** | Mobile task/state checklist; restrained feedback; compare a static versus lightly layered public World preview outside everyday navigation. | Whole-app scroll engine, cinematic chat/feed transitions, decorative delays, new global fonts/styles, animated text over private chat artwork. | Existing Feed/Explore/Create/You routes, browser history, 320px layout, keyboard focus, honest pending states, and private-data boundaries remain unchanged. |
| **108 Yokai portal** | A single authored threshold/hero with distinct depth planes, owned artwork, useful enter/return controls, and a static counterpart. Evaluate 2.5D stills before real 3D/video. | Continuous flythrough by default, mandatory long scroll before entry, opaque canvas-only navigation, autoplay audio, unlicensed example art. | A first-time visitor can enter and return immediately on touch, keyboard, and reduced motion; the static route conveys the same destination. |
| **Trinefield portfolio** | Scroll Craft's editorial/gallery planning, clear project sequence and ending, one optional distinctive interaction. | A scroll spectacle that hides project evidence, invents metrics, or delays contact/project links. | Project titles, actual work, authorship, and contact/next action are clear before animation loads; deep links and back navigation work. |
| **Biao Chinese app** | Mobile hierarchy/state review plus Chinese-script-specific typography, native editable text, realistic translated labels, and keyboard-aware input. | Translating an English visual prototype without reflow/input tests, copying Western word-split animations, or adding reward loops without a real task benefit. | Real Chinese text, mixed Latin/numbers, punctuation wrapping, composition input, selection/copy, zoom, and small-screen layouts remain readable and stable. |

NODEINE already has an explicit artwork-first contract: quiet predictable navigation, Geist text, cyan selection, 44px controls, native scrolling, no decorative navigation motion, and real pending-only loading treatment. These recommendations do not authorize changing that contract. [Interface contract](</Users/stevenadkins/Documents/NODEINE APP/DESIGN.md>), [loading design](</Users/stevenadkins/Documents/NODEINE APP/docs/design/loading-screen-concept.md>)

For Biao, the W3C Chinese Text Layout document is a **Group Note Draft/work in progress**, useful for regional glyph/layout, punctuation, mixed-script, and line-breaking considerations—not a finished product spec. Choose its relevant regional requirements using the real audience rather than assuming a single “Chinese aesthetic.” [Chinese layout draft][chinese-layout]

## Shared adoption gates

1. Scope the experiment to one route/component, retain a static useful version, and preserve the current baseline for comparison.
2. Record asset ownership, allowed use, attribution, source license and commit, and any external upload/generation boundary. Never treat a polished demo as consent to reuse its brands or people.
3. Start from the existing stack; add one dependency only for a demonstrated need. For NODEINE, read the relevant installed Next documentation before any implementation, as required by its AGENTS.md.
4. Measure actual added transfer size, media requests, layout shift, input responsiveness, and main-thread/GPU work on target phones. No universal performance budget or score was established in this research.
5. Check no-JS/runtime failure, unavailable media/WebGL, slow network, browser back/forward, unmount/remount, focus, zoom, safe areas, and OS reduced-motion changes. Keep critical text and navigation outside decorative canvases.
6. Make nonessential interaction motion disableable. W3C's animation-from-interactions criterion is Level AAA and explicitly discusses parallax; this is the design bar proposed here, not a claim of full WCAG conformance. [W3C motion explanation][wcag-motion]

## Method and limits

Used Agent Reach's GitHub CLI read-only API/search route to resolve commits and inspect source, its Exa route for bounded primary-source discovery, official OpenAI documentation for skill portability, and official library/W3C pages to check selected claims. The initial sandboxed network attempt failed; approved read-only requests succeeded. Agent Reach's read-only update check reported installed v1.5.0 current. No repository scripts, installers, demo builds, generation clients, or external agents were run. Only the research note was written.

Source inspection is not a malware audit, proof that all supplied examples run, a real-device test, or a license clearance. The review was intentionally deeper on the three selected motion technologies than on the remaining skillstack. “Epic Design” remains unconfirmed because the document supplied no identifying hyperlink.

[scroll-pin]: https://github.com/nateherkai/scroll-craft/commit/0b816225945e45380397d6a0487efa3c98916858
[scroll-readme]: https://github.com/nateherkai/scroll-craft/blob/0b816225945e45380397d6a0487efa3c98916858/README.md
[scroll-license]: https://github.com/nateherkai/scroll-craft/blob/0b816225945e45380397d6a0487efa3c98916858/LICENSE
[scroll-skill]: https://github.com/nateherkai/scroll-craft/blob/0b816225945e45380397d6a0487efa3c98916858/plugins/nateherk-design/skills/scroll-craft/SKILL.md
[scroll-engine]: https://github.com/nateherkai/scroll-craft/blob/0b816225945e45380397d6a0487efa3c98916858/plugins/nateherk-design/skills/scroll-craft/engine/scrollcraft.js
[scroll-css]: https://github.com/nateherkai/scroll-craft/blob/0b816225945e45380397d6a0487efa3c98916858/plugins/nateherk-design/skills/scroll-craft/engine/scrollcraft.css
[scroll-shoot]: https://github.com/nateherkai/scroll-craft/blob/0b816225945e45380397d6a0487efa3c98916858/plugins/nateherk-design/skills/scroll-craft/scripts/shoot.mjs
[scroll-encode]: https://github.com/nateherkai/scroll-craft/blob/0b816225945e45380397d6a0487efa3c98916858/plugins/nateherk-design/skills/scroll-craft/scripts/encode.sh
[scroll-kie]: https://github.com/nateherkai/scroll-craft/blob/0b816225945e45380397d6a0487efa3c98916858/plugins/nateherk-design/skills/scroll-craft/scripts/kie.mjs
[mobile-pin]: https://github.com/ceorkm/mobile-app-ui-design/commit/4c67a0e71727b6afaaafbcbb1b11c7660de5fac9
[mobile-tree]: https://github.com/ceorkm/mobile-app-ui-design/tree/4c67a0e71727b6afaaafbcbb1b11c7660de5fac9
[mobile-readme]: https://github.com/ceorkm/mobile-app-ui-design/blob/4c67a0e71727b6afaaafbcbb1b11c7660de5fac9/README.md
[mobile-skill]: https://github.com/ceorkm/mobile-app-ui-design/blob/4c67a0e71727b6afaaafbcbb1b11c7660de5fac9/SKILL.md
[mobile-industry]: https://github.com/ceorkm/mobile-app-ui-design/blob/4c67a0e71727b6afaaafbcbb1b11c7660de5fac9/references/industry-conventions.md
[fresh-pin]: https://github.com/freshtechbro/claudedesignskills/commit/1da73febff0c3e1dfefc07f8a5ef8f7d1dfdb6cd
[fresh-tree]: https://github.com/freshtechbro/claudedesignskills/tree/1da73febff0c3e1dfefc07f8a5ef8f7d1dfdb6cd
[fresh-readme]: https://github.com/freshtechbro/claudedesignskills/blob/1da73febff0c3e1dfefc07f8a5ef8f7d1dfdb6cd/README.md
[fresh-license]: https://github.com/freshtechbro/claudedesignskills/blob/1da73febff0c3e1dfefc07f8a5ef8f7d1dfdb6cd/LICENSE
[motion-skill]: https://github.com/freshtechbro/claudedesignskills/blob/1da73febff0c3e1dfefc07f8a5ef8f7d1dfdb6cd/plugins/individual/motion-framer/skills/motion-framer/SKILL.md
[motion-package]: https://github.com/freshtechbro/claudedesignskills/blob/1da73febff0c3e1dfefc07f8a5ef8f7d1dfdb6cd/plugins/individual/motion-framer/skills/motion-framer/assets/starter_motion/package.json
[motion-manifest]: https://github.com/freshtechbro/claudedesignskills/blob/1da73febff0c3e1dfefc07f8a5ef8f7d1dfdb6cd/plugins/individual/motion-framer/.claude-plugin/plugin.json
[motion-generator]: https://github.com/freshtechbro/claudedesignskills/blob/1da73febff0c3e1dfefc07f8a5ef8f7d1dfdb6cd/plugins/individual/motion-framer/skills/motion-framer/scripts/animation_generator.py
[motion-command]: https://github.com/freshtechbro/claudedesignskills/blob/1da73febff0c3e1dfefc07f8a5ef8f7d1dfdb6cd/plugins/individual/motion-framer/commands/animation_generator.md
[gsap-skill]: https://github.com/freshtechbro/claudedesignskills/blob/1da73febff0c3e1dfefc07f8a5ef8f7d1dfdb6cd/plugins/individual/gsap-scrolltrigger/skills/gsap-scrolltrigger/SKILL.md
[gsap-manifest]: https://github.com/freshtechbro/claudedesignskills/blob/1da73febff0c3e1dfefc07f8a5ef8f7d1dfdb6cd/plugins/individual/gsap-scrolltrigger/.claude-plugin/plugin.json
[r3f-skill]: https://github.com/freshtechbro/claudedesignskills/blob/1da73febff0c3e1dfefc07f8a5ef8f7d1dfdb6cd/plugins/individual/react-three-fiber/skills/react-three-fiber/SKILL.md
[r3f-package]: https://github.com/freshtechbro/claudedesignskills/blob/1da73febff0c3e1dfefc07f8a5ef8f7d1dfdb6cd/plugins/individual/react-three-fiber/skills/react-three-fiber/assets/starter_r3f/package.json
[r3f-manifest]: https://github.com/freshtechbro/claudedesignskills/blob/1da73febff0c3e1dfefc07f8a5ef8f7d1dfdb6cd/plugins/individual/react-three-fiber/.claude-plugin/plugin.json
[r3f-official]: https://github.com/pmndrs/react-three-fiber/blob/master/readme.md
[gsap-official]: https://github.com/greensock/react/blob/main/README.md
[motion-official]: https://motion.dev/docs/react-installation
[codex-skills]: https://learn.chatgpt.com/docs/build-skills
[wcag-contrast]: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
[wcag-target]: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
[wcag-motion]: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
[chinese-layout]: https://www.w3.org/TR/2026/DNOTE-clreq-20260503/
