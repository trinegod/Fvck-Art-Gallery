# NODEINE chat and audio

**Status:** personal appearance verified; audio phases gated

## Outcome

Turn the approved artwork-first chat preview into readable, private conversations with artwork themes, voice notes, and a small audio-only room pilot.

## Canonical artifacts

- Wayfinder map: Not required for the settled themes/voice-note slices; provider activation remains a separate gate.
- Testing checklist: [NODEINE chat rollout #1](https://github.com/trinegod/Fvck-Art-Gallery/issues/1).
- Audio implementation spec/tickets: not yet published; provider and schema activation remain separate decisions.
- Visual study: [`codex/chat-visual-study`](https://github.com/trinegod/Fvck-Art-Gallery/tree/codex/chat-visual-study), preserved outside the release source.
- Foundation assessment: Draft pending publication with spec.
- Domain glossary: Created lazily.
- ADRs: Created lazily.

## Current frontier

The owner approved implementation, confirmed NODEINE branding, and signed in to complete the real-inbox audit. Personal appearance is implemented and authenticated interaction is verified on desktop and narrow/short viewports. Blocked storage and key isolation are tested through the production store seam. See `docs/audits/2026-09-07-chat-release.md` for evidence and limits. The public GitHub checklist tracks release completion and the remaining physical-device acceptance pass. Voice notes and real rooms are not implemented or activated.

## Owner decisions needed

- Production database changes and live-audio provider activation need separate authorization.
- Physical-device keyboard and two-account/two-device acceptance require appropriate test sessions; do not create fake conversation activity to manufacture proof.

## Notes

- GitHub Issues is canonical; this index links to published artifacts without duplicating them.
- Default visual direction: artwork-first Atelier (variant A). Protect sender labels and timestamps as well as bubble text.
- Direct and group text chats already exist. Keep them working throughout the upgrade.
- Keep paid image generation outside this chat update.
