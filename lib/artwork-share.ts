import type { MessageRow } from "../app/messages/messages-types";

export type ArtworkShareResult =
  | { status: "sent" }
  | { status: "failed" | "unconfirmed"; message: string };

type ArtworkShareTarget = {
  conversationId: string;
  senderId: string;
  artworkId: string;
};

type ArtworkShareError = { code?: string; message?: string } | null;

export const UNCONFIRMED_ARTWORK_SHARE =
  "Delivery could not be confirmed. Check the conversation before sharing this artwork again.";

/** A returned row, not a completed request, confirms delivery to this chat. */
export function classifyArtworkShareResponse(
  data: unknown,
  error: ArtworkShareError,
  expected: ArtworkShareTarget
): { status: "sent"; message: MessageRow } | Exclude<ArtworkShareResult, { status: "sent" }> {
  if (error) {
    const code = error.code ?? "";
    // Constraint, permission, syntax and explicit transaction rejection codes
    // describe rolled-back writes. Transport and singular-response errors do
    // not prove that a message was not persisted.
    const rejected = /^(?:22|23|28|42|P0)[0-9A-Z]{3}$/.test(code) ||
      ["40001", "40P01", "57014", "PGRST100", "PGRST102", "PGRST106", "PGRST107", "PGRST204"].includes(code);
    return rejected
      ? { status: "failed", message: error.message?.trim() || "Artwork was not shared. Please try again." }
      : { status: "unconfirmed", message: UNCONFIRMED_ARTWORK_SHARE };
  }

  const message = data && typeof data === "object" && !Array.isArray(data)
    ? data as Record<string, unknown> : null;
  if (!message ||
    typeof message.id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(message.id) ||
    message.conversation_id !== expected.conversationId ||
    message.sender_id !== expected.senderId ||
    message.artwork_id !== expected.artworkId ||
    message.message_type !== "artwork" ||
    message.body !== null ||
    message.attachment_path !== null ||
    message.attachment_mime !== null ||
    message.attachment_name !== null ||
    (message.voice_duration_ms != null) ||
    (message.removed_at != null) ||
    typeof message.created_at !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(message.created_at) ||
    !Number.isFinite(Date.parse(message.created_at))) {
    return { status: "unconfirmed", message: UNCONFIRMED_ARTWORK_SHARE };
  }
  return { status: "sent", message: message as MessageRow };
}
