# UX-laws screenshot review

Checked September 7, 2026. This is a bounded source review of the law names visible in the supplied screenshot, not a claim that every label is a universal law, a current product requirement, or an instruction to copy a creator's process. The initial research used the supplied image; the main agent later opened the [public reel](https://www.instagram.com/reel/DcwkX6OyduT/) and visually confirmed the displayed list and creator context. No downloadable creator instructions were obtained. The screenshot names 20 numbered entries but only 19 unique labels because Postel's law appears twice.

## Bottom line

Update: the owner subsequently supplied the full [UX Design Instructions](../design/ux-instructions-supplied.md). These are preserved separately from the screenshot and distilled into the [project review playbook](../design/ux-review-playbook.md). Its 20 recommendations are a different list: some repeat named principles, and it includes Goal-Gradient rather than the screenshot's Occam/Pareto ending. The linked Google Doc was also retrieved; it is a design-tool index, assessed [separately](2026-09-07-design-resource-index.md). Earlier statements below about not obtaining a creator download describe the initial reel review, not the later user-supplied text.

The list is useful as a vocabulary for hypotheses. It mixes motor-control and memory experiments, perceptual-organization principles, design heuristics, historical aphorisms, and management/economic rules. Those categories call for different uses: test a UI hypothesis with people and telemetry; do not turn a slogan into a hard product rule.

In particular, a Claude-flavored instruction or rule-list format is not exclusive to Claude, and its formatting does not establish that its claims are true or generally applicable. Treat the list as a starting point for scoped design decisions, then measure task success, error rate, time, comprehension, and accessibility in the relevant product.

## Evidence map

