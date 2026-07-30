"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

export function formatActivityCount(count: number) {
  return count > 99 ? "99+" : count.toString();
}

export function useUnreadActivityCount() {
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    let cancelled = false;

    function syncViewer(userId: string | null) {
      if (cancelled) return;
      setViewerId(userId);
      if (!userId) setUnreadCount(0);
    }

    client.auth.getUser().then(({ data }) => {
      syncViewer(data.user?.id ?? null);
    });

    const { data: authListener } = client.auth.onAuthStateChange(
      (_event, session) => {
        syncViewer(session?.user.id ?? null);
      }
    );

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const client = supabase;

    if (!client || !viewerId) return;
    const database = client;

    let cancelled = false;

    async function syncUnreadCount() {
      const { count, error } = await database
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", viewerId)
        .is("read_at", null);

      if (!cancelled && !error) setUnreadCount(count ?? 0);
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
