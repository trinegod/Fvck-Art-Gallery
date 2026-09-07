"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { chatAppearanceKey, parseChatAppearance, type ChatAppearance } from "@/lib/chat-appearance";
import { chatAppearanceStore } from "@/lib/chat-appearance-store";

export function useChatAppearance(accountId: string | null, conversationId: string | null) {
  const key = accountId && conversationId ? chatAppearanceKey(accountId, conversationId) : null;
  const getSnapshot = useCallback(() => chatAppearanceStore.getSnapshot(key), [key]);
  const raw = useSyncExternalStore(chatAppearanceStore.subscribe, getSnapshot, () => null);
  const getTemporarySnapshot = useCallback(() => chatAppearanceStore.getTemporarySnapshot(key), [key]);
  const temporary = useSyncExternalStore(chatAppearanceStore.subscribe, getTemporarySnapshot, () => false);
  const appearance = useMemo(() => parseChatAppearance(raw), [raw]);

  const updateAppearance = useCallback((patch: Partial<ChatAppearance>) => {
    return chatAppearanceStore.updateAppearance(key, patch);
  }, [key]);

  return { appearance, temporary, updateAppearance };
}