| Screenshot item | What the original or authoritative source supports | Calibration for product work |
| --- | --- | --- |
| 1. Hick / Hick–Hyman | Hick's 1952 choice-reaction experiment relates response time to information/number of alternatives under controlled conditions. [Hick (1952)](https://doi.org/10.1080/17470215208416600) is not a menu-item maximum. | Reduce unrelated choices at the decision point; preserve necessary choices with grouping, search, defaults, and progressive disclosure. |
| 2. Fitts | Fitts measured aimed hand movements; target distance and width affect movement time in that task. [Fitts (1954)](https://doi.org/10.1037/h0055392) does not supply one universal pixel size. | Make frequent or risky touch targets comfortably large and nearby. Validate against device, input method, and error rate. |
| 3. Jakob | “Users spend most of their time on other sites” is Jakob Nielsen's usability heuristic about learned conventions, not a general psychological law. [Nielsen (2009)](https://www.nngroup.com/articles/fresh-vs-familiar-aggressive-redesign/) states the case for familiarity while allowing redesign when architecture needs it. | Keep navigation, labels, controls, focus, and destructive-action patterns familiar; use NODEINE’s identity in artwork, not in basic interaction grammar. |
| 4. Proximity | Classical Gestalt grouping treats nearby elements as likely to be organized together; it is a perceptual principle, not permission to hide hierarchy. A modern authoritative review locates it in the Gestalt tradition. [Wagemans et al. (2012)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3482144/) | Group metadata with its artwork and actions with their consequence; maintain enough spacing that separate sections remain separate. |
| 5. Miller | Miller's 1956 paper concerns limits in several information-processing judgments. [Miller (1956)](https://pubmed.ncbi.nlm.nih.gov/13310704/) does **not** justify a rigid “seven menu items” rule. | Keep primary options comprehensible, but use user task evidence rather than forcing every list to 7±2. |
| 6. Doherty threshold | Doherty and Thadani's 1982 IBM paper argued for the economic value of rapid interactive response. [IBM’s performance-document archive](https://www.ibm.com/support/pages/zvm/perf/docs/index.html) retains the publication record; it is a historical performance target, not proof that every network task can finish within 400 ms. | Acknowledge input immediately, preserve an interactive shell, and expose honest pending/error states; optimize perceived and actual latency rather than faking completion. |
| 7. von Restorff | The 1933 isolation-effect work reports superior recall for a distinct item in a context. [von Restorff (1933)](https://doi.org/10.1007/bf02409636); the [APA Dictionary](https://dictionary.apa.org/distinctiveness-effect) gives the current definition. | Reserve visual contrast for one genuinely important action or state. If everything is exceptional, nothing is. |
| 8. “Minimize target distance” | This is a practical restatement of Fitts-style target-distance reasoning, not a separate discovered law in the supplied list. | Put frequent next actions near the object being acted on; never trade away safe separation between destructive and routine controls. |
| 9. Serial position | Murdock demonstrated primacy/recency structure in free recall of lists. [Murdock (1962)](https://doi.org/10.1037/h0045106) is evidence about recall paradigms, not a mandate to put every critical action at the end. | Make first and last actions legible; also support scanning, search, and stable labels so middle content is not disadvantaged. |
| 10. Peak–end | In an aversive-experience experiment, retrospective evaluation was strongly influenced by intense and final moments. [Kahneman et al. (1993)](https://doi.org/10.1111/j.1467-9280.1993.tb00589.x) does not mean manipulating endings is ethical or sufficient. | End a task with a clear, truthful success/error state and a sensible next step; do not conceal costs or failures to manufacture a “good ending.” |
| 11. Zeigarnik | Zeigarnik’s 1927 interrupted-task finding is historically important, but later replication/reinterpretation has been mixed. [MacLeod (2020)](https://doi.org/10.3758/s13421-020-01033-5) reviews what the original work did and did not establish. | Preserve drafts and show resumable work only when real; do not create artificial incompletion or pressure loops. |
| 12. Prägnanz | Gestalt Prägnanz is a preference for simple, stable organization in perception, not an instruction to remove necessary detail. [Wagemans et al. (2012)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3482144/) | Give pages one readable hierarchy and compositional idea; let artwork complexity remain artwork. |
| 13. Similarity | Similar appearance is a classical grouping cue, with interactions among cues rather than an absolute rule. [Wagemans et al. (2012)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3482144/) | Make same-purpose controls look and behave alike. Do not reuse danger styling for ordinary actions. |
| 14. Uniform connectedness | Palmer and Rock proposed that connected, homogeneous regions are initially perceived as units. [Palmer & Rock (1994)](https://doi.org/10.3758/BF03200760) is a specific perceptual account, not a mandate for card-heavy UI. | Use bounded surfaces when controls/data truly form one unit; avoid decorative containers around everything. |
| 15. Tesler | “Conservation of complexity” is a practitioner aphorism associated with Larry Tesler, not a quantified psychological law. | Move unavoidable complexity to the system where it is reversible and explainable; do not simply hide permissions, cost, or irreversibility. |
| 16. Postel | The robustness principle originated in network protocol design, not an unrestricted UX rule. [RFC 761](https://www.rfc-editor.org/rfc/rfc761) gives the original protocol formulation. | Be forgiving in display/parsing where safe; be strict in authentication, authorization, money, media, destructive actions, and stored data. |
| 17. Postel (duplicate) | This is the same item as #16, not independent evidence. | Do not count it twice when prioritizing. |
| 18. Parkinson | “Work expands…” is a 1955 management satire/observation, not an interaction experiment. [Parkinson (1955)](https://www.economist.com/news/1955/11/19/parkinsons-law) | Use time boxes and scope decisions for internal work; do not rush users through thoughtful creative or safety-sensitive tasks. |
| 19. Occam | Occam's razor is a philosophical preference for parsimony, not “fewest UI elements at any cost.” | Prefer the simplest model that preserves clarity, recovery, accessibility, and real domain constraints. |
| 20. Pareto | Pareto distributions are empirical distributions; “80/20” is not a guaranteed ratio for product behavior. | Instrument actual high-frequency tasks, then prioritize them without abandoning infrequent high-risk paths. |

## NODEINE: evidence already in the repository

These are implementation facts, not new proposals:

- The primary navigation is already four real destinations—Feed, Explore, Create, You—with secondary tasks grouped in section pages. [DESIGN.md](../../DESIGN.md) documents that decision and its route behavior.
- The interface contract sets 44px minimum controls; the existing implementation commonly uses Tailwind `min-h-11` (44px), for example in the Feed error retry and destination links. This is a touch-target policy, not an unsupported claim that Fitts provides a universal 44px number.
- Contextual controls already exist in group settings, including confirmation for removing/leaving. Whole-group deletion is now disabled in this review client pending a safer private-file cleanup protocol; this supersedes the earlier armed-delete flow. [group-settings-dialog.tsx](../../app/messages/group-settings-dialog.tsx) makes that boundary visible in source.
- The loading primitive is a real Suspense/pending state with one polite status, no timer, no fake progress, no loaded-content overlay, and a reduced-motion static alternative. [loading-screen-concept.md](../design/loading-screen-concept.md) records those boundaries.

## New, testable recommendations for NODEINE

1. Keep the four-way navigation model. Test its labels and current-route recognition at 320px, keyboard traversal, and direct deep links; do not add a fifth primary destination merely to satisfy a list length.
2. In dense art/detail and chat views, place the next reversible action near the selected artwork/message, but preserve separation and explicit confirmation for delete, leave, report, publish, or paid/provider actions.
3. Use a distinctive cyan treatment for one current primary action/state in a region, alongside text/shape/focus—not for several competing controls. Measure mis-taps and completion, particularly on mobile.
4. Keep grouping semantic: metadata belongs to its work, message controls to their message, and a dialog’s destructive action inside the dialog. Remove visual card borders that do not represent a real unit.
5. Continue real loading behavior: retain a useful shell or content-shaped skeleton, use the World Aperture only at genuine pending boundaries, and never impose a splash delay to meet a timing slogan.
6. For anything irreversible, show the effect, preserve cancel/recovery where possible, and distinguish completed, failed, and uncertain outcomes. The new voice-note delivery boundary is a concrete example: an unknown transport result is reconciled rather than presented as “not sent.”

## Transfer hypotheses for other named products

These are portable starting points, not claims about their current implementations; no other repository was inspected or changed.

| Product | Transferable idea | First validation question |
| --- | --- | --- |
| 108 Yokai — Fourth Portal | Use a small familiar entry/navigation grammar around the portal, while reserving the distinctive world art for the destination itself. | Can a first-time visitor identify where to enter, return, and resume without a tutorial? |
| Trinefield | Keep NODEINE’s outward link/context legible and use a short, truthful handoff state rather than a decorative loading interstitial. | Does the handoff preserve provenance and make the next destination unmistakable? |
| Biao | Apply progressive disclosure to operational choices and strict confirmation/reconciliation to impactful actions; do not use “be liberal in what you accept” for trusted data. | Which rare, high-consequence action currently lacks a clear review, cancel, or uncertain-outcome path? |

## Method and limits

- Read the local product contract and implementation evidence first. Used the required research and Agent Reach skills. Agent Reach’s Exa route was unavailable (`ERA_NEGOTIATION_FAILED`), so this review used the available web-search fallback plus original DOI/publisher/authoritative institutional records. Its Instagram CLI backend was unavailable; a later public-page browser check succeeded without signing in or installing anything.
- Sources above are intentionally bounded: original studies where a durable link was available, otherwise an authoritative publisher, institutional record, or scholarly review that identifies the original work. This is not an exhaustive literature review and does not establish effect sizes or applicability to every task, device, culture, or accessibility context.
- The public reel was visually sampled, not audio-transcribed. Its caption asks for a comment/follow to obtain Markdown instructions; neither action was taken. No Instagram account, private credential, creator document or production analytics was accessed. Recommendations marked “new” require product-specific usability and accessibility validation before implementation.
