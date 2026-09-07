type MessagesShellInput = {
  authReady: boolean;
  loadState: "loading" | "ready" | "signed-out" | "unavailable";
  viewerId: string | null;
  selectedConversationId: string | null;
  resolvedConversationId: string | null;
};

/** A URL alone must not hide the inbox's escape navigation. */
export function getMessagesShellMode({
  authReady,
  loadState,
  viewerId,
  selectedConversationId,
  resolvedConversationId,
}: MessagesShellInput): "pending" | "conversation" | "standard" {
  if (!authReady || loadState === "loading") return "pending";
  return loadState === "ready" && viewerId && selectedConversationId &&
    selectedConversationId === resolvedConversationId
    ? "conversation"
    : "standard";
}
