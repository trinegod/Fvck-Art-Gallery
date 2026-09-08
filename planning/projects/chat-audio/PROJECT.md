# NODEINE chat and audio

**Status:** private voice notes and message controls activated; receiver/mentions release in verification; live rooms gated

## Outcome

Turn the approved artwork-first chat preview into readable, private conversations with artwork themes, voice notes, and a small audio-only room pilot.

## Canonical artifacts

- Wayfinder map: Not required for the settled themes/voice-note slices; provider activation remains a separate gate.
- Testing checklist: [NODEINE chat rollout #1](https://github.com/trinegod/Fvck-Art-Gallery/issues/1).
- Implemented voice-note and message-control evidence: `docs/VOICE_NOTES_ROLLOUT.md`, `docs/MESSAGE_CONTROLS_ROLLOUT.md`, and the current receiver audit. Live-room provider/spec/tickets remain a separate decision.
- Visual study: [`codex/chat-visual-study`](https://github.com/trinegod/Fvck-Art-Gallery/tree/codex/chat-visual-study), preserved outside the release source.
- Foundation assessment: Draft pending publication with spec.
- Domain glossary: Created lazily.
- ADRs: Created lazily.

## Current frontier

Personal appearance, five-minute/4 MiB private voice notes, waveform seeking/speed, personal mute, and visibility-based Seen are implemented and activated. The owner explicitly approved message-controls permission tightening on September 8; Edit/Remove/Clear and the separately rehearsed mention migration are active. The actual designated receiver accepted a group invitation, read the founder's direct reply with Seen, and exercised its own test-message lifecycle. Group invitations remain opt-in; direct-add and OS push are not implemented. See `docs/audits/2026-09-08-group-receiver-and-controls.md` and the canonical GitHub checklist for release evidence and device/concurrency limits. Real audio rooms remain unimplemented and require a separate provider decision.

## Owner decisions needed

- The message-controls and group-mention migrations were authorized and applied; further database changes and live-audio provider activation need their own authorization.
- Physical-device keyboard and two-account/two-device acceptance require appropriate test sessions; do not create fake conversation activity to manufacture proof.

## Notes

- GitHub Issues is canonical; this index links to published artifacts without duplicating them.
- Default visual direction: artwork-first Atelier (variant A). Protect sender labels and timestamps as well as bubble text.
- Direct and group text chats already exist. Keep them working throughout the upgrade.
- Keep paid image generation outside this chat update.
