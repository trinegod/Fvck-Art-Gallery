"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { createAccountScope, observeAccount, runAccountRequest } from "@/lib/activity-session";
import { fetchActivity, persistActivitySeen, messageActivityLabel, type ActivityKind, type NotificationRow, type ActivityProfile as ProfileRow, type ActivityArtwork as ArtworkRow, type ActivityConversation as ConversationRow } from "@/lib/activity-data";
import MobileAppNavigation from "../components/mobile-app-navigation";
import DesktopAppNavigation from "../components/desktop-app-navigation";
import PolishedImage from "../components/polished-image";

type ActivityFilter = "all" | "unread";
type LoadState = "loading" | "ready" | "signed-out" | "unavailable";

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
  const accountScope = useRef(createAccountScope());

  const loadActivity = useCallback(async (userId: string, showLoader = true) => {
    const database = supabase;
    if (!database || !accountScope.current.capture(userId)()) return;

    if (showLoader) setLoadState("loading");

    await runAccountRequest(accountScope.current, userId, "activity", (isCurrent) => fetchActivity(database, userId, isCurrent), (result) => {
      if (!result) return;
      setNotifications(result.notifications);
      setProfiles(result.profiles);
      setArtworks(result.artworks);
      setConversations(result.conversations);
      setError(null);
      setLoadState("ready");
    }, (loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Activity could not be loaded. Please try again.");
      setLoadState("unavailable");
    });
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const scope = accountScope.current;
    const stop = observeAccount(client.auth, (userId) => {
      const changed = scope.account() !== userId;
      scope.setAccount(userId);
      setViewerId(userId);
      if (changed || !userId) {
        setNotifications([]);
        setProfiles([]);
        setArtworks([]);
        setConversations([]);
        setMarkingAll(false);
        setError(null);
      }
      if (userId) {
        setLoadState("loading");
        queueMicrotask(() => void loadActivity(userId));
      } else setLoadState("signed-out");
    });
    return () => {
      stop();
      scope.clear();
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
      const isCurrent = accountScope.current.capture(viewerId);
      if (!isCurrent()) return;
      const readAt = new Date().toISOString();
      try {
        const updated = await persistActivitySeen(client, viewerId, [notification.id], readAt);
        if (!isCurrent()) return;
        const persisted = new Map(updated.map(row => [row.id, row.read_at]));
        setNotifications(current => current.map(item => persisted.has(item.id) ? {...item, read_at: persisted.get(item.id)!} : item));
      } catch {
        if (!isCurrent()) return;
        toast.error("Opened activity, but its seen status could not be saved. Please try again from Activity.");
      }
    }

    router.push(destination);
  }

  async function markAllRead() {
    const client = supabase;
    if (!client || !viewerId || !unreadCount || markingAll) return;
    const isCurrent = accountScope.current.capture(viewerId);
    if (!isCurrent()) return;

    setMarkingAll(true);
    const readAt = new Date().toISOString();
    try {
      const updated = await persistActivitySeen(client, viewerId, notifications.filter(item => !item.read_at).map(item => item.id), readAt);
      if (!isCurrent()) return;
      const persisted = new Map(updated.map(row => [row.id, row.read_at]));
      setNotifications(current => current.map(item => persisted.has(item.id) ? {...item, read_at: persisted.get(item.id)!} : item));
      toast.success("Visible activity marked as seen");
    } catch {
      if (!isCurrent()) return;
      toast.error("Activity could not be marked as seen", {
        description: "Your unread activity is unchanged. Please try again.",
      });
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
          <DesktopAppNavigation />
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
                            {messageActivityLabel(notification)}
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
