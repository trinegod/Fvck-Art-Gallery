# Inline voice messaging: official references

Researched September 7, 2026 for NODEINE's owner-requested change from a voice dialog plus a second Record action to direct, inline recording. This is public-document research, not live Instagram/WhatsApp UI inspection or physical-device testing.

## Access and evidence boundary

The Agent Reach skill's diagnostic found no installed Instagram-session backend. Its configured Exa search failed to connect, and its Jina Reader route failed DNS resolution. Public official pages and indexed Help Center content were therefore read through the available web tool. No app/account session, cookies, private chat, microphone, installation, or external write was used. Agent Reach's optional update check also failed DNS; no update was installed.

The WhatsApp Help Center exposes platform-specific instructions; several indexed pages return English instructional content under localized navigation. Links below preserve the actually retrieved platform variants. Treat the dated announcements as evidence of documented feature patterns, not proof that every current device presents the same controls.

## Relevant official patterns

| Reference | What the source establishes | NODEINE implication |
| --- | --- | --- |
| [WhatsApp Help Center: preview a voice message, Web](https://faq.whatsapp.com/1044960269529733/?cms_platform=web&locale=et_EE) | Within an individual or group chat, click the microphone and speak; pause, listen/seek, then delete, continue, or send. | One deliberate microphone action can enter recording directly. Keep stop/preview, discard, and explicit Send in the conversation. A second Record confirmation is not necessary to express consent. |
| [WhatsApp Help Center: send voice messages, Android](https://faq.whatsapp.com/657157755756612/?category=5245251&cms_platform=android&locale=hr_HR) | The mobile hold gesture and hands-free lock are different from Web; releasing a held recording can send, while hands-free recording offers pause/preview. | Do not infer identical click/touch behavior across platforms. NODEINE's owner asked for explicit controls, so do not add release-to-send or a hidden cancellation gesture. |
| [WhatsApp: Making Voice Messages Better, March 30, 2022](https://blog.whatsapp.com/making-voice-messages-better) | The announcement documents waveform visualization, draft preview, pause/resume, retained playback position, and speed controls. | A compact signal visualization and optional local preview are familiar patterns. They do not authorize fake audio-reactive animation or require implementing every playback feature now. |
| [Instagram DM Updates, March 4, 2024](https://about.fb.com/news/2024/03/instagram-dm-updates/) | Voice messages can be used in replies; chat themes are chosen through the conversation name. | Keep voice messages visually part of the chat and apply NODEINE's existing viewer-selected palette. This article does not verify Instagram's current recording-start gesture or exact recorder geometry. |
| [Instagram DM Features, February 19, 2025](https://about.fb.com/news/2025/02/new-instagram-dm-features-stay-connected/) | Group invitations can be reached from the group name; the article also documents group QR invitations and contextual pinned content. | Keep group management near the group identity. Public invite links, QR codes, and pinning are separate product features, not requirements for this inline-voice repair. |
| [WhatsApp Help Center: create a group, Web](https://faq.whatsapp.com/3242937609289432/?cms_platform=web&locale=te_IN) | The creation path explicitly exposes New chat → New group, then contact selection and group setup. | A plainly named group entry is more discoverable than relying on an unlabeled plus alone. Reuse NODEINE's existing group creation flow. |

No primary source retrieved in this bounded pass established Instagram's current recording duration limit or a current pixel-exact capture interface. No such claim should be made from this research. The reference products' encryption, recipient rules, limits, and delivery guarantees must not be attributed to NODEINE.

## Proposed NODEINE contract and audit cases

These are project-specific recommendations derived from the owner's request and the documented patterns, not claims about the reference apps:

- A microphone click/keyboard activation initiates one capture attempt. The inline bar distinguishes requesting permission, recording, finalizing, preview, sending, and recoverable failure. Never show an active timer before capture actually begins.
- Preserve the text draft while recording. Keep Cancel/Discard, Stop/Preview, and explicit Send clear; stopping alone must not publish. A stopped audio blob is ready only after the recorder's completion event, not immediately after calling `stop()`.
- Meter motion must use real captured signal. Silence should remain quiet; reduced motion must not remove the recording state, elapsed time, or controls. Avoid repeatedly announcing a timer or meter value to screen readers.
- Cancel during permission prompts, delayed grants, rapid repeated clicks, account/conversation changes, route departure, and unmount must stop or invalidate the old attempt. Stop tracks, release analyser/audio resources, and revoke local preview URLs. Cancellation should restore focus without erasing unrelated text.
- Keep the existing duration/upload limits and uncertain-delivery handling. Permission to record is not permission to upload; an unconfirmed response is not proof that sending failed or that retrying is safe.
- Direct and group chats use the same capture surface. Test 320px, 390px, short landscape, and 200% root text; keep all action targets at least 44px without horizontal overflow. Long errors may wrap below the bar. Browser-width checks do not establish physical-phone keyboard behavior.
- Sent voice notes should use the actual outgoing/incoming palette, opaque readable surfaces, duration/playback feedback, and accessible actions. Do not autoplay or label a decorative timeline as the recording's true waveform.

## Current group discoverability checkpoint

At the start of this pass, the existing source offered Inbox `+` (accessible name **Start a new message**) → **Group chat** → name and at least two invitees → **Create group**. Group settings were under **Conversation options**. These capabilities already existed; the difficulty was discovering them before opening a message-oriented control. A visible **New group** shortcut can reuse the same dialog and state without introducing a second group-creation implementation. This is a source-inspection finding, not a new live group exchange or an invitation sent during research.
