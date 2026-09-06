"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { createAccountScope, observeAccount } from "@/lib/activity-session";

export function formatActivityCount(count: number) {
  return count > 99 ? "99+" : count.toString();
}

export function useUnreadActivityCount() {
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const accountScope = useRef(createAccountScope());

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const scope = accountScope.current;
    const stop = observeAccount(client.auth, (userId) => {
      const changed = scope.account() !== userId;
      scope.setAccount(userId);
      setViewerId(userId);
      if (changed || !userId) setUnreadCount(0);
    });

    return () => {
      stop();
      scope.clear();
    };
  }, []);

  useEffect(() => {
    const client = supabase;

    if (!client || !viewerId) return;
    const database = client;

    let cancelled = false;

    async function syncUnreadCount() {
      const isCurrent = accountScope.current.latest("unread-count", viewerId);
      if (cancelled || !isCurrent()) return;
      const { count, error } = await database
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", viewerId)
        .is("read_at", null);

      if (!cancelled && isCurrent() && !error) setUnreadCount(count ?? 0);
    }

    syncUnreadCount();

    const channel = database
      .channel(`activity-count:${viewerId}:${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${viewerId}`,
        },
        syncUnreadCount
      )
      .subscribe();

    return () => {
      cancelled = true;
      database.removeChannel(channel);
    };
  }, [viewerId]);

  return unreadCount;
}
