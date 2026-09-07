import type { MessageRow } from "@/app/messages/messages-types";

export type MessageActionsRpcError = {
  message?: string;
  code?: string;
};

export type MessageActionsRpcClient = {
  rpc: (
    functionName: string,
    arguments_: Record<string, unknown>
  ) => PromiseLike<{ data: unknown; error: MessageActionsRpcError | null }>;
};

export type MessageControls = {
  enabled: boolean;
  clearedBefore: string | null;
  reason?: string;
};

export type UpdatedMessage = MessageRow & {
  edited_at?: string | null;
  removed_at?: string | null;
};

export type MessageActionTarget = Pick<
  MessageRow,
  "id" | "conversation_id" | "sender_id"
>;

export type RemovedAttachment = {
  bucket: "conversation-media" | "conversation-voice-notes";
  path: string;
};

export type RemoveMessageResult = {
  message: UpdatedMessage;
  removedAttachment: RemovedAttachment | null;
};

export class MessageActionError extends Error {
  constructor(
    message: string,
    readonly outcome: "rejected" | "unknown"
  ) {
    super(message);
    this.name = "MessageActionError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function checkedMessageTarget(message: MessageActionTarget) {
  if (
    !isUuid(message.id) ||
    !isUuid(message.conversation_id) ||
    !isUuid(message.sender_id)
  ) {
    throw new MessageActionError(
      "The message identifier is invalid. Refresh the conversation before trying again.",
      "rejected"
    );
  }
  return message;
}

function messageFromRpc(
  value: unknown,
  expected: MessageActionTarget
): UpdatedMessage {
  if (
    !isRecord(value) ||
    !isUuid(value.id) ||
    !isUuid(value.conversation_id) ||
    !isUuid(value.sender_id) ||
    value.id !== expected.id ||
    value.conversation_id !== expected.conversation_id ||
    value.sender_id !== expected.sender_id ||
    !isIsoTimestamp(value.created_at) ||
    ("edited_at" in value &&
      value.edited_at !== null &&
      !isIsoTimestamp(value.edited_at)) ||
    ("removed_at" in value &&
      value.removed_at !== null &&
      !isIsoTimestamp(value.removed_at)) ||
    (typeof value.body !== "string" && value.body !== null) ||
    !["text", "artwork", "image", "video", "voice"].includes(
      String(value.message_type)
    )
  ) {
    throw new MessageActionError(
      "Message controls returned an invalid message response. Refresh the conversation before trying again.",
      "unknown"
    );
  }
  return value as UpdatedMessage;
}

function errorOutcome(error: MessageActionsRpcError): "rejected" | "unknown" {
  const code = error.code ?? "";
  return /^(?:[0-9A-Z]{5}|PGRST\d+)$/.test(code) ? "rejected" : "unknown";
}

function errorMessage(error: MessageActionsRpcError, fallback: string) {
  return typeof error.message === "string" && error.message.trim()
    ? error.message
    : fallback;
}

function missingRpc(error: MessageActionsRpcError) {
  return error.code === "PGRST202" || error.code === "42883";
}

async function callRpc(
  client: MessageActionsRpcClient,
  functionName: string,
  arguments_: Record<string, unknown>
): Promise<unknown> {
  try {
    const { data, error } = await client.rpc(functionName, arguments_);
    if (error) {
      throw new MessageActionError(
        errorMessage(error, "Message action could not be completed."),
        errorOutcome(error)
      );
    }
    return data;
  } catch (error) {
    if (error instanceof MessageActionError) throw error;
    throw new MessageActionError(
      "The message action may not have completed. Check the conversation before retrying.",
      "unknown"
    );
  }
}

/**
 * Read the server capability before presenting mutations. A missing migration
 * is an expected disabled state, not an optimistic client-side fallback.
 */
export async function getMessageControls(
  client: MessageActionsRpcClient,
  conversationId: string
): Promise<MessageControls> {
  try {
    const { data, error } = await client.rpc("nodeine_message_controls", {
      target_conversation_id: conversationId,
    });
    if (error) {
      if (missingRpc(error)) {
        return {
          enabled: false,
          clearedBefore: null,
          reason: "Message controls are not available until the migration is applied.",
        };
      }
      return {
        enabled: false,
        clearedBefore: null,
        reason: errorMessage(error, "Message controls are unavailable right now."),
      };
    }

    if (
      !isRecord(data) ||
      typeof data.enabled !== "boolean" ||
      (data.clearedBefore !== null && !isIsoTimestamp(data.clearedBefore))
    ) {
      return {
        enabled: false,
        clearedBefore: null,
        reason: "Message controls returned an invalid capability response.",
      };
    }

    return {
      enabled: data.enabled,
      clearedBefore: data.clearedBefore,
    };
  } catch (error) {
    return {
      enabled: false,
      clearedBefore: null,
      reason: "Message controls may be unavailable. Refresh the conversation before retrying.",
    };
  }
}

export function cleanMessageBody(body: string) {
  const cleanBody = body.trim();
  if (cleanBody.length < 1 || cleanBody.length > 2_000) {
    throw new MessageActionError(
      "Messages must be between 1 and 2,000 characters.",
      "rejected"
    );
  }
  return cleanBody;
}

export async function editOwnMessage(
  client: MessageActionsRpcClient,
  message: MessageActionTarget,
  body: string
): Promise<UpdatedMessage> {
  const target = checkedMessageTarget(message);
  const data = await callRpc(client, "edit_own_message", {
    target_message_id: target.id,
    new_body: cleanMessageBody(body),
  });
  const updatedMessage = messageFromRpc(data, target);
  if (updatedMessage.message_type !== "text" || updatedMessage.removed_at != null) {
    throw new MessageActionError(
      "Message editing was not confirmed. Refresh the conversation before retrying.",
      "unknown"
    );
  }
  return updatedMessage;
}

function removedAttachmentFromRpc(
  value: unknown,
  message: UpdatedMessage
): RemovedAttachment | null {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    value.bucket !== "conversation-voice-notes" ||
    typeof value.path !== "string" ||
    !new RegExp(
      `^${message.conversation_id}/voice/${message.sender_id}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](?:webm|m4a)$`,
      "i"
    ).test(value.path)
  ) {
    throw new MessageActionError(
      "Message removal returned an invalid attachment response. Refresh the conversation before retrying.",
      "unknown"
    );
  }
  return { bucket: value.bucket, path: value.path };
}

