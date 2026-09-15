"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { observeAccount } from "@/lib/activity-session";
import { createMessageDraftStore, visibleMessageDrafts } from "@/lib/message-drafts";
import { supabase } from "@/lib/supabase-browser";

const DraftContext = createContext<ReturnType<typeof createMessageDraftStore> | null>(null);

export default function MessageDraftsProvider({ children }: { children: ReactNode }) {
  // An instance per app tree, not a server/module singleton shared by requests.
  const [store] = useState(createMessageDraftStore);
  useEffect(() => {
    if (!supabase) return;
    const stop = observeAccount(supabase.auth, store.setAccount);
    return () => { stop(); store.setAccount(null); };
  }, [store]);
  return <DraftContext.Provider value={store}>{children}</DraftContext.Provider>;
}

export function useMessageDrafts(accountId: string | null) {
  const store = useContext(DraftContext);
  if (!store) throw new Error("Message drafts require the app provider.");
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { draftStore: store, ...visibleMessageDrafts(snapshot, accountId) };
}
