import type { SupabaseClient } from "@supabase/supabase-js";
import type { MessageRow } from "../app/messages/messages-types";

export const MESSAGE_PAGE_SIZE = 200;
export type MessageCursor = Pick<MessageRow, "created_at" | "id">;
export const MESSAGE_FIELDS = "id, conversation_id, sender_id, body, message_type, artwork_id, attachment_path, attachment_mime, attachment_name, created_at";

function checkedTimestamp(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new Error("Invalid message timestamp");
  }
  return value;
}

export async function fetchMessagePage(database: SupabaseClient, conversationId: string, before: MessageCursor | null = null) {
  let query = database.from("messages").select(MESSAGE_FIELDS).eq("conversation_id", conversationId)
    .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(MESSAGE_PAGE_SIZE + 1);
  if (before) {
    if (!/^[0-9a-f-]{36}$/i.test(before.id)) throw new Error("Invalid message cursor");
    const timestamp = checkedTimestamp(before.created_at);
    query = query.or(`created_at.lt.${timestamp},and(created_at.eq.${timestamp},id.lt.${before.id})`);
  }
  const { data, error } = await query;
  if (error) throw error;
  const fetched = (data ?? []) as MessageRow[];
  const rows = fetched.slice(0, MESSAGE_PAGE_SIZE).reverse();
  return {
    rows,
    olderCursor: fetched.length > MESSAGE_PAGE_SIZE && rows[0]
      ? { created_at: rows[0].created_at, id: rows[0].id } : null,
  };
}

export function mergeMessageHistory(current: MessageRow[], incoming: MessageRow[]) {
  const byId = new Map(current.map(message => [message.id, message]));
  for (const message of incoming) byId.set(message.id, { ...byId.get(message.id), ...message });
  return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

/** Never mark through browser "now": only through a message actually retrieved. */
export async function persistConversationRead(database: SupabaseClient, accountId: string, conversationId: string, through: string | null, isCurrent = () => true) {
  if (!through || !isCurrent()) return false;
  const timestamp = checkedTimestamp(through);
  const { error } = await database.from("conversation_members").update({last_read_at: timestamp})
    .eq("profile_id", accountId).eq("conversation_id", conversationId)
    .or(`last_read_at.is.null,last_read_at.lt.${timestamp}`);
  if (error) throw error;
  return isCurrent();
}