/**
 * This only returns a server-confirmed tombstone and an attachment descriptor.
 * The caller may remove that exact descriptor from storage afterwards; on any
 * error it must not attempt blind cleanup because the mutation outcome is not
 * known.
 */
export async function removeOwnMessage(
  client: MessageActionsRpcClient,
  message: MessageActionTarget
): Promise<RemoveMessageResult> {
  const target = checkedMessageTarget(message);
  const data = await callRpc(client, "remove_own_message", {
    target_message_id: target.id,
  });
  if (!isRecord(data)) {
    throw new MessageActionError(
      "Message removal returned an invalid response. Refresh the conversation before retrying.",
      "unknown"
    );
  }

  const removedMessage = messageFromRpc(data.message, target);
  if (
    removedMessage.message_type !== "text" ||
    removedMessage.body !== "Message removed" ||
    removedMessage.artwork_id !== null ||
    removedMessage.attachment_path !== null ||
    removedMessage.attachment_mime !== null ||
    removedMessage.attachment_name !== null ||
    removedMessage.voice_duration_ms != null ||
    !isIsoTimestamp(removedMessage.removed_at)
  ) {
    throw new MessageActionError(
      "Message removal was not confirmed. Refresh the conversation before retrying.",
      "unknown"
    );
  }

  return {
    message: removedMessage,
    removedAttachment: removedAttachmentFromRpc(data.removedAttachment, removedMessage),
  };
}

export async function clearMyConversation(
  client: MessageActionsRpcClient,
  conversationId: string
): Promise<{ clearedBefore: string }> {
  const data = await callRpc(client, "clear_my_conversation", {
    target_conversation_id: conversationId,
  });
  if (!isRecord(data) || !isIsoTimestamp(data.clearedBefore)) {
    throw new MessageActionError(
      "Conversation clearing returned an invalid response. Refresh before retrying.",
      "unknown"
    );
  }
  return { clearedBefore: data.clearedBefore };
}
