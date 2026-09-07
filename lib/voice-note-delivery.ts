import type { MessageRow } from "@/app/messages/messages-types";
import {
  isUuid,
  MAX_VOICE_NOTE_BYTES,
  MAX_VOICE_NOTE_DURATION_MS,
} from "@/lib/voice-note-upload";

/** The browser-side contract for the authenticated voice-note route. */
export type VoiceNoteDeliveryRequest = {
  accessToken: string;
  conversationId: string;
  senderId: string;
  file: File;
  durationMs: number;
  endpoint?: string;
  fetchImpl?: VoiceNoteFetch;
};

export type VoiceNoteFetch = (
  input: string,
  init: RequestInit
) => Promise<Response>;

export class VoiceNoteDeliveryError extends Error {
  constructor(
    message: string,
    readonly outcome: "rejected" | "unknown"
  ) {
    super(message);
    this.name = "VoiceNoteDeliveryError";
  }
}

const DEFAULT_ENDPOINT = "/api/messages/voice";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function responseMessage(value: unknown, fallback: string) {
  if (!isRecord(value) || typeof value.error !== "string") return fallback;
  const message = value.error.trim();
  return message ? message.slice(0, 500) : fallback;
}

function isExpectedPrePersistenceRejection(status: number) {
  // These are the route's documented validation/auth/membership branches,
  // all reached before an audio object or message can be persisted.
  return [400, 401, 403, 413, 415].includes(status);
}

function validateRequest(request: VoiceNoteDeliveryRequest) {
  if (!request.accessToken.trim()) {
    throw new VoiceNoteDeliveryError("Sign in again to send a voice note.", "rejected");
  }
  if (!isUuid(request.conversationId) || !isUuid(request.senderId)) {
    throw new VoiceNoteDeliveryError("The conversation changed. Please reopen it before sending.", "rejected");
  }
  if (!Number.isSafeInteger(request.durationMs) || request.durationMs < 1 || request.durationMs > MAX_VOICE_NOTE_DURATION_MS) {
    throw new VoiceNoteDeliveryError("Voice notes can be at most 60 seconds.", "rejected");
  }
  if (!request.file || request.file.size <= 0 || request.file.size > MAX_VOICE_NOTE_BYTES) {
    throw new VoiceNoteDeliveryError("Voice notes must be 5 MiB or smaller.", "rejected");
  }
}

function voiceMessageFromResponse(
  value: unknown,
  expected: Pick<VoiceNoteDeliveryRequest, "conversationId" | "senderId">
): MessageRow {
  if (!isRecord(value)) {
    throw new VoiceNoteDeliveryError(
      "Voice-note delivery returned an invalid response. Check the conversation before retrying.",
      "unknown"
    );
  }

  const mime = value.attachment_mime;
  const extension = mime === "audio/webm" ? "webm" : mime === "audio/mp4" ? "m4a" : null;
  const path = value.attachment_path;
  const durationMs = value.voice_duration_ms;
  const pathPattern = extension
    ? new RegExp(
        `^${expected.conversationId}/voice/${expected.senderId}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.]${extension}$`,
        "i"
      )
    : null;

  if (
    typeof value.id !== "string" ||
    !isUuid(value.id) ||
    value.conversation_id !== expected.conversationId ||
    value.sender_id !== expected.senderId ||
    value.message_type !== "voice" ||
    value.body !== null ||
    value.artwork_id !== null ||
    typeof path !== "string" ||
    pathPattern === null ||
    !pathPattern.test(path) ||
    value.attachment_name !== null ||
    typeof durationMs !== "number" ||
    !Number.isSafeInteger(durationMs) ||
    durationMs < 1 ||
    durationMs > MAX_VOICE_NOTE_DURATION_MS ||
    !isIsoTimestamp(value.created_at) ||
    ("edited_at" in value && value.edited_at !== null && !isIsoTimestamp(value.edited_at)) ||
    ("removed_at" in value && value.removed_at !== null && !isIsoTimestamp(value.removed_at))
  ) {
    throw new VoiceNoteDeliveryError(
      "Voice-note delivery returned an invalid response. Check the conversation before retrying.",
      "unknown"
    );
  }

  return value as MessageRow;
}

/**
 * Posts one locally recorded note to the authenticated route. Once fetch has
 * been dispatched, ambiguity is intentional: callers must not assert that a
 * note was not sent unless this returns a confirmed `rejected` error.
 */
export async function deliverVoiceNote(
  request: VoiceNoteDeliveryRequest
): Promise<MessageRow> {
  validateRequest(request);

  const payload = new FormData();
  payload.set("conversationId", request.conversationId);
  payload.set("file", request.file);
  payload.set("durationMs", String(request.durationMs));

  let response: Response;
  try {
    response = await (request.fetchImpl ?? fetch)(request.endpoint ?? DEFAULT_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${request.accessToken}` },
      body: payload,
    });
  } catch {
    throw new VoiceNoteDeliveryError(
      "We could not confirm whether your voice note was sent. Check the conversation before trying again.",
      "unknown"
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new VoiceNoteDeliveryError(
      "Voice-note delivery returned an unreadable response. Check the conversation before trying again.",
      "unknown"
    );
  }

  if (!response.ok) {
    const message = responseMessage(body, "Voice-note delivery could not be confirmed. Check the conversation before retrying.");
    if (isExpectedPrePersistenceRejection(response.status)) {
      throw new VoiceNoteDeliveryError(message, "rejected");
    }
    throw new VoiceNoteDeliveryError(message, "unknown");
  }

  if (!isRecord(body) || !("message" in body)) {
    throw new VoiceNoteDeliveryError(
      "Voice-note delivery returned an invalid response. Check the conversation before retrying.",
      "unknown"
    );
  }

  return voiceMessageFromResponse(body.message, request);
}
