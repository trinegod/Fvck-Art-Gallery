# Chat audio feasibility

Date: 2026-09-06. Research only; no audio feature, provider, billing, microphone access, or application changes were enabled.

## Two distinct features

**Voice notes:** record a short message, preview it, then explicitly send it into a conversation. Browser microphone capture requires a secure context such as HTTPS and user permission. Permission can be denied or left unanswered, so the UI needs cancel and recovery states. An audio-only request should not request the camera. [MDN: getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

`MediaRecorder` produces recorded media blobs and exposes `isTypeSupported()` for checking a proposed recording MIME type. The browser's recording format must be preserved; changing a file extension does not convert its codec. MDN demonstrates local playback with an audio element and an object URL. [MDN: MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)

**Integration recommendation:** support record → stop → preview → discard/send, a duration and size cap, microphone cleanup on cancel/navigation/logout, and clear upload failure/retry. Upload only after Send into member-authorized private storage, with corresponding conversation authorization on playback. Validate media server-side. Test recording and receiving across mobile Safari, Chrome, and Firefox; successful recording on one device does not prove cross-device playback. Transcription would be a separate optional accessibility feature, with separate disclosure and costs.

**Live audio rooms:** people speak together in real time; they are not recorded voice notes or an AI voice generator. LiveKit is one feasible infrastructure candidate. Its grants can permit listening without publishing and restrict speakers to microphone tracks. The application can therefore model listeners, speakers, and hosts without enabling video. Room-scoped grants are enforceable permissions, not merely hidden buttons. [LiveKit: tokens and grants](https://docs.livekit.io/frontends/reference/tokens-grants/)

LiveKit supports promoting a listener to speaker, revoking publishing, muting tracks, and removing participants through server APIs. Remote unmute is disabled by default. [LiveKit: participant management](https://docs.livekit.io/intro/basics/rooms-participants-tracks/participants/)

**Integration recommendation:** join as a listener; request to speak; host approves; participant explicitly unmutes. Add leave/end-room, reporting/blocking, host removal, reconnection states, and an always-visible microphone indicator. Artwork could be pinned beside the discussion, enabling critiques or art showdowns without video. Recording should be off by default and a separate, clearly disclosed choice.

## Access and cost boundaries

Mint room-scoped, short-lived participant tokens on an authenticated backend after checking membership, role, and bans. Keep the provider API secret on the server. The server SDK explicitly warns against exposing secrets in clients. [LiveKit: JavaScript server SDK](https://docs.livekit.io/reference/server-sdk-js/)

Short token expiry is not a replacement for moderation: LiveKit refreshes connected clients' tokens; Cloud revocation and self-hosted token behavior differ. Application bans must also prevent the backend issuing another token. [LiveKit: token lifecycle](https://docs.livekit.io/frontends/reference/tokens-grants/)

Costs depend on connected-user time and downstream transfer, with recording/export adding separate consumption. The current pricing page lists WebRTC minutes per end user: twenty people connected for thirty minutes represent approximately 600 connection-minutes, not thirty. This is a usage illustration, not a quote. Free allowances are finite. [LiveKit: pricing](https://livekit.com/pricing), [LiveKit: billing](https://docs.livekit.io/deploy/admin/billing/)

**Recommendation:** establish chat reliability and membership controls first, then voice notes, then a capped live-room pilot. Decide participant limits, room duration, budget alerts, retention, and moderation before enabling public rooms. No signup or paid integration was authorized by this research.

## Acquisition note

Used the Agent Reach web-reader route first. Jina failed DNS resolution; its documented web-reader MCP alternative was not configured. Official documentation was then read through the available web tool. No login or access restriction was bypassed. This is feasibility evidence, not an implemented-feature test or a complete security review.
