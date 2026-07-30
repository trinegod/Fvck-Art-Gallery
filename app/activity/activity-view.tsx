"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Heart,
  LoaderCircle,
  MessageCircle,
  MessageSquareText,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase-browser";
import MobileAppNavigation from "../components/mobile-app-navigation";
import PolishedImage from "../components/polished-image";

type ActivityKind = "follow" | "artwork_like" | "artwork_comment" | "message";
type ActivityFilter = "all" | "unread";
type LoadState = "loading" | "ready" | "signed-out" | "unavailable";

type NotificationRow = {
  id: string;
  recipient_id: string;
  actor_id: string;
  kind: ActivityKind;
  artwork_id: string | null;
  conversation_id: string | null;
  preview: string | null;
  read_at: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

type ArtworkRow = {
  id: string;
  title: string;
};

type ConversationRow = {
  id: string;
  kind: "direct" | "group";
  title: string | null;
};

function formatActivityTime(value: string) {
  const timestamp = new Date(value).getTime();
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));

  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function activityIcon(kind: ActivityKind) {
  if (kind === "follow") return UserPlus;
  if (kind === "artwork_like") return Heart;
  if (kind === "artwork_comment") return MessageSquareText;
  return MessageCircle;
}

function activityColor(kind: ActivityKind) {
  if (kind === "follow") return "border-violet-300/20 bg-violet-300/10 text-violet-200";
  if (kind === "artwork_like") return "border-rose-300/20 bg-rose-300/10 text-rose-200";
  if (kind === "artwork_comment") return "border-amber-300/20 bg-amber-300/10 text-amber-200";
  return "border-cyan-300/20 bg-cyan-300/10 text-cyan-200";
}

