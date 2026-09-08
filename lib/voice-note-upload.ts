export const VOICE_NOTE_BUCKET = "conversation-voice-notes";
// Keep the complete multipart request below Vercel's 4.5 MB function limit.
export const MAX_VOICE_NOTE_BYTES = 4 * 1024 * 1024;
export const MAX_MULTIPART_BODY_BYTES = MAX_VOICE_NOTE_BYTES + 64 * 1024;
export const MAX_VOICE_NOTE_DURATION_MS = 300_000;

export type VoiceNoteContainer = {
  mime: "audio/webm" | "audio/mp4";
  extension: "webm" | "m4a";
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return uuidPattern.test(value);
}

function mimeWithoutParameters(value: string): string {
  return value.toLowerCase().split(";", 1)[0]?.trim() ?? "";
}

function startsWith(bytes: Uint8Array, expected: readonly number[]): boolean {
  return expected.every((value, index) => bytes[index] === value);
}

function hasAscii(bytes: Uint8Array, value: string): boolean {
  const expected = [...value].map((character) => character.charCodeAt(0));
  return bytes.some((_, start) => startsWith(bytes.subarray(start), expected));
}

function hasWebmSignature(bytes: Uint8Array): boolean {
  return startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3]) && hasAscii(bytes, "webm");
}

function hasMp4Signature(bytes: Uint8Array): boolean {
  return bytes.length >= 12 && startsWith(bytes.subarray(4), [0x66, 0x74, 0x79, 0x70]);
}

/**
 * Validates the MIME selected by the recorder against a container header, not
 * an extension or a browser-provided file name. This is intentionally a
 * container check; it does not pretend to prove track duration or decode audio.
 */
export async function inspectVoiceNoteFile(file: File): Promise<VoiceNoteContainer> {
  if (file.size <= 0) throw new Error("Voice note file is empty.");
  if (file.size > MAX_VOICE_NOTE_BYTES) throw new Error("Voice notes must be 4 MiB or smaller.");

  const mime = mimeWithoutParameters(file.type);
  const bytes = new Uint8Array(await file.slice(0, 4096).arrayBuffer());

  if (mime === "audio/webm" && hasWebmSignature(bytes)) {
    return { mime: "audio/webm", extension: "webm" };
  }
  if (mime === "audio/mp4" && hasMp4Signature(bytes)) {
    return { mime: "audio/mp4", extension: "m4a" };
  }

  throw new Error("Voice notes must be recorded as WebM or MP4 audio.");
}

export function parseVoiceDurationMs(value: FormDataEntryValue | null): number {
  if (typeof value !== "string" || !/^\d{1,6}$/.test(value)) {
    throw new Error("Voice note duration is invalid.");
  }

  const durationMs = Number(value);
  if (!Number.isSafeInteger(durationMs) || durationMs < 1 || durationMs > MAX_VOICE_NOTE_DURATION_MS) {
    throw new Error("Voice notes can be at most 5 minutes.");
  }

  return durationMs;
}

export function buildVoiceNotePath(
  conversationId: string,
  senderId: string,
  container: VoiceNoteContainer,
  objectId = crypto.randomUUID(),
): string {
  if (!isUuid(conversationId) || !isUuid(senderId) || !isUuid(objectId)) {
    throw new Error("Voice note storage identifiers must be UUIDs.");
  }

  return `${conversationId}/voice/${senderId}/${objectId}.${container.extension}`;
}

/** Reads an incoming multipart body with an exact cap before form parsing. */
export async function readBoundedRequestBody(request: Request, limit = MAX_MULTIPART_BODY_BYTES): Promise<Uint8Array> {
  const advertisedLength = request.headers.get("content-length");
  if (advertisedLength !== null && (!/^\d+$/.test(advertisedLength) || Number(advertisedLength) > limit)) {
    throw new Error("Voice note request is too large.");
  }
  if (!request.body) throw new Error("Voice note request body is missing.");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) {
      await reader.cancel();
      throw new Error("Voice note request is too large.");
    }
    chunks.push(value);
  }

  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
