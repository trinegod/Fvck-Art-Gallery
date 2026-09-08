import type { SupabaseClient } from "@supabase/supabase-js";
import type { MessageRow } from "../app/messages/messages-types";
import { checkedMessageTimestamp, compareMessageTimestamps } from "./message-timestamp";

export const MESSAGE_PAGE_SIZE = 200;
export type MessageCursor = Pick<MessageRow, "created_at" | "id">;
export const MESSAGE_FIELDS = "id, conversation_id, sender_id, body, message_type, artwork_id, attachment_path, attachment_mime, attachment_name, voice_duration_ms, created_at";
export const CONTROLLED_MESSAGE_FIELDS = `${MESSAGE_FIELDS}, edited_at, removed_at`;
export const MEMBERSHIP_FIELDS = "conversation_id, profile_id, role, joined_at, last_read_at, muted_until";

/** Only a missing optional column may fall back before the controls migration. */
export async function fetchViewerMemberships(database: SupabaseClient, accountId: string) {
  const result = await database.from("conversation_members")
    .select(`${MEMBERSHIP_FIELDS}, cleared_before`).eq("profile_id", accountId);
  if (result.error && ["42703", "PGRST204"].includes(result.error.code)) {
    return database.from("conversation_members").select(MEMBERSHIP_FIELDS).eq("profile_id", accountId);
  }
  return result;
}

export async function fetchMessagePage(database: SupabaseClient, conversationId: string, before: MessageCursor | null = null, options: { controlsEnabled?: boolean; clearedBefore?: string | null } = {}) {
  let query = database.from("messages").select(options.controlsEnabled ? CONTROLLED_MESSAGE_FIELDS : MESSAGE_FIELDS).eq("conversation_id", conversationId)
    .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(MESSAGE_PAGE_SIZE + 1);
  if (options.clearedBefore) query = query.gt("created_at", checkedMessageTimestamp(options.clearedBefore));
  if (before) {
    if (!/^[0-9a-f-]{36}$/i.test(before.id)) throw new Error("Invalid message cursor");
    const timestamp = checkedMessageTimestamp(before.created_at);
    query = query.or(`created_at.lt.${timestamp},and(created_at.eq.${timestamp},id.lt.${before.id})`);
  }
  const { data, error } = await query;
  if (error) throw error;
  const fetched = (data ?? []) as unknown as MessageRow[];
  const rows = fetched.slice(0, MESSAGE_PAGE_SIZE).reverse();
  return {
    rows,
    olderCursor: fetched.length > MESSAGE_PAGE_SIZE && rows[0]
      ? { created_at: rows[0].created_at, id: rows[0].id } : null,
  };
}

export function mergeMessageHistory(current: MessageRow[], incoming: MessageRow[]) {
  const byId = new Map(current.map(message => [message.id, message]));
  for (const message of incoming) {
    const previous = byId.get(message.id);
    // Realtime edits/removals can arrive while an older page is still loading.
    // A stale page must never resurrect text/media that was already removed.
    if (previous?.removed_at && !message.removed_at) continue;
    const previousVersion = previous?.removed_at ?? previous?.edited_at;
    const incomingVersion = message.removed_at ?? message.edited_at;
    if (previousVersion && (!incomingVersion || compareMessageTimestamps(incomingVersion, previousVersion) < 0)) continue;
    byId.set(message.id, { ...previous, ...message });
  }
  return [...byId.values()].sort((a, b) => compareMessageTimestamps(a.created_at, b.created_at) || a.id.localeCompare(b.id));
}

/** Never mark through browser "now": only through a message actually retrieved. */
export async function persistConversationRead(database: SupabaseClient, accountId: string, conversationId: string, through: string | null, isCurrent = () => true) {
  if (!through || !isCurrent()) return false;
  const timestamp = checkedMessageTimestamp(through);
  const { error } = await database.from("conversation_members").update({last_read_at: timestamp})
    .eq("profile_id", accountId).eq("conversation_id", conversationId)
    .or(`last_read_at.is.null,last_read_at.lt.${timestamp}`);
  if (error) throw error;
  return isCurrent();
}
