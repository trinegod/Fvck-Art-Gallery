# Chat experience — throwaway visual study

Date: September 6–7, 2026. Status: owner approved the Atelier visual direction; NODEINE spelling confirmed. Archived on `codex/chat-visual-study`, outside the release branch.

Question: should artwork conversations prioritize immersive chat, a separate art canvas, or a small audio-first salon?

Run `npm run preview:chat`, then open:

- Atelier: http://127.0.0.1:3001/messages?prototype=chat&variant=A
- Gallery: http://127.0.0.1:3001/messages?prototype=chat&variant=B
- Salon: http://127.0.0.1:3001/messages?prototype=chat&variant=C

The original inbox remains `/messages`. The prototype branch of that route runs only in development. It does not replace the published inbox. Its extra bottom switcher is a temporary design-review tool, not a proposed second navigation row.

## What can be tried

- Three structurally different layouts, selected through the URL or temporary bottom switcher.
- Personal artwork visibility and three opaque outgoing bubble palettes. The Atelier layout also supports background dimming.
- Sample text added only to memory; refresh clears it.
- Simulated record/stop/preview/discard/add-note controls, with an explicit microphone-OFF state.
- Simulated room join/leave/request-to-speak; all participants are fictional.
- A manually opened launch-screen concept using the current name; this is not a timed app-entry gate or finalized logo.

The artwork is the existing Ashigara archive asset. Names, timestamps, captions, and message bodies sit on opaque surfaces. The design-system direction preserves NODEINE's near-black, cyan, restrained-border identity.

## Boundaries

This is a UI prototype, not production chat or audio implementation. There are no microphone calls, audio playback, provider requests, uploads, messaging writes, account creation, or local storage in the prototype component. Existing shared navigation and the root app shell retain their normal behavior. No image-generation integration, billing, theme persistence, live-room moderation, or new artwork-comment feature was added.

Real audio features still need backend authorization, media validation, cross-device audio testing, and failure/recovery checks. Do not market the simulated controls as working services. The archive preserves the complete study separately from main. The real personal-appearance slice lives in the normal inbox on the implementation branch. It does not enable shared themes or audio.

## Verification evidence

- Targeted ESLint and project TypeScript checks passed after the prototype changes.
- Browser interactions: hide artwork, change palette, add a sample message, simulated voice stop/add, room join/request/leave, layout switching, and launch-screen dialog open/close.
- 390px-wide Atelier interaction check had a 390px document width.
- 320px Gallery check had a 320px document width. A 6px Salon overflow was identified and corrected by constraining the grid and reducing participant spacing; final 320px checks are recorded in the task output.
- Calculated WCAG luminance contrast for the configured opaque pairs: Glacier 11.76:1, Orchid 10.17:1, Ember 10.31:1, incoming body 12.51:1, incoming labels 8.85:1. These measurements do not establish whole-app accessibility compliance.
- Reduced-motion CSS disables the prototype launch spinner. Physical-device audio, keyboard-open viewport behavior, production build, and backend security were not tested as part of this visual study.

## Planning status

The owner selected GitHub Issues and default triage labels. The implementation and remaining release gates are tracked in [NODEINE chat rollout — verification and release checklist](https://github.com/trinegod/Fvck-Art-Gallery/issues/1). This prototype performs no production deployment or audio activation.
