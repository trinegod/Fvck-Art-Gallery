import assert from "node:assert/strict";
import test from "node:test";
import {
  deliverVoiceNote,
  VoiceNoteDeliveryError,
  type VoiceNoteFetch,
} from "../lib/voice-note-delivery";

const conversationId = "60f1ec6b-8258-45f1-98f1-6a507008b621";
const senderId = "b02ee353-ecf4-42df-bd3b-d45bfb6e234e";
const messageId = "fb2a0d85-8c04-4c22-9b45-054a1e4d930a";

function noteFile() {
  return new File(["voice"], "voice-note.webm", { type: "audio/webm;codecs=opus" });
}

function voiceMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: messageId,
    conversation_id: conversationId,
    sender_id: senderId,
    body: null,
    message_type: "voice",
    artwork_id: null,
    attachment_path: `${conversationId}/voice/${senderId}/${messageId}.webm`,
    attachment_mime: "audio/webm",
    attachment_name: null,
    voice_duration_ms: 1000,
    created_at: "2026-09-07T12:00:00.000Z",
    ...overrides,
  };
}

function response(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function deliveryRequest(fetchImpl: VoiceNoteFetch) {
  return {
    accessToken: "session-token",
    conversationId,
    senderId,
    file: noteFile(),
    durationMs: 1000,
    fetchImpl,
  };
}

async function expectOutcome(
  operation: Promise<unknown>,
  outcome: "rejected" | "unknown"
) {
  await assert.rejects(operation, (error: unknown) => {
    assert.ok(error instanceof VoiceNoteDeliveryError);
    assert.equal(error.outcome, outcome);
    return true;
  });
}

test("posts authenticated multipart data and accepts only a matching voice message", async () => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  const file = noteFile();
  const message = await deliverVoiceNote(
    {
      accessToken: "session-token",
      conversationId,
      senderId,
      file,
      durationMs: 1000,
      fetchImpl: async (url, init) => {
        requestUrl = url;
        requestInit = init;
        return response(200, { message: voiceMessage() });
      },
    }
  );

  assert.equal(requestUrl, "/api/messages/voice");
  assert.equal((requestInit?.headers as Record<string, string>).Authorization, "Bearer session-token");
  assert.ok(requestInit?.body instanceof FormData);
  assert.equal((requestInit?.body as FormData).get("conversationId"), conversationId);
  assert.equal((requestInit?.body as FormData).get("durationMs"), "1000");
  assert.equal((requestInit?.body as FormData).get("file"), file);
  assert.deepEqual(message, voiceMessage());
});

test("only route-contract pre-persistence 4xx responses are confirmed rejections", async () => {
  await expectOutcome(
    deliverVoiceNote(deliveryRequest(async () => response(415, { error: "Voice notes must be WebM or MP4." }))),
    "rejected"
  );
  await expectOutcome(
    deliverVoiceNote(deliveryRequest(async () => response(429, { error: "Try later." }))),
    "unknown"
  );
});

for (const durationMs of [1, 300000, 0, 300001]) {
  test(`delivery enforces the five-minute boundary before dispatch at ${durationMs}ms`, async () => {
    let calls = 0;
    const operation = deliverVoiceNote({
      ...deliveryRequest(async (_url, init) => {
        calls += 1;
        assert.equal((init?.body as FormData).get("durationMs"), String(durationMs));
        return response(200, { message: voiceMessage({ voice_duration_ms: durationMs }) });
      }),
      durationMs,
    });
    if (durationMs === 1 || durationMs === 300000) {
      assert.equal((await operation).voice_duration_ms, durationMs);
      assert.equal(calls, 1);
    } else {
      await assert.rejects(operation, (error: unknown) => {
        assert.ok(error instanceof VoiceNoteDeliveryError);
        assert.equal(error.outcome, "rejected");
        assert.match(error.message, /5 minutes/);
        return true;
      });
      assert.equal(calls, 0);
    }
  });
}

test("transport, unreadable JSON, and every 5xx response preserve an unknown outcome", async () => {
  await expectOutcome(
    deliverVoiceNote(deliveryRequest(async () => { throw new TypeError("network down"); })),
    "unknown"
  );
  await expectOutcome(
    deliverVoiceNote(deliveryRequest(async () => ({
      ok: true,
      status: 200,
      json: async () => { throw new SyntaxError("invalid JSON"); },
    } as unknown as Response))),
    "unknown"
  );
  await expectOutcome(
    deliverVoiceNote(deliveryRequest(async () => response(503, {
      error: "We could not confirm whether your private audio was sent. Check the conversation before trying again.",
    }))),
    "unknown"
  );
  await expectOutcome(
    deliverVoiceNote(deliveryRequest(async () => response(502, { error: "Voice note could not be sent." }))),
    "unknown"
  );
});

test("a malformed or mismatched success payload cannot be treated as sent", async () => {
  await expectOutcome(
    deliverVoiceNote(deliveryRequest(async () => response(200, { message: voiceMessage({ sender_id: messageId }) }))),
    "unknown"
  );
  await expectOutcome(
    deliverVoiceNote(deliveryRequest(async () => response(200, { message: voiceMessage({ attachment_path: "avatars/other.webm" }) }))),
    "unknown"
  );
  await expectOutcome(
    deliverVoiceNote(deliveryRequest(async () => response(200, { error: "missing message" }))),
    "unknown"
  );
});

test("invalid local targets reject before a request is dispatched", async () => {
  let calls = 0;
  await expectOutcome(
    deliverVoiceNote({
      ...deliveryRequest(async () => {
        calls += 1;
        return response(200, { message: voiceMessage() });
      }),
      conversationId: "not-a-uuid",
    }),
    "rejected"
  );
  assert.equal(calls, 0);
});

test("a file one byte over 4 MiB is a confirmed local rejection without network delivery", async () => {
  let calls = 0;
  await assert.rejects(
    deliverVoiceNote({
      ...deliveryRequest(async () => {
        calls += 1;
        return response(200, { message: voiceMessage() });
      }),
      file: new File([new Uint8Array(4 * 1024 * 1024 + 1)], "voice-note.webm", { type: "audio/webm" }),
    }),
    (error: unknown) => {
      assert.ok(error instanceof VoiceNoteDeliveryError);
      assert.equal(error.outcome, "rejected");
      assert.match(error.message, /4 MiB/);
      return true;
    },
  );
  assert.equal(calls, 0);
});
