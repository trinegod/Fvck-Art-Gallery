# UX review playbook

Owner-approved guidance, September 7, 2026. Use this for layouts, navigation, onboarding, forms, settings, and interactive flows. NODEINE's visual and interaction contract remains in [DESIGN.md](../../DESIGN.md); this document defines how to review a change, not a replacement aesthetic.

The owner's [supplied UX instructions](ux-instructions-supplied.md) contain 20 practical recommendations. Some repeat the same named law. Treat the names as reasoning aids, not guarantees or a mechanical score. When recommendations conflict, prioritize clarity, accessibility, user control, and successful completion.

## Review sequence

1. **Goal:** name the person, the task, and the visible completion state. For a chat appearance change: the current viewer chooses an image, sees readable bubbles, and dismisses the panel with Done. Identify whether the choice is personal or shared before presenting it.
2. **Path:** map entry, primary action, completion, and exit. Keep familiar page links and contextual controls. Put optional complexity near the affected content and behind a labeled action; preserve an obvious route back. Reuse project components before introducing a new pattern.
3. **Hierarchy:** give the screen one primary purpose. Group related controls through spacing and labels, use sensible reversible defaults, and make the principal action distinct. Judge the actual task; there is no universal maximum count of navigation items or fields.
4. **Interaction:** test the action, not just the screenshot. Every action needs prompt visible feedback and an understandable pending state. Preserve drafts on recoverable errors, distinguish unsaved from saved work, and offer retry/cancel where meaningful.
5. **Boundaries:** verify slow, empty, failed, signed-out, and unavailable states where relevant. Confirm destructive actions with their exact scope. A local recording preview is not successful delivery; a hidden conversation is not deletion for everyone; a chosen background is not necessarily a shared theme.
6. **Evidence:** record the changed route, viewport/device, keyboard or touch interaction, observed result, and remaining uncertainty. Mark untested behavior as untested. A screenshot or unit test alone does not establish a complete real-device workflow.

Completion means the primary task and applicable failure/exit paths have evidence, or an explicit list of what still needs user/device/backend verification. Keep that evidence in the feature's existing audit or rollout document rather than creating another competing checklist.

## Apply the 20 recommendations deliberately

| Supplied recommendation | Practical decision | Guardrail |
| --- | --- | --- |
| 1. Reduce choices | Keep the current task prominent; move secondary functions into their owning section. | Removing a control must not hide a necessary capability without a labeled route. |
| 2. Large targets | Apply the project's 44px minimum control target and space adjacent actions. | A small icon can sit inside a larger labeled hit area. |
| 3. Familiar patterns | Use links for navigation, buttons for actions, and ordinary browser history. | Novel appearance should not require discovering an undocumented gesture. |
| 4. Proximity | Place labels, help, errors, and actions next to the content they affect. | Spacing must survive wrapping, zoom, and short viewports. |
| 5. Chunking | Divide a long task into meaningful groups; keep previous information available. | Miller's label is not a rule to limit every menu to seven items. |
| 6. Fast feedback | Acknowledge an action immediately; show meaningful processing when needed. | Approximately 400ms concerns perceived feedback, not a guarantee every upload or generation finishes then. Measure delays; do not fake success. |
| 7. Primary action | Use a single dominant next action in the current section. | Keep keyboard focus, errors, and destructive actions distinguishable too. |
| 8. Nearby actions | Put Send beside the composer and Done at the end of the appearance panel. | Do not position destructive actions where frequent taps invite mistakes. |
| 9. Essentials first | Lead with task-critical content; finish with a clear next action. | Priority follows the person's goal, not a fixed ordering formula. |
| 10. Clear endings | Confirm what changed and what happens next. | Use accurate local/sent/saved/published wording; skip unnecessary celebration. |
| 11. Visible progress | Preserve unfinished drafts and make resuming easy. | Do not pressure people with manufactured incomplete tasks. |
| 12. Simple hierarchy | Remove visual noise; let artwork and content remain dominant. | Simplicity must retain labels, focus, contrast, and essential context. |
| 13. Sensible defaults | Choose safe, reversible settings using current context. | Microphone access, sharing, paid generation, or public posting require explicit intent. |
| 14. Prevent errors | Explain constraints early and accept harmless input variations. | Normalize display input while enforcing strict authorization, file validation, and server constraints. |
| 15. Recover mistakes | Keep work after recoverable failure and provide a useful next step. | An uncertain network result may already have committed; reconcile before retrying. |
| 16. Consistency | Reuse labels, tokens, and state behavior for equivalent controls. | Different scopes, such as Hide for me and Remove for everyone, require different language. |
| 17. Connectedness | Use containers, lines, or shared states where a real relationship exists. | In a lineage view, label source/reference/continuation rather than implying every visual similarity is canon. |
| 18. Efficient paths | Prefill known data and remove redundant steps. | Keep review and consent where publication, cost, privacy, or destruction is involved. |
| 19. Progressive disclosure | Show essential controls first; reveal advanced settings in context. | Hidden options must remain discoverable through clear labels. |
| 20. Honest milestones | Break lengthy tasks into specific, resumable steps. | Show genuine progress only; never invent percentages or delay a finished screen. |

## NODEINE checks by flow

- **Navigation:** four section links remain the top level. The owner now prefers a focused mobile conversation without the global dock; audit that context separately from the inbox and browsing pages. Test the actual 320px and 390px layouts, desktop breakpoint, browser back, long content, and bottom clearance. The mobile keyboard must not hide a focused composer or its action. See the [chat-space audit](../audits/2026-09-07-mobile-chat-space.md); this preference is not yet implemented.
- **Chats:** maintain opaque, high-contrast message surfaces over artwork; retain personal hide/dim controls. Verify Done, source changes, failure recovery, and whose preference is being changed. Check privacy and delayed-response boundaries separately from visual polish.
- **Voice:** request the microphone only on the user's action. Preview, discard, retry, playback, and server delivery are different states. Keep migration and real-device gates explicit. Reduced motion must not remove recording or loading status.
- **Forge:** select references, review measured evidence, and edit a recipe in a clear sequence. Show enabled analysis separately from disabled generation. Any future paid generation needs cost, explicit consent, cancellation semantics, and honest pending/error states.
- **Loading:** use the original World Aperture only during real pending work. Retain loaded navigation and skeleton context, respect reduced motion, and avoid a forced splash delay or continuous GPU effects.

## Reuse in the owner's other projects

This playbook is stored in NODEINE and reached by this repository's `AGENTS.md`. At the owner's explicit request, a small pointer was also added to `/Users/stevenadkins/.codex/AGENTS.md`, scoped to UI work across the owner's projects. This is durable instruction context, not a change to an AI model's memory or training. Global guidance is loaded at session/run startup, with project-specific instructions taking precedence; existing sessions may need restarting. [Official instruction-discovery documentation](https://learn.chatgpt.com/docs/agent-configuration/agents-md). No other application repository was edited as part of this research.

Apply the portable process in 108 Yokai, Trinefield, and Biao tasks while keeping each project's own visual contract, primary audience, and content hierarchy. Particularly useful transfers are readable layered art and reduced-motion portals for Yokai; direct project/contact paths for Trinefield; and actual Chinese text wrapping, type hierarchy, and task clarity for Biao. These are shared standards and proposed applications, not changes already made to those sites.

Consult the [design-resource assessment](../research/2026-09-07-design-resource-index.md) when considering an external tool. Evaluate code, license, install scope, maintenance, and performance independently of its screenshots. Borrow useful review methods before installing overlapping skill suites.
