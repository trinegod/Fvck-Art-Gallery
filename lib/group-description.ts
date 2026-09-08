import type { MessageActionsRpcClient, MessageActionsRpcError } from "./message-actions";

export const GROUP_DESCRIPTION_LIMIT = 500;
export type GroupDescription = {
  state: "ready";
  conversationId: string;
  description: string;
  updatedAt: string | null;
  canEdit: boolean;
};
export type GroupDescriptionState = GroupDescription | { state: "unavailable"; message: string };

export class GroupDescriptionError extends Error {
  constructor(message: string, readonly outcome: "rejected" | "unknown" | "unavailable" | "conflict") {
    super(message);
    this.name = "GroupDescriptionError";
  }
}

/** PostgreSQL char_length counts code points, not JavaScript UTF-16 code units. */
export function cleanGroupDescription(value: string) {
  const clean = value.replace(/^[ \t\n\r\f\v]+|[ \t\n\r\f\v]+$/g, "");
  if (Array.from(clean).length > GROUP_DESCRIPTION_LIMIT) {
    throw new GroupDescriptionError("Group About must be 500 characters or fewer.", "rejected");
  }
  return clean;
}

function checkedConversationId(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new GroupDescriptionError("Refresh the group before trying again.", "rejected");
  }
  return value;
}

function missingExactRpc(error: MessageActionsRpcError, functionName: string) {
  return ["PGRST202", "42883"].includes(error.code ?? "")
    && new RegExp(`\\b${functionName}\\b`).test(error.message ?? "");
}

function checkedResult(data: unknown, conversationId: string): GroupDescription {
  const value = data as Record<string, unknown> | null;
  if (!value || Array.isArray(value) || typeof value !== "object"
    || value.conversation_id !== conversationId || typeof value.description !== "string"
    || Array.from(value.description).length > GROUP_DESCRIPTION_LIMIT
    || typeof value.can_edit !== "boolean"
    || (value.updated_at !== null && (typeof value.updated_at !== "string"
      || !/^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(value.updated_at)
      || !Number.isFinite(Date.parse(value.updated_at))))) {
    throw new GroupDescriptionError("Group About returned an invalid response. Refresh before retrying.", "unknown");
  }
  return { state: "ready", conversationId, description: value.description,
    updatedAt: value.updated_at as string | null, canEdit: value.can_edit };
}

async function descriptionRpc(client: MessageActionsRpcClient, functionName: string,
  arguments_: Record<string, unknown>, isCurrent: () => boolean) {
  if (!isCurrent()) return null;
  try {
    const response = await client.rpc(functionName, arguments_);
    if (!isCurrent()) return null;
    if (response.error) {
      if (missingExactRpc(response.error, functionName)) {
        throw new GroupDescriptionError("Group About is unavailable until its database update is applied.", "unavailable");
      }
      throw new GroupDescriptionError(response.error.message || "Group About could not be loaded or saved.",
        response.error.code === "40001" ? "conflict"
          : /^(?:[0-9A-Z]{5}|PGRST\d+)$/.test(response.error.code ?? "") ? "rejected" : "unknown");
    }
    return { data: response.data };
  } catch (error) {
    if (!isCurrent()) return null;
    if (error instanceof GroupDescriptionError) throw error;
    throw new GroupDescriptionError("Group About could not be confirmed. Refresh before retrying.", "unknown");
  }
}

/** No alternate-table fallback or shared cache: callers invalidate on account/chat/role changes. */
export async function fetchGroupDescription(client: MessageActionsRpcClient, conversationId: string,
  isCurrent: () => boolean): Promise<GroupDescriptionState | null> {
  if (!isCurrent()) return null;
  const target = checkedConversationId(conversationId);
  try {
    const result = await descriptionRpc(client, "get_group_description", { target_conversation_id: target }, isCurrent);
    return result ? checkedResult(result.data, target) : null;
  } catch (error) {
    if (error instanceof GroupDescriptionError && error.outcome === "unavailable") {
      return { state: "unavailable", message: error.message };
    }
    throw error;
  }
}

/** A null result suppresses stale UI; an already-started RPC may still have committed. */
export async function updateGroupDescription(client: MessageActionsRpcClient, conversationId: string,
  description: string, expectedUpdatedAt: string | null, isCurrent: () => boolean): Promise<GroupDescription | null> {
  if (!isCurrent()) return null;
  const target = checkedConversationId(conversationId);
  const clean = cleanGroupDescription(description);
  if (expectedUpdatedAt !== null && (!/^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(expectedUpdatedAt)
    || !Number.isFinite(Date.parse(expectedUpdatedAt)))) {
    throw new GroupDescriptionError("Refresh the group About before saving.", "rejected");
  }
  const result = await descriptionRpc(client, "update_group_description", {
    target_conversation_id: target, new_description: clean, expected_updated_at: expectedUpdatedAt,
  }, isCurrent);
  if (!result) return null;
  const saved = checkedResult(result.data, target);
  if (!saved.canEdit || saved.updatedAt === null || saved.description !== clean) {
    throw new GroupDescriptionError("Group About saving was not confirmed. Refresh before retrying.", "unknown");
  }
  return saved;
}
