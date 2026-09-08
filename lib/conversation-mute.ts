import type { SupabaseClient } from "@supabase/supabase-js";

export const CONVERSATION_MUTE_UNTIL = "2999-12-31T23:59:59.000Z";

/** Expired and malformed legacy values must not display an active mute. */
export function isConversationMuted(mutedUntil: string | null | undefined, now = Date.now()): boolean {
  return typeof mutedUntil === "string" && Date.parse(mutedUntil) > now;
}

type SetConversationMuteOptions = {
  conversationId: string;
  viewerId: string;
  mutedUntil: string | null;
  isCurrent: () => boolean;
};

/** The deployed RPC uses auth.uid(); the caller cannot mute another member. */
export async function setConversationMute(
  client: Pick<SupabaseClient, "rpc" | "from">,
  { conversationId, viewerId, mutedUntil, isCurrent }: SetConversationMuteOptions,
): Promise<string | null> {
  const assertCurrent = () => {
    if (!isCurrent()) throw new DOMException("Conversation changed.", "AbortError");
  };
  assertCurrent();
  const { error } = await client.rpc("set_conversation_mute", {
    target_conversation_id: conversationId,
    new_muted_until: mutedUntil,
  });
  assertCurrent();
  // A transport error may arrive after commit. Setting an absolute value is
  // idempotent, so retrying that same value remains safe even in that case.
  if (error) throw new Error("Mute setting couldn't be confirmed. Try again to apply the same setting.");

  const { data, error: readError } = await client.from("conversation_members")
    .select("conversation_id, profile_id, muted_until")
    .eq("conversation_id", conversationId)
    .eq("profile_id", viewerId)
    .single();
  assertCurrent();
  if (readError || !data || data.conversation_id !== conversationId || data.profile_id !== viewerId ||
    (mutedUntil === null ? data.muted_until !== null : Date.parse(data.muted_until) !== Date.parse(mutedUntil))) {
    throw new Error("Mute setting couldn't be confirmed. Try again to apply the same setting.");
  }
  return mutedUntil;
}