export default function ActivityView() {
  const router = useRouter();
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>(
    supabase ? "loading" : "unavailable"
  );
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [artworks, setArtworks] = useState<ArtworkRow[]>([]);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadActivity = useCallback(async (userId: string, showLoader = true) => {
    const database = supabase;
    if (!database) return;

    if (showLoader) setLoadState("loading");

    const { data, error: notificationError } = await database
      .from("notifications")
      .select(
        "id, recipient_id, actor_id, kind, artwork_id, conversation_id, preview, read_at, created_at"
      )
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(80);

    if (notificationError) {
      setError(notificationError.message);
      setLoadState("unavailable");
      return;
    }

    const rows = (data ?? []) as NotificationRow[];
    const actorIds = [...new Set(rows.map((row) => row.actor_id))];
    const artworkIds = [
      ...new Set(rows.flatMap((row) => (row.artwork_id ? [row.artwork_id] : []))),
    ];
    const conversationIds = [
      ...new Set(
        rows.flatMap((row) => (row.conversation_id ? [row.conversation_id] : []))
      ),
    ];

    const [profileResult, artworkResult, conversationResult] = await Promise.all([
      actorIds.length
        ? database
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .in("id", actorIds)
        : Promise.resolve({ data: [], error: null }),
      artworkIds.length
        ? database.from("artworks").select("id, title").in("id", artworkIds)
        : Promise.resolve({ data: [], error: null }),
      conversationIds.length
        ? database
            .from("conversations")
            .select("id, kind, title")
            .in("id", conversationIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const relatedError =
      profileResult.error ?? artworkResult.error ?? conversationResult.error;

    if (relatedError) {
      setError(relatedError.message);
      setLoadState("unavailable");
      return;
    }

    setNotifications(rows);
    setProfiles((profileResult.data ?? []) as ProfileRow[]);
    setArtworks((artworkResult.data ?? []) as ArtworkRow[]);
    setConversations((conversationResult.data ?? []) as ConversationRow[]);
    setError(null);
    setLoadState("ready");
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    let cancelled = false;
    let resolved = false;

    function syncViewer(userId: string | null) {
      if (cancelled) return;
      resolved = true;
      setViewerId(userId);

      if (userId) {
        loadActivity(userId);
      } else {
        setNotifications([]);
        setProfiles([]);
        setArtworks([]);
        setConversations([]);
        setLoadState("signed-out");
      }
    }

    client.auth.getUser().then(({ data }) => {
      syncViewer(data.user?.id ?? null);
    });

    const fallback = window.setTimeout(() => {
      if (!resolved) syncViewer(null);
    }, 2200);

    const { data: authListener } = client.auth.onAuthStateChange(
      (_event, session) => {
        syncViewer(session?.user.id ?? null);
      }
    );

    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
      authListener.subscription.unsubscribe();
    };
  }, [loadActivity]);

  useEffect(() => {
    const client = supabase;
    if (!client || !viewerId) return;

    const channel = client
      .channel(`activity-center:${viewerId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${viewerId}`,
        },
        () => loadActivity(viewerId, false)
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [loadActivity, viewerId]);

  const profileById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles]
  );
  const artworkById = useMemo(
    () => new Map(artworks.map((artwork) => [artwork.id, artwork])),
    [artworks]
  );
  const conversationById = useMemo(
    () => new Map(conversations.map((conversation) => [conversation.id, conversation])),
    [conversations]
  );
  const unreadCount = notifications.filter((item) => !item.read_at).length;
  const visibleNotifications =
    filter === "unread"
      ? notifications.filter((notification) => !notification.read_at)
      : notifications;

  function destinationFor(notification: NotificationRow) {
    const actor = profileById.get(notification.actor_id);

    if (notification.kind === "follow" && actor) {
      return `/creator/${actor.username}`;
    }
    if (notification.artwork_id) return `/artwork/${notification.artwork_id}`;
    if (notification.conversation_id) {
      return `/messages?conversation=${notification.conversation_id}`;
    }
    return "/activity";
  }

  async function openNotification(notification: NotificationRow) {
    const client = supabase;
    const destination = destinationFor(notification);

    if (!notification.read_at && client && viewerId) {
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, read_at: readAt } : item
        )
      );
      void client
        .from("notifications")
        .update({ read_at: readAt })
        .eq("id", notification.id)
        .eq("recipient_id", viewerId);
    }

    router.push(destination);
  }

  async function markAllRead() {
    const client = supabase;
    if (!client || !viewerId || !unreadCount) return;

    setMarkingAll(true);
    const readAt = new Date().toISOString();
    const { error: updateError } = await client
      .from("notifications")
      .update({ read_at: readAt })
      .eq("recipient_id", viewerId)
      .is("read_at", null);

    if (updateError) {
      toast.error("Activity could not be marked as seen", {
        description: updateError.message,
      });
    } else {
      setNotifications((current) =>
        current.map((item) => ({ ...item, read_at: item.read_at ?? readAt }))
      );
      toast.success("You are all caught up");
    }

    setMarkingAll(false);
  }

  return (
    <main className="min-h-screen bg-zinc-950 pb-[calc(7rem+env(safe-area-inset-bottom))] text-zinc-100 lg:pb-0">
      <header className="border-b border-white/10 px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link
            href="/"
            className="text-lg font-light tracking-[0.24em] text-white hover:text-cyan-200"
          >
            NODEINE
          </Link>
          <nav className="hidden items-center gap-5 text-xs uppercase tracking-[0.18em] lg:flex">
            <Link href="/" className="text-zinc-400 hover:text-white">
              Archive
            </Link>
            <Link href="/discover" className="text-zinc-400 hover:text-white">
              Discover
            </Link>
            <Link href="/saved" className="text-zinc-400 hover:text-white">
              Saved
            </Link>
            <Link href="/messages" className="text-zinc-400 hover:text-white">
              Inbox
            </Link>
            <Link href="/admin" className="text-cyan-300 hover:text-cyan-200">
              Studio
            </Link>
          </nav>
        </div>
      </header>

      {loadState === "loading" ? (
        <div className="grid min-h-[70svh] place-items-center px-5 text-center">
          <div>
            <LoaderCircle className="mx-auto size-8 animate-spin text-cyan-300" />
            <p className="mt-4 text-sm text-zinc-500">Reading your activity...</p>
          </div>
        </div>
      ) : loadState === "signed-out" ? (
        <div className="grid min-h-[70svh] place-items-center px-5 text-center">
          <div className="max-w-md">
            <Bell className="mx-auto size-10 text-cyan-300" />
            <h1 className="mt-5 text-3xl font-light text-white">
              Your creative signal lives here
            </h1>
            <p className="mt-3 leading-7 text-zinc-500">
              Sign in to see follows, artwork reactions, comments, and messages.
            </p>
            <Link
              href="/admin"
              className="nodeine-action mt-7 inline-flex min-h-11 items-center rounded-lg bg-cyan-300 px-5 py-3 text-sm font-medium text-zinc-950 hover:bg-cyan-200"
            >
              Sign in to NODEINE
            </Link>
          </div>
        </div>
      ) : loadState === "unavailable" ? (
        <div className="grid min-h-[70svh] place-items-center px-5 text-center">
          <div className="max-w-md">
            <Bell className="mx-auto size-10 text-rose-300" />
            <h1 className="mt-5 text-3xl font-light text-white">
              Activity is almost online
            </h1>
            <p className="mt-3 leading-7 text-zinc-500">
              {error ?? "The activity database is not available yet."}
            </p>
          </div>
        </div>
      ) : (
        <section className="mx-auto max-w-5xl px-5 py-9 sm:px-8 sm:py-14">
          <div className="border-b border-white/10 pb-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">
                    Creative network
                  </p>
                  {unreadCount > 0 && (
                    <Badge className="border border-rose-300/20 bg-rose-300/10 text-rose-200">
                      {unreadCount} new
                    </Badge>
                  )}
                </div>
                <h1 className="mt-3 text-4xl font-light text-white sm:text-5xl">
                  Activity
                </h1>
                <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
                  Follows, reactions, conversations, and the people moving through
                  your worlds.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={!unreadCount || markingAll}
                onClick={markAllRead}
                className="border-white/12 bg-black/30 text-zinc-300"
              >
                {markingAll ? (
                  <LoaderCircle className="animate-spin" data-icon="inline-start" />
                ) : (
                  <CheckCheck data-icon="inline-start" />
                )}
                Mark all seen
              </Button>
            </div>

            <div className="mt-7 inline-flex rounded-xl border border-white/10 bg-black/35 p-1">
              {(["all", "unread"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={`nodeine-action min-h-9 rounded-lg px-4 text-sm capitalize ${
                    filter === option
                      ? "bg-cyan-300 text-zinc-950"
                      : "text-zinc-500 hover:text-white"
                  }`}
                >
                  {option}
                  {option === "unread" && unreadCount > 0 ? ` ${unreadCount}` : ""}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            {visibleNotifications.length ? (
              visibleNotifications.map((notification) => {
                const actor = profileById.get(notification.actor_id);
                const artwork = notification.artwork_id
                  ? artworkById.get(notification.artwork_id)
                  : null;
                const conversation = notification.conversation_id
                  ? conversationById.get(notification.conversation_id)
                  : null;
                const Icon = activityIcon(notification.kind);

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => openNotification(notification)}
                    className={`nodeine-action group grid w-full grid-cols-[44px_minmax(0,1fr)_auto] gap-3 border-b border-white/8 px-4 py-4 text-left last:border-b-0 hover:bg-white/[0.035] sm:grid-cols-[48px_44px_minmax(0,1fr)_auto] sm:items-center sm:px-5 ${
                      notification.read_at ? "" : "bg-cyan-300/[0.035]"
                    }`}
                  >
                    <span
                      className={`grid size-11 place-items-center rounded-xl border ${activityColor(
                        notification.kind
                      )}`}
                    >
                      <Icon className="size-4.5" aria-hidden="true" />
                    </span>
                    <span className="hidden size-11 overflow-hidden rounded-full border border-white/10 bg-zinc-900 sm:grid sm:place-items-center">
                      {actor?.avatar_url ? (
                        <PolishedImage
                          src={actor.avatar_url}
                          alt=""
                          wrapperClassName="size-full"
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-medium text-cyan-200">
                          {(actor?.display_name ?? "N").charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm leading-6 text-zinc-300">
                        <strong className="font-medium text-white">
                          {actor?.display_name ?? "A NODEINE creator"}
                        </strong>{" "}
                        {notification.kind === "follow" && "started following you."}
                        {notification.kind === "artwork_like" && (
                          <>
                            liked {artwork ? `“${artwork.title}”.` : "your artwork."}
                          </>
                        )}
                        {notification.kind === "artwork_comment" && (
                          <>
                            commented on{" "}
                            {artwork ? `“${artwork.title}”.` : "your artwork."}
                          </>
                        )}
                        {notification.kind === "message" && (
                          <>
                            sent a message
                            {conversation?.kind === "group" && conversation.title
                              ? ` in ${conversation.title}.`
                              : "."}
                          </>
                        )}
                      </span>
                      {notification.preview &&
                        (notification.kind === "artwork_comment" ||
                          notification.kind === "message") && (
                          <span className="mt-1 block truncate text-xs text-zinc-600">
                            “{notification.preview}”
                          </span>
                        )}
                    </span>
                    <span className="flex items-center gap-2 self-start pt-1 text-xs text-zinc-600 sm:self-center sm:pt-0">
                      {formatActivityTime(notification.created_at)}
                      {!notification.read_at && (
                        <span
                          className="size-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,.7)]"
                          aria-label="Unread"
                        />
                      )}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-6 py-16 text-center">
                <Bell className="mx-auto size-8 text-zinc-700" />
                <h2 className="mt-4 text-lg font-medium text-white">
                  {filter === "unread" ? "You are all caught up" : "No activity yet"}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                  {filter === "unread"
                    ? "New signals will appear here as they arrive."
                    : "Follow creators, publish a world, or start a conversation to wake up your network."}
                </p>
                {filter === "all" && (
                  <Link
                    href="/discover"
                    className="nodeine-action mt-6 inline-flex min-h-10 items-center rounded-lg border border-white/12 px-4 py-2 text-sm text-zinc-300 hover:border-cyan-300/50 hover:text-white"
                  >
                    Discover creators
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <MobileAppNavigation />
    </main>
  );
}
