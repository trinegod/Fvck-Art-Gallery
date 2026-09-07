# Publishing and artwork-backed chat research

Date: 2026-09-06. Research and recommendations only, not an approved implementation spec. No app-store enrollment, paid service, live database migration, microphone capture, or deployment was performed.

## Distribution options and costs

NoDine currently has a Next.js web application. A repository search found no app web manifest or service worker; the JSON manifests under `scripts/` are artwork import data, not an installable-app configuration.

- **Web / installable web app:** continue distributing by URL, and add a tested progressive web app (PWA) installation experience. A PWA can launch from a home-screen icon with a standalone display mode. Installation differs by browser; on supported iOS versions it uses the Share menu, not the Chromium install prompt. Direct web distribution does not require an app-store enrollment. It still requires hosting and does not automatically deliver every native/background capability. [MDN installation guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- **Apple App Store:** Apple Developer Program membership is USD $99 per year, with local pricing and some eligibility-based waivers. Packaging, signing, device testing, listing preparation, and review are separate work; membership is not an approval guarantee. [Apple enrollment](https://developer.apple.com/programs/enroll/)
- **Google Play:** USD $25 one-time registration, with identity/device verification and additional testing requirements for new personal accounts. [Play Console registration](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en), [personal-account testing](https://support.google.com/googleplay/android-developer/answer/14151465)

Apple requires useful app-like functionality beyond a repackaged website. Its user-generated-content rules also require moderation, reporting, blocking, and contact information. These are launch-readiness checks, not proof that NoDine already satisfies every requirement. [Apple review guidelines, sections 1.2 and 4.2](https://developer.apple.com/app-store/review/guidelines/)

### Running costs are separate

Vercel Pro currently starts at $20/month and Supabase Pro at $25/month. A one-developer, one-small-project configuration therefore has an illustrative $45/month base, before taxes, domain costs where applicable, extra usage, services, and AI generation. This is not a reading of the owner's bill or a required upgrade today. Vercel Hobby is restricted to personal, non-commercial use. [Vercel pricing](https://vercel.com/pricing), [Hobby restrictions](https://vercel.com/docs/plans/hobby), [Supabase pricing](https://supabase.com/pricing)

LiveKit's Build plan currently lists $0/month with finite allowances, including 5,000 WebRTC end-user connection minutes and 50 GB downstream transfer. Ten people connected for twenty minutes consume roughly 200 connection minutes, not twenty. Its Ship plan starts at $50/month; allowances and usage charges must be rechecked before activation. An audio-only conversation among humans does not itself require an AI voice agent or language model. [LiveKit pricing](https://livekit.com/pricing)

## Current chat evidence

Source inspected: `app/messages/messages-types.ts`, `app/messages/messages-view.tsx`, `app/messages/group-settings-dialog.tsx`, and the message/storage constraints in `supabase/group-chat-expansion.sql`.

- Direct and group conversations already exist, with text, artwork cards, and image/video attachments.
- The message type union and SQL constraint do not yet include voice messages. Conversation types do not yet contain artwork-theme fields.
- Outgoing text bubbles are opaque cyan; incoming bubbles use translucent `bg-white/[0.045]`. Media cards use `bg-black/40`.
- Sender names and timestamps are outside the bubbles. Protecting only the main message body would leave those labels vulnerable over artwork.
- There is already a private conversation-media storage path and membership model to build on. This inspection is not a deployed security-policy test.

## Proposed readability direction

Preserve the project's dark/cyan design system while treating the artwork as decoration behind independently readable interface surfaces:

1. Use a static artwork layer and adjustable dimming; avoid motion behind conversations.
2. Use opaque incoming and outgoing message surfaces. Allow curated, contrast-tested color pairs rather than arbitrary text/background combinations.
3. Put sender labels, timestamps, captions, errors, and voice playback controls on protected surfaces too. A dimmer alone does not guarantee readability.
4. Keep the header and composer opaque, with a personal plain-background option that does not change other members' settings.
5. Preserve artwork credit and its source link. Start with owner-supplied or explicitly permitted artwork; visibility in a gallery is not permission for every reuse. Decide deletion/private-artwork fallbacks before persisting themes.

For normal-size text, target at least 4.5:1 contrast against the actual rendered surface, including secondary labels. Color alone must not be the only way to identify a sender: preserve names and alignment. [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [W3C use-of-color guidance](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)

Verification should include bright, dark, and densely patterned backgrounds; long messages and names; unavailable artwork; text zoom; narrow screens and the keyboard-open layout. Proposed voice/live-room behavior and permission boundaries are in `2026-09-06-chat-audio-feasibility.md`. No readability or audio feature has been implemented by this research.

## Recommendation

Validate artwork themes and voice notes in the existing web app first, followed by an invite-only, capped audio-room pilot with recording disabled. An installable web experience is a separate, lower-commitment distribution step to evaluate before app-store packaging. These are recommendations to approve, not decisions made on the owner's behalf.
