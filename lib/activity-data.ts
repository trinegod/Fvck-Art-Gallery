import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityKind = "follow" | "artwork_like" | "artwork_comment" | "message";
export type NotificationRow = {
  id: string; recipient_id: string; actor_id: string; kind: ActivityKind;
  artwork_id: string | null; conversation_id: string | null;
  preview: string | null; read_at: string | null; created_at: string;
};
export type ActivityProfile = { id: string; username: string; display_name: string; avatar_url: string | null };
export type ActivityArtwork = { id: string; title: string };
export type ActivityConversation = { id: string; kind: "direct" | "group"; title: string | null };

export async function fetchActivity(database: SupabaseClient, accountId: string, isCurrent = () => true) {
  const result = await database.from("notifications")
    .select("id, recipient_id, actor_id, kind, artwork_id, conversation_id, preview, read_at, created_at")
    .eq("recipient_id", accountId).order("created_at", { ascending: false }).limit(80);
  if (result.error) throw result.error;
  const notifications = (result.data ?? []) as NotificationRow[];
  const actorIds = [...new Set(notifications.map(row => row.actor_id))];
  const artworkIds = [...new Set(notifications.flatMap(row => row.artwork_id ? [row.artwork_id] : []))];
  const conversationIds = [...new Set(notifications.flatMap(row => row.conversation_id ? [row.conversation_id] : []))];
  if (!isCurrent()) return null;
  const [profiles, artworks, conversations] = await Promise.all([
    actorIds.length ? database.from("profiles").select("id, username, display_name, avatar_url").in("id", actorIds) : {data: [], error: null},
    artworkIds.length ? database.from("artworks").select("id, title").in("id", artworkIds) : {data: [], error: null},
    conversationIds.length ? database.from("conversations").select("id, kind, title").in("id", conversationIds) : {data: [], error: null},
  ]);
  const error = profiles.error ?? artworks.error ?? conversations.error;
  if (error) throw error;
  return {
    notifications,
    profiles: (profiles.data ?? []) as ActivityProfile[],
    artworks: (artworks.data ?? []) as ActivityArtwork[],
    conversations: (conversations.data ?? []) as ActivityConversation[],
  };
}

/** Await the lazy PostgREST query, and only return rows actually persisted. */
export async function persistActivitySeen(database: SupabaseClient, accountId: string, ids: string[], readAt: string) {
  if (!ids.length) return [];
  const result = await database.from("notifications").update({read_at: readAt})
    .eq("recipient_id", accountId).in("id", ids).is("read_at", null).select("id, read_at");
  if (result.error) throw result.error;
  return (result.data ?? []) as { id: string; read_at: string }[];
}
