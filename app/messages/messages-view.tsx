"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  LoaderCircle,
  MessageCircle,
  Plus,
  Search,
  Send,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase-browser";
import MobileAppNavigation from "../components/mobile-app-navigation";
import PolishedImage from "../components/polished-image";

type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

type ConversationRow = {
  id: string;
  kind: "direct" | "group";
  title: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type MembershipRow = {
  conversation_id: string;
  profile_id: string;
  role: "owner" | "member";
  joined_at: string;
  last_read_at: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type InboxConversation = ConversationRow & {
  memberIds: string[];
  memberCount: number;
  otherProfile: Profile | null;
  preview: string;
  previewAt: string;
  unreadCount: number;
};

type MessagesViewProps = {
  initialConversationId?: string;
  initialProfileId?: string;
};

type LoadState = "loading" | "ready" | "signed-out" | "unavailable";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isMissingMessagingError(code?: string) {
  return ["42P01", "42883", "PGRST202", "PGRST205"].includes(code ?? "");
}

function formatInboxTime(value: string) {
  const date = new Date(value);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  return new Intl.DateTimeFormat("en",
    isToday
      ? { hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric" }
  ).format(date);
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function conversationName(conversation: InboxConversation) {
  if (conversation.kind === "group") return conversation.title ?? "Group chat";
  return conversation.otherProfile?.display_name ?? "Creator conversation";
}

function Avatar({
  profile,
  group = false,
  className = "size-11",
}: {
  profile?: Profile | null;
  group?: boolean;
  className?: string;
}) {
  const initial = profile?.display_name.charAt(0).toUpperCase() || "N";

  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/12 bg-cyan-300/8 text-sm font-medium text-cyan-200 ${className}`}
      aria-hidden="true"
    >
      {group ? (
        <Users className="size-5" />
      ) : profile?.avatar_url ? (
        <PolishedImage
          src={profile.avatar_url}
          alt=""
          wrapperClassName="size-full"
          className="size-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  );
}

export default function MessagesView({
  initialConversationId,
  initialProfileId,
}: MessagesViewProps) {
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [loadState, setLoadState] = useState<LoadState>(
    supabase ? "loading" : "unavailable"
  );
  const [inbox, setInbox] = useState<InboxConversation[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    initialConversationId && uuidPattern.test(initialConversationId)
      ? initialConversationId
      : null
  );
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(
    supabase ? null : "Supabase environment variables are missing."
  );
  const [search, setSearch] = useState("");
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const startedProfileRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const profileById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles]
  );

  const activeConversation = inbox.find(
    (conversation) => conversation.id === activeConversationId
  );

  const filteredInbox = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return inbox;

    return inbox.filter((conversation) =>
      [
        conversationName(conversation),
        conversation.otherProfile?.username,
        conversation.preview,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [inbox, search]);

  const groupProfiles = useMemo(() => {
    const query = groupSearch.trim().toLowerCase();
    return profiles
      .filter((profile) => profile.id !== viewerId)
      .filter((profile) =>
        query
          ? `${profile.display_name} ${profile.username}`
              .toLowerCase()
              .includes(query)
          : true
      );
  }, [groupSearch, profiles, viewerId]);

  const loadInbox = useCallback(async (userId: string) => {
    const client = supabase;
    if (!client) return;

    setLoadState("loading");
    setError(null);

    const membershipResult = await client
      .from("conversation_members")
      .select("conversation_id, profile_id, role, joined_at, last_read_at")
      .eq("profile_id", userId)
      .order("joined_at", { ascending: false });

    if (membershipResult.error) {
      setInbox([]);
      setLoadState("unavailable");
      setError(
        isMissingMessagingError(membershipResult.error.code)
          ? "Messaging is waiting for its database connection."
          : membershipResult.error.message
      );
      return;
    }

    const viewerMemberships = (membershipResult.data ?? []) as MembershipRow[];
    const conversationIds = viewerMemberships.map(
      (membership) => membership.conversation_id
    );

    const allProfilesResult = await client
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .order("display_name")
      .limit(100);

    if (allProfilesResult.error) {
      setLoadState("unavailable");
      setError(allProfilesResult.error.message);
      return;
    }

    const profileRows = (allProfilesResult.data ?? []) as Profile[];
    setProfiles(profileRows);

    if (!conversationIds.length) {
      setInbox([]);
      setLoadState("ready");
      return;
    }

    const [conversationResult, membersResult, messagesResult] = await Promise.all([
      client
        .from("conversations")
        .select("id, kind, title, created_by, created_at, updated_at")
        .in("id", conversationIds),
      client
        .from("conversation_members")
        .select("conversation_id, profile_id, role, joined_at, last_read_at")
        .in("conversation_id", conversationIds),
      client
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(300),
    ]);

    const queryError =
      conversationResult.error ?? membersResult.error ?? messagesResult.error;

    if (queryError) {
      setInbox([]);
      setLoadState("unavailable");
      setError(queryError.message);
      return;
    }

    const conversations = (conversationResult.data ?? []) as ConversationRow[];
    const memberships = (membersResult.data ?? []) as MembershipRow[];
    const recentMessages = (messagesResult.data ?? []) as MessageRow[];
    const profilesMap = new Map(profileRows.map((profile) => [profile.id, profile]));
    const viewerMembershipByConversation = new Map(
      viewerMemberships.map((membership) => [
        membership.conversation_id,
        membership,
      ])
    );

    const nextInbox = conversations
      .map((conversation): InboxConversation => {
        const conversationMembers = memberships.filter(
          (membership) => membership.conversation_id === conversation.id
        );
        const conversationMessages = recentMessages.filter(
          (message) => message.conversation_id === conversation.id
        );
        const latestMessage = conversationMessages[0];
        const viewerMembership = viewerMembershipByConversation.get(conversation.id);
        const lastReadAt = viewerMembership?.last_read_at
          ? new Date(viewerMembership.last_read_at).getTime()
          : 0;
        const otherMember = conversationMembers.find(
          (membership) => membership.profile_id !== userId
        );

        return {
          ...conversation,
          memberIds: conversationMembers.map((membership) => membership.profile_id),
          memberCount: conversationMembers.length,
          otherProfile: otherMember
            ? profilesMap.get(otherMember.profile_id) ?? null
            : null,
          preview: latestMessage?.body ?? "Start the conversation",
          previewAt: latestMessage?.created_at ?? conversation.updated_at,
          unreadCount: conversationMessages.filter(
            (message) =>
              message.sender_id !== userId &&
              new Date(message.created_at).getTime() > lastReadAt
          ).length,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.previewAt).getTime() - new Date(a.previewAt).getTime()
      );

    setInbox(nextInbox);
    setLoadState("ready");
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let cancelled = false;
    let authResolved = false;

    function syncViewer(userId: string | null) {
      if (cancelled) return;
      authResolved = true;
      window.clearTimeout(authFallbackTimer);
      setViewerId(userId);
      setAuthReady(true);

      if (userId) {
        loadInbox(userId);
      } else {
        setInbox([]);
        setProfiles([]);
        setMessages([]);
        setLoadState("signed-out");
      }
    }

    const authFallbackTimer = window.setTimeout(() => {
      if (!authResolved) syncViewer(null);
    }, 2000);

    client.auth.getUser().then(({ data }) => syncViewer(data.user?.id ?? null));

    const { data: authListener } = client.auth.onAuthStateChange(
      (_event, session) => syncViewer(session?.user.id ?? null)
    );

    return () => {
      cancelled = true;
      window.clearTimeout(authFallbackTimer);
      authListener.subscription.unsubscribe();
    };
  }, [loadInbox]);

  useEffect(() => {
    const client = supabase;
    if (!client || !viewerId || loadState === "unavailable") return;

    const channel = client
      .channel(`nodeine-inbox-${viewerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => loadInbox(viewerId)
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [loadInbox, loadState, viewerId]);

  useEffect(() => {
    const client = supabase;
    if (
      !client ||
      !viewerId ||
      !initialProfileId ||
      !uuidPattern.test(initialProfileId) ||
      startedProfileRef.current === initialProfileId ||
      loadState === "unavailable"
    ) {
      return;
    }
    const database = client;
    const currentViewerId = viewerId;

    startedProfileRef.current = initialProfileId;

    if (initialProfileId === currentViewerId) {
      return;
    }

    async function startConversation() {
      const { data, error: startError } = await database.rpc(
        "start_direct_conversation",
        { other_profile_id: initialProfileId }
      );

      if (startError) {
        setError(
          isMissingMessagingError(startError.code)
            ? "Messaging is waiting for its database connection."
            : startError.message
        );
        return;
      }

      const conversationId = data as string;
      setActiveConversationId(conversationId);
      window.history.replaceState(
        null,
        "",
        `/messages?conversation=${conversationId}`
      );
      await loadInbox(currentViewerId);
    }

    startConversation();
  }, [initialProfileId, loadInbox, loadState, viewerId]);

  useEffect(() => {
    const client = supabase;
    if (!client || !viewerId || !activeConversationId) {
      return;
    }
    const database = client;
    const currentViewerId = viewerId;
    const currentConversationId = activeConversationId;
    let cancelled = false;

    async function loadConversation() {
      setConversationLoading(true);
      const { data, error: messagesError } = await database
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .eq("conversation_id", currentConversationId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (cancelled) return;

      if (messagesError) {
        setError(messagesError.message);
        setMessages([]);
      } else {
        setMessages((data ?? []) as MessageRow[]);
        await database
          .from("conversation_members")
          .update({ last_read_at: new Date().toISOString() })
          .eq("conversation_id", currentConversationId)
          .eq("profile_id", currentViewerId);
        setInbox((current) =>
          current.map((conversation) =>
            conversation.id === currentConversationId
              ? { ...conversation, unreadCount: 0 }
              : conversation
          )
        );
      }

      setConversationLoading(false);
    }

    loadConversation();

    const channel = database
      .channel(`nodeine-conversation-${currentConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${currentConversationId}`,
        },
        async (payload) => {
          const incoming = payload.new as MessageRow;
          setMessages((current) =>
            current.some((message) => message.id === incoming.id)
              ? current
              : [...current, incoming]
          );
          await database
            .from("conversation_members")
            .update({ last_read_at: new Date().toISOString() })
            .eq("conversation_id", currentConversationId)
            .eq("profile_id", currentViewerId);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      database.removeChannel(channel);
    };
  }, [activeConversationId, viewerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    function syncConversationFromHistory() {
      const conversationId = new URLSearchParams(window.location.search).get(
        "conversation"
      );
      setActiveConversationId(
        conversationId && uuidPattern.test(conversationId)
          ? conversationId
          : null
      );
    }

    window.addEventListener("popstate", syncConversationFromHistory);
    return () =>
      window.removeEventListener("popstate", syncConversationFromHistory);
  }, []);

  function selectConversation(conversationId: string) {
    setActiveConversationId(conversationId);
    window.history.pushState(
      null,
      "",
      `/messages?conversation=${conversationId}`
    );
  }

  function closeConversation() {
    setActiveConversationId(null);
    setMessages([]);
    window.history.pushState(null, "", "/messages");
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    const body = draft.trim();

    if (!client || !viewerId || !activeConversationId || !body || sending) return;

    setSending(true);
    setError(null);

    const { data, error: sendError } = await client
      .from("messages")
      .insert({
        conversation_id: activeConversationId,
        sender_id: viewerId,
        body,
      })
      .select("id, conversation_id, sender_id, body, created_at")
      .single();

    if (sendError) {
      setError(sendError.message);
      toast.error("Message wasn't sent", { description: sendError.message });
    } else {
      const sentMessage = data as MessageRow;
      setMessages((current) =>
        current.some((message) => message.id === sentMessage.id)
          ? current
          : [...current, sentMessage]
      );
      setDraft("");
      await loadInbox(viewerId);
    }

    setSending(false);
  }

  function toggleGroupMember(profileId: string) {
    setSelectedMemberIds((current) =>
      current.includes(profileId)
        ? current.filter((id) => id !== profileId)
        : current.length < 20
          ? [...current, profileId]
          : current
    );
  }

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    const title = groupTitle.trim();

    if (
      !client ||
      !viewerId ||
      !title ||
      !selectedMemberIds.length ||
      creatingGroup
    ) {
      return;
    }

    setCreatingGroup(true);
    setError(null);

    const { data, error: groupError } = await client.rpc(
      "create_group_conversation",
      {
        conversation_title: title,
        member_ids: selectedMemberIds,
      }
    );

    if (groupError) {
      setError(groupError.message);
      toast.error("Group wasn't created", { description: groupError.message });
    } else {
      const conversationId = data as string;
      setGroupOpen(false);
      setGroupTitle("");
      setGroupSearch("");
      setSelectedMemberIds([]);
      setActiveConversationId(conversationId);
      window.history.pushState(
        null,
        "",
        `/messages?conversation=${conversationId}`
      );
      await loadInbox(viewerId);
      toast.success("Group chat created");
    }

    setCreatingGroup(false);
  }

  const viewerProfile = viewerId ? profileById.get(viewerId) ?? null : null;

  return (
    <main className="min-h-screen bg-zinc-950 pb-[calc(7rem+env(safe-area-inset-bottom))] text-zinc-100 lg:pb-0">
      <header className="border-b border-white/10 px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
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
            <Link
              href={
                viewerProfile ? `/creator/${viewerProfile.username}` : "/admin"
              }
              className="text-cyan-300 hover:text-cyan-200"
            >
              Profile
            </Link>
          </nav>
        </div>
      </header>

      {!authReady || loadState === "loading" ? (
        <div className="grid min-h-[70svh] place-items-center px-5 text-center">
          <div>
            <LoaderCircle className="mx-auto size-8 animate-spin text-cyan-300" />
            <p className="mt-4 text-sm text-zinc-500">Opening your inbox...</p>
          </div>
        </div>
      ) : loadState === "signed-out" ? (
        <div className="grid min-h-[70svh] place-items-center px-5 text-center">
          <div className="max-w-md">
            <MessageCircle className="mx-auto size-10 text-cyan-300" />
            <h1 className="mt-5 text-3xl font-light text-white">
              Your conversations live here
            </h1>
            <p className="mt-3 leading-7 text-zinc-500">
              Sign in to message artists, build group chats, and keep creative
              conversations private.
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
            <MessageCircle className="mx-auto size-10 text-rose-300" />
            <h1 className="mt-5 text-3xl font-light text-white">
              Messaging is almost online
            </h1>
            <p className="mt-3 leading-7 text-zinc-500">
              {error ?? "The messaging database is not available yet."}
            </p>
          </div>
        </div>
      ) : (
        <section className="mx-auto grid max-w-7xl lg:h-[calc(100svh-73px)] lg:grid-cols-[390px_minmax(0,1fr)]">
          <aside
            className={`border-white/10 lg:min-h-0 lg:border-r ${
              activeConversationId ? "hidden lg:flex" : "flex"
            } flex-col`}
          >
            <div className="border-b border-white/10 px-5 py-6 sm:px-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">
                    Private social space
                  </p>
                  <h1 className="mt-2 text-3xl font-light text-white">Inbox</h1>
                </div>
                <Button
                  type="button"
                  size="icon-lg"
                  onClick={() => setGroupOpen(true)}
                  className="rounded-full"
                  aria-label="Create group chat"
                  title="Create group chat"
                >
                  <Plus />
                </Button>
              </div>

              <label className="relative mt-5 block">
                <span className="sr-only">Search conversations</span>
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
                <Input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search conversations"
                  className="h-11 border-white/10 bg-black/45 pl-10"
                />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {filteredInbox.length ? (
                filteredInbox.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => selectConversation(conversation.id)}
                    className="nodeine-action flex w-full items-center gap-3 border-b border-white/8 px-5 py-4 text-left hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300 sm:px-7"
                  >
                    <Avatar
                      profile={conversation.otherProfile}
                      group={conversation.kind === "group"}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium text-zinc-100">
                          {conversationName(conversation)}
                        </span>
                        <span className="shrink-0 text-[11px] text-zinc-600">
                          {formatInboxTime(conversation.previewAt)}
                        </span>
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm text-zinc-500">
                          {conversation.preview}
                        </span>
                        {conversation.unreadCount > 0 && (
                          <span className="grid min-w-5 place-items-center rounded-full bg-cyan-300 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-950">
                            {conversation.unreadCount > 99
                              ? "99+"
                              : conversation.unreadCount}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <div className="grid min-h-80 place-items-center px-6 text-center">
                  <div className="max-w-xs">
                    <MessageCircle className="mx-auto size-9 text-zinc-700" />
                    <h2 className="mt-4 text-xl font-light text-white">
                      {search ? "No conversation found" : "Start with an artist"}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      {search
                        ? "Try another name or message."
                        : "Open a creator profile and tap Message, or build a group chat here."}
                    </p>
                    {!search && (
                      <Link
                        href="/discover"
                        className="nodeine-action mt-5 inline-flex min-h-10 items-center rounded-lg border border-white/15 px-4 text-sm text-zinc-200 hover:border-cyan-300/50 hover:text-cyan-200"
                      >
                        Discover creators
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>

          <section
            className={`min-h-0 ${
              activeConversationId ? "flex" : "hidden lg:flex"
            } flex-col pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:pb-0`}
          >
            {activeConversation ? (
              <>
                <header className="flex min-h-[76px] items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
                  <button
                    type="button"
                    onClick={closeConversation}
                    className="nodeine-action grid size-10 shrink-0 place-items-center rounded-full text-zinc-400 hover:bg-white/5 hover:text-white lg:hidden"
                    aria-label="Back to inbox"
                  >
                    <ArrowLeft className="size-5" />
                  </button>
                  <Avatar
                    profile={activeConversation.otherProfile}
                    group={activeConversation.kind === "group"}
                    className="size-10"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-medium text-white">
                      {conversationName(activeConversation)}
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-zinc-600">
                      {activeConversation.kind === "group"
                        ? `${activeConversation.memberCount} members`
                        : activeConversation.otherProfile
                          ? `@${activeConversation.otherProfile.username}`
                          : "Private conversation"}
                    </p>
                  </div>
                  {activeConversation.otherProfile && (
                    <Link
                      href={`/creator/${activeConversation.otherProfile.username}`}
                      className="nodeine-action inline-flex min-h-10 items-center rounded-lg border border-white/10 px-3 text-xs text-zinc-400 hover:border-cyan-300/40 hover:text-cyan-200"
                    >
                      Profile
                    </Link>
                  )}
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                  {conversationLoading ? (
                    <div className="grid min-h-full place-items-center">
                      <LoaderCircle className="size-7 animate-spin text-cyan-300" />
                    </div>
                  ) : messages.length ? (
                    <div className="mx-auto flex max-w-3xl flex-col gap-3">
                      {messages.map((message) => {
                        const mine = message.sender_id === viewerId;
                        const sender = profileById.get(message.sender_id);

                        return (
                          <article
                            key={message.id}
                            className={`flex gap-2.5 ${mine ? "justify-end" : "justify-start"}`}
                          >
                            {!mine && (
                              <Avatar profile={sender} className="mt-1 size-8" />
                            )}
                            <div className={`max-w-[82%] sm:max-w-[68%] ${mine ? "text-right" : "text-left"}`}>
                              {!mine && activeConversation.kind === "group" && (
                                <p className="mb-1 px-1 text-[11px] text-zinc-600">
                                  {sender?.display_name ?? "NODEINE creator"}
                                </p>
                              )}
                              <div
                                className={`rounded-2xl px-4 py-2.5 text-left text-sm leading-6 ${
                                  mine
                                    ? "rounded-br-md bg-cyan-300 text-zinc-950"
                                    : "rounded-bl-md border border-white/10 bg-white/[0.045] text-zinc-200"
                                }`}
                              >
                                <p className="whitespace-pre-wrap break-words">
                                  {message.body}
                                </p>
                              </div>
                              <time className="mt-1 block px-1 text-[10px] text-zinc-700">
                                {formatMessageTime(message.created_at)}
                              </time>
                            </div>
                          </article>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <div className="grid min-h-full place-items-center text-center">
                      <div className="max-w-sm">
                        <MessageCircle className="mx-auto size-9 text-cyan-300" />
                        <h3 className="mt-4 text-xl font-light text-white">
                          Say something real
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-zinc-600">
                          This is the beginning of this conversation. Keep it
                          creative, respectful, and human.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <form
                  onSubmit={sendMessage}
                  className="border-t border-white/10 bg-zinc-950/95 px-4 py-3 backdrop-blur-xl sm:px-6"
                >
                  <div className="mx-auto flex max-w-3xl items-end gap-2">
                    <label className="min-w-0 flex-1">
                      <span className="sr-only">Message</span>
                      <textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" &&
                            !event.shiftKey &&
                            !event.nativeEvent.isComposing
                          ) {
                            event.preventDefault();
                            event.currentTarget.form?.requestSubmit();
                          }
                        }}
                        maxLength={2000}
                        rows={1}
                        placeholder="Message..."
                        className="max-h-32 min-h-11 w-full resize-none rounded-2xl border border-white/12 bg-black/50 px-4 py-2.5 text-sm leading-6 text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300"
                      />
                    </label>
                    <Button
                      type="submit"
                      size="icon-lg"
                      disabled={sending || !draft.trim()}
                      className="shrink-0 rounded-full"
                      aria-label="Send message"
                    >
                      {sending ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <Send />
                      )}
                    </Button>
                  </div>
                  {error && (
                    <p className="mx-auto mt-2 max-w-3xl text-xs text-rose-300" role="alert">
                      {error}
                    </p>
                  )}
                </form>
              </>
            ) : (
              <div className="grid min-h-full place-items-center px-8 text-center">
                <div className="max-w-md">
                  <span className="mx-auto grid size-16 place-items-center rounded-3xl border border-cyan-300/15 bg-cyan-300/8">
                    <MessageCircle className="size-7 text-cyan-300" />
                  </span>
                  <h2 className="mt-5 text-3xl font-light text-white">
                    Artist conversations
                  </h2>
                  <p className="mt-3 leading-7 text-zinc-500">
                    Choose a conversation, message a creator from their profile,
                    or start a group for the people building alongside you.
                  </p>
                </div>
              </div>
            )}
          </section>
        </section>
      )}

      <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
        <DialogContent className="max-h-[88svh] overflow-hidden border border-white/10 bg-zinc-950/98 p-0 shadow-2xl shadow-black/70 ring-0 sm:max-w-lg">
          <DialogHeader className="border-b border-white/10 px-5 py-5 sm:px-6">
            <DialogTitle className="text-xl text-white">Create a group chat</DialogTitle>
            <DialogDescription className="leading-6 text-zinc-500">
              Bring up to 20 artists or friends into one private conversation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={createGroup} className="flex min-h-0 flex-col">
            <div className="space-y-4 px-5 py-4 sm:px-6">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-zinc-500">
                  Group name
                </span>
                <Input
                  value={groupTitle}
                  onChange={(event) => setGroupTitle(event.target.value)}
                  maxLength={80}
                  placeholder="Midnight worldbuilders"
                  className="h-11 border-white/12 bg-black/45"
                />
              </label>

              <label className="relative block">
                <span className="sr-only">Search people</span>
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
                <Input
                  type="search"
                  value={groupSearch}
                  onChange={(event) => setGroupSearch(event.target.value)}
                  placeholder="Search artists"
                  className="h-11 border-white/12 bg-black/45 pl-10"
                />
              </label>
            </div>

            <div className="min-h-0 max-h-[42svh] overflow-y-auto border-y border-white/10">
              {groupProfiles.length ? (
                groupProfiles.map((profile) => {
                  const selected = selectedMemberIds.includes(profile.id);
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => toggleGroupMember(profile.id)}
                      aria-pressed={selected}
                      className="nodeine-action flex w-full items-center gap-3 border-b border-white/8 px-5 py-3 text-left last:border-b-0 hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300 sm:px-6"
                    >
                      <Avatar profile={profile} className="size-10" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-zinc-100">
                          {profile.display_name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-zinc-600">
                          @{profile.username}
                        </span>
                      </span>
                      <span
                        className={`grid size-6 place-items-center rounded-full border ${
                          selected
                            ? "border-cyan-300 bg-cyan-300 text-zinc-950"
                            : "border-white/15 text-transparent"
                        }`}
                      >
                        <Check className="size-3.5" />
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="px-6 py-10 text-center text-sm text-zinc-600">
                  No matching creators found.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
              <p className="text-xs text-zinc-600">
                {selectedMemberIds.length} selected
              </p>
              <Button
                type="submit"
                disabled={
                  creatingGroup ||
                  !groupTitle.trim() ||
                  !selectedMemberIds.length
                }
              >
                {creatingGroup ? (
                  <LoaderCircle data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Users data-icon="inline-start" />
                )}
                Create group
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <MobileAppNavigation />
    </main>
  );
}
