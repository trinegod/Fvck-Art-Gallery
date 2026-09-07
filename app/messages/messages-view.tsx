"use client";

import {
  type CSSProperties,
  DragEvent,
  FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookmarkPlus,
  Check,
  ImagePlus,
  LoaderCircle,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  UploadCloud,
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase-browser";
import { createAccountScope, observeAccount } from "@/lib/activity-session";
import { fetchMessagePage, fetchViewerMemberships, mergeMessageHistory, persistConversationRead, type MessageCursor } from "@/lib/message-history";
import { getMessageControls, editOwnMessage, removeOwnMessage, clearMyConversation } from "@/lib/message-actions";
import { compareMessageTimestamps } from "@/lib/message-timestamp";
import { isMessageViewportNearBottom, scrollMessageViewportToEnd, syncMessageViewport } from "@/lib/message-viewport";
import { getMessagesShellMode } from "@/lib/messages-shell";
import { persistMessageAttachment } from "@/lib/message-attachment";
import { CHAT_PALETTES } from "@/lib/chat-appearance";
import { VOICE_NOTE_BUCKET } from "@/lib/voice-note-upload";
import { deliverVoiceNote } from "@/lib/voice-note-delivery";
import WorldLoadingScreen from "../components/world-loading-screen";
import VoiceNoteComposer, { type VoiceNotePayload } from "./voice-note-composer";
import VoiceNotePlayer from "./voice-note-player";
import MessageActionsDialog from "./message-actions-dialog";
import DesktopAppNavigation from "../components/desktop-app-navigation";
import MobileAppNavigation from "../components/mobile-app-navigation";
import PolishedImage from "../components/polished-image";
import ArtworkShareDialog from "./artwork-share-dialog";
import ChatArtworkCard from "./chat-artwork-card";
import ConversationAvatar from "./conversation-avatar";
import GroupSettingsDialog from "./group-settings-dialog";
import ChatAppearanceDialog from "./chat-appearance-dialog";
import { useChatAppearance } from "./use-chat-appearance";
import type {
  ConversationRow,
  InboxConversation,
  MembershipRow,
  MessageRow,
  PendingGroupInvite,
  Profile,
  SharedArtwork,
} from "./messages-types";

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

function messagePreview(message?: MessageRow) {
  if (!message) return "Start the conversation";
  if (message.removed_at) return "Message removed";
  if (message.body) return message.body;
  if (message.message_type === "artwork") return "Shared an artwork";
  if (message.message_type === "image") return "Shared an image";
  if (message.message_type === "video") return "Shared a video";
  if (message.message_type === "voice") return "Voice note";
  return "New message";
}

function safeAttachmentName(name: string) {
  const extension = name.split(".").pop()?.toLowerCase() || "bin";
  return `${crypto.randomUUID()}.${extension.replace(/[^a-z0-9]/g, "") || "bin"}`;
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
  const [messageHistory, setMessages] = useState<MessageRow[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingGroupInvite[]>([]);
  const [sharedArtworks, setSharedArtworks] = useState<Map<string, SharedArtwork>>(
    new Map()
  );
  const [savedArtworkIds, setSavedArtworkIds] = useState<Set<string>>(new Set());
  const [savingArtworkId, setSavingArtworkId] = useState<string | null>(null);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [voiceActiveKey, setVoiceActiveKey] = useState<string | null>(null);
  const [voiceSending, setVoiceSending] = useState(false);
  const voiceSendLock = useRef<symbol | null>(null);
  const [voiceCapability, setVoiceCapability] = useState<{
    key: string; enabled: boolean; reason?: string;
  } | null>(null);
  const [messageControls, setMessageControls] = useState<{
    key: string; enabled: boolean; clearedBefore: string | null; reason?: string;
  } | null>(null);
  const [conversationOptionsKey, setConversationOptionsKey] = useState<string | null>(null);
  const [clearArmed, setClearArmed] = useState(false);
  const [clearingConversation, setClearingConversation] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(
    supabase ? null : "Supabase environment variables are missing."
  );
  const [search, setSearch] = useState("");
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [newMessageMode, setNewMessageMode] = useState<"direct" | "group">(
    "direct"
  );
  const [groupTitle, setGroupTitle] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [startingDirectId, setStartingDirectId] = useState<string | null>(null);
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);
  const [artworkShareOpen, setArtworkShareOpen] = useState(false);
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null);
  const startedProfileRef = useRef<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const accountScope = useRef(createAccountScope());
  const conversationVersion = useRef(0);
  const [olderCursor, setOlderCursor] = useState<MessageCursor | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const loadOlderRef = useRef<(() => Promise<void>) | null>(null);
  const messagesScrollerRef = useRef<HTMLDivElement | null>(null);
  const historyAnchor = useRef<{height: number; top: number} | null>(null);
  const lastHandledMessage = useRef<string | null>(null);
  const followingMessages = useRef(true);
  const unseenMessageCount = useRef(0);
  const [newMessageCount, setNewMessageCount] = useState(0);

  // A history refresh (for example a clear cutoff) is not a new conversation.
  // Invalidate mutations only when the viewer/destination actually changes.
  useLayoutEffect(() => {
    conversationVersion.current += 1;
    return () => { conversationVersion.current += 1; };
  }, [viewerId, activeConversationId]);

  const profileById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles]
  );

  const activeConversation = inbox.find(
    (conversation) => conversation.id === activeConversationId
  );
  const shellMode = getMessagesShellMode({
    authReady,
    loadState,
    viewerId,
    selectedConversationId: activeConversationId,
    resolvedConversationId: activeConversation?.id ?? null,
  });
  const focusedConversation = shellMode === "conversation";
  const currentVoiceKey = viewerId && activeConversationId
    ? `${viewerId}:${activeConversationId}` : null;
  const voiceActive = Boolean(currentVoiceKey && voiceActiveKey === currentVoiceKey);
  const onVoiceActiveChange = useCallback((active: boolean) => {
    setVoiceActiveKey(current => active ? currentVoiceKey : current === currentVoiceKey ? null : current);
  }, [currentVoiceKey]);
  const controlsEnabled = messageControls?.key === currentVoiceKey && messageControls.enabled;
  const membershipCutoff = activeConversation?.clearedBefore ?? null;
  const controlsCutoff = messageControls?.key === currentVoiceKey ? messageControls.clearedBefore : null;
  const activeClearedBefore = controlsCutoff && (!membershipCutoff || compareMessageTimestamps(controlsCutoff, membershipCutoff) > 0)
    ? controlsCutoff : membershipCutoff;
  // A delayed send/edit response may carry an older row after a clear. Apply
  // the latest server watermark at the display boundary as well as in queries.
  const messages = activeClearedBefore
    ? messageHistory.filter(message => compareMessageTimestamps(message.created_at, activeClearedBefore) > 0)
    : messageHistory;
  const { appearance, temporary, updateAppearance } = useChatAppearance(viewerId, activeConversationId);
  const themeArtworks = Array.from(sharedArtworks.values()).filter(artwork =>
    artwork.media_type === "image" && messages.some(message =>
      message.conversation_id === activeConversationId && message.artwork_id === artwork.id
    )
  );
  const backgroundArtwork = !appearance.hidden
    ? themeArtworks.find(artwork => artwork.id === appearance.artworkId) : undefined;
  const backgroundSource = appearance.hidden ? undefined : appearance.customBackground ?? backgroundArtwork?.src;
  const palette = CHAT_PALETTES[appearance.palette];
  const voiceEnabled = voiceCapability?.key === currentVoiceKey && voiceCapability?.enabled === true;
  const voiceDisabledReason = voiceCapability?.key === currentVoiceKey
    ? voiceCapability.reason
    : "Checking private voice-note delivery. Recording and preview stay on this device.";

  useEffect(() => {
    const client = supabase;
    if (!client || !viewerId || !activeConversationId || !currentVoiceKey) return;
    const controller = new AbortController();
    const isAccountCurrent = accountScope.current.capture(viewerId);
    const key = currentVoiceKey;
    async function checkVoiceDelivery() {
      try {
        const { data } = await client!.auth.getSession();
        if (controller.signal.aborted || !isAccountCurrent()) return;
        if (data.session?.user.id !== viewerId || !data.session.access_token) {
          throw new Error("Sign in again to check voice-note delivery.");
        }
        const response = await fetch(`/api/messages/voice?conversationId=${activeConversationId}`, {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
          cache: "no-store", signal: controller.signal,
        });
        const result = await response.json();
        if (controller.signal.aborted || !isAccountCurrent()) return;
        setVoiceCapability({key, enabled: response.ok && result.enabled === true,
          reason: result.reason ?? result.error ?? "Private voice-note delivery is not available yet."});
      } catch (capabilityError) {
        if (controller.signal.aborted || !isAccountCurrent()) return;
        setVoiceCapability({key, enabled: false, reason: capabilityError instanceof Error
          ? capabilityError.message : "Could not check voice-note delivery. You can still record and preview locally."});
      }
    }
    void checkVoiceDelivery();
    return () => controller.abort();
  }, [viewerId, activeConversationId, currentVoiceKey]);

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

  const inboxProfileResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];

    return profiles
      .filter((profile) => profile.id !== viewerId)
      .filter((profile) =>
        `${profile.display_name} ${profile.username}`
          .toLowerCase()
          .includes(query)
      )
      .slice(0, 12);
  }, [profiles, search, viewerId]);

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

  const hydrateMessages = useCallback(async (rows: MessageRow[]) => {
    const client = supabase;
    if (!client) return rows;
    const bucketFor = (message: MessageRow) => message.message_type === "voice"
      ? VOICE_NOTE_BUCKET : "conversation-media";
    const signedByPath = new Map<string, string | null | undefined>();
    await Promise.all(["conversation-media", VOICE_NOTE_BUCKET].map(async bucket => {
      const paths = [...new Set(rows.filter(message => bucketFor(message) === bucket)
        .map(message => message.attachment_path).filter((path): path is string => Boolean(path)))];
      if (!paths.length) return;
      const { data } = await client.storage.from(bucket).createSignedUrls(paths, 3600);
      for (const item of data ?? []) signedByPath.set(`${bucket}:${item.path}`, item.signedUrl);
    }));

    return rows.map((message) => ({
      ...message,
      attachmentUrl: message.attachment_path
        ? signedByPath.get(`${bucketFor(message)}:${message.attachment_path}`) ?? null
        : null,
    }));
  }, []);

  const loadPendingInvites = useCallback(async () => {
    const client = supabase;
    const isCurrent = accountScope.current.latest("invites");
    if (!client || !isCurrent()) return;
    const { data, error: inviteError } = await client.rpc(
      "list_my_group_invites"
    );
    if (!isCurrent()) return;

    if (inviteError) {
      if (!isMissingMessagingError(inviteError.code)) {
        setError(inviteError.message);
      }
      setPendingInvites([]);
      return;
    }

    setPendingInvites((data ?? []) as PendingGroupInvite[]);
  }, []);

  const loadSharedArtworkState = useCallback(
    async (messageRows: MessageRow[], userId: string, isCurrent = accountScope.current.capture(userId)) => {
      const client = supabase;
      if (!client || !isCurrent()) return;
      const artworkIds = Array.from(
        new Set(
          messageRows
            .map((message) => message.artwork_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      if (!artworkIds.length) {
        return;
      }

      const [artworkResult, saveResult] = await Promise.all([
        client
          .from("artworks")
          .select("id, title, src, thumb_src, media_type, mood")
          .in("id", artworkIds),
        client
          .from("artwork_saves")
          .select("artwork_id")
          .eq("user_id", userId)
          .in("artwork_id", artworkIds),
      ]);
      if (!isCurrent()) return;

      if (artworkResult.error) {
        setError(artworkResult.error.message);
      } else {
        const artworkRows = (artworkResult.data ?? []) as SharedArtwork[];
        setSharedArtworks(current => new Map([...current, ...artworkRows.map(artwork => [artwork.id, artwork] as const)]));
      }

      if (!saveResult.error) {
        setSavedArtworkIds(current =>
          new Set([...current,
            ...(saveResult.data ?? []).map(
              (row: { artwork_id: string }) => row.artwork_id
            )]
          )
        );
      }
    },
    []
  );

  const loadInbox = useCallback(async (userId: string) => {
    const client = supabase;
    const isCurrent = accountScope.current.latest("inbox", userId);
    if (!client || !isCurrent()) return;

    setLoadState(current => current === "ready" ? "ready" : "loading");
    setError(null);

    const membershipResult = await fetchViewerMemberships(client, userId);
    if (!isCurrent()) return;

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
      .limit(500);
    if (!isCurrent()) return;

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
      await loadPendingInvites();
      return;
    }

    const [conversationResult, membersResult, messagesResult] = await Promise.all([
      client
        .from("conversations")
        .select(
          "id, kind, title, avatar_path, created_by, created_at, updated_at"
        )
        .in("id", conversationIds),
      client
        .from("conversation_members")
        .select(
          "conversation_id, profile_id, role, joined_at, last_read_at, muted_until"
        )
        .in("conversation_id", conversationIds),
      client
        .from("messages")
        .select(
          "id, conversation_id, sender_id, body, message_type, artwork_id, attachment_path, attachment_mime, attachment_name, created_at"
        )
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(300),
    ]);
    if (!isCurrent()) return;

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
        const viewerMembership = viewerMembershipByConversation.get(conversation.id);
        const clearedBefore = viewerMembership?.cleared_before ?? null;
        const conversationMessages = recentMessages.filter(
          message => message.conversation_id === conversation.id &&
            (!clearedBefore || compareMessageTimestamps(message.created_at, clearedBefore) > 0)
        );
        const latestMessage = conversationMessages[0];
        const lastReadAt = viewerMembership?.last_read_at
          ? new Date(viewerMembership.last_read_at).getTime()
          : 0;
        const otherMember = conversationMembers.find(
          (membership) => membership.profile_id !== userId
        );

        return {
          ...conversation,
          members: conversationMembers,
          memberIds: conversationMembers.map((membership) => membership.profile_id),
          memberCount: conversationMembers.length,
          otherProfile: otherMember
            ? profilesMap.get(otherMember.profile_id) ?? null
            : null,
          avatarUrl: null,
          clearedBefore,
          preview: !latestMessage && clearedBefore ? "Chat cleared for you" : messagePreview(latestMessage),
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

    const avatarPaths = Array.from(
      new Set(
        nextInbox
          .map((conversation) => conversation.avatar_path)
          .filter((path): path is string => Boolean(path))
      )
    );
    let signedAvatarByPath = new Map<string, string>();

    if (avatarPaths.length) {
      const { data } = await client.storage
        .from("conversation-media")
        .createSignedUrls(avatarPaths, 3600);
      signedAvatarByPath = new Map(
        (data ?? []).flatMap((item) =>
          item.path && item.signedUrl
            ? ([[item.path, item.signedUrl]] as [string, string][])
            : []
        )
      );
    }
    if (!isCurrent()) return;
    setInbox(
      nextInbox.map((conversation) => ({
        ...conversation,
        avatarUrl: conversation.avatar_path
          ? signedAvatarByPath.get(conversation.avatar_path) ?? null
          : null,
      }))
    );
    setLoadState("ready");
    await loadPendingInvites();
  }, [loadPendingInvites]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const scope = accountScope.current;
    const stop = observeAccount(client.auth, (userId) => {
      const changed = scope.account() !== userId;
      scope.setAccount(userId);
      setViewerId(userId);
      setAuthReady(true);
      if (changed || !userId) {
        conversationVersion.current += 1;
        setInbox([]);
        setProfiles([]);
        setMessages([]);
        setPendingInvites([]);
        setSharedArtworks(new Map());
        setSavedArtworkIds(new Set());
        setDraft("");
        setError(null);
        setOlderCursor(null);
        setLoadingOlder(false);
        setSending(false);
        setUploadingMedia(false);
        setVoiceActiveKey(null);
        setVoiceSending(false);
        setVoiceCapability(null);
        setMessageControls(null);
        setConversationOptionsKey(null);
        setClearArmed(false);
        setClearingConversation(false);
        setClearError(null);
        voiceSendLock.current = null;
        setCreatingGroup(false);
        setStartingDirectId(null);
        setBusyInviteId(null);
        setSavingArtworkId(null);
        setGroupTitle("");
        setGroupSearch("");
        setSelectedMemberIds([]);
        setGroupSettingsOpen(false);
        setNewMessageOpen(false);
        setArtworkShareOpen(false);
        startedProfileRef.current = null;
      }
      if (userId) queueMicrotask(() => void loadInbox(userId));
      else setLoadState("signed-out");
    });
    return () => {
      stop();
      scope.clear();
      conversationVersion.current += 1;
    };
  }, [loadInbox]);

  useEffect(() => {
    const client = supabase;
    if (!client || !viewerId || loadState === "unavailable") return;

    const channel = client
      .channel(`nodeine-inbox-${viewerId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => loadInbox(viewerId)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_members" },
        () => loadInbox(viewerId)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        () => loadInbox(viewerId)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_invites",
          filter: `invited_profile_id=eq.${viewerId}`,
        },
        () => loadPendingInvites()
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [loadInbox, loadPendingInvites, loadState, viewerId]);

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
      const isCurrent = accountScope.current.capture(currentViewerId);
      if (!isCurrent()) return;
      const { data, error: startError } = await database.rpc(
        "start_direct_conversation",
        { other_profile_id: initialProfileId }
      );
      if (!isCurrent()) return;

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
    const version = conversationVersion.current;
    const isAccountCurrent = accountScope.current.capture(currentViewerId);
    const isCurrent = () => !cancelled && isAccountCurrent() && conversationVersion.current === version;
    let nextCursor: MessageCursor | null = null;
    let pagePending = false;
    let initialPageReady = false;
    let received: MessageRow[] = [];
    let clearedBefore = activeClearedBefore;
    const controlsRequest = getMessageControls(database, currentConversationId).then(controls => {
      if (!isCurrent()) return controls;
      if (controls.clearedBefore && (!clearedBefore || compareMessageTimestamps(controls.clearedBefore, clearedBefore) > 0)) {
        clearedBefore = controls.clearedBefore;
      }
      setMessageControls({key: `${currentViewerId}:${currentConversationId}`, ...controls});
      return controls;
    }).catch(() => ({enabled: false, clearedBefore, reason: "Message controls could not be checked. Reopen this conversation to retry."}));
    historyAnchor.current = null;
    lastHandledMessage.current = null;
    followingMessages.current = true;
    unseenMessageCount.current = 0;

    async function markRetrievedRead(through: string | null) {
      try {
        if (!await persistConversationRead(database, currentViewerId, currentConversationId, through, isCurrent)) return;
        // A message can arrive after our SELECT. Reload counts from its stored
        // timestamp rather than clearing every unread message optimistically.
        if (isCurrent()) await loadInbox(currentViewerId);
      } catch {
        if (isCurrent()) setError("Messages loaded, but the read status could not be saved. Reopen the conversation to retry.");
      }
    }

    async function loadPage(before: MessageCursor | null) {
      if (!isCurrent() || pagePending) return;
      pagePending = true;
      if (before) setLoadingOlder(true);
      else setConversationLoading(true);
      try {
        const controls = await controlsRequest;
        if (!isCurrent()) return;
        const page = await fetchMessagePage(database, currentConversationId, before, {controlsEnabled: controls.enabled, clearedBefore});
        if (!isCurrent()) return;
        const messageRows = await hydrateMessages(page.rows);
        if (!isCurrent()) return;
        await loadSharedArtworkState(messageRows, currentViewerId, isCurrent);
        if (!isCurrent()) return;
        if (before && messagesScrollerRef.current) {
          historyAnchor.current = {
            height: messagesScrollerRef.current.scrollHeight,
            top: messagesScrollerRef.current.scrollTop,
          };
        }
        received = mergeMessageHistory(received, messageRows);
        setMessages(current => mergeMessageHistory(current, messageRows));
        nextCursor = page.olderCursor;
        setOlderCursor(nextCursor);
        if (!before) {
          initialPageReady = true;
          setConversationLoading(false);
          // The newest retrieved row (including buffered realtime inserts) is
          // the watermark; never browser time or an unseen future message.
          await markRetrievedRead(received.at(-1)?.created_at ?? null);
        }
      } catch {
        if (isCurrent()) setError(before ? "Older messages could not be loaded. Please try again." : "Messages could not be loaded. Reopen the conversation to retry.");
      } finally {
        pagePending = false;
        if (isCurrent()) {
          setConversationLoading(false);
          setLoadingOlder(false);
        }
      }
    }
    loadOlderRef.current = async () => {
      if (nextCursor) await loadPage(nextCursor);
    };
    queueMicrotask(() => {
      if (!isCurrent()) return;
      setMessages([]);
      setSharedArtworks(new Map());
      setSavedArtworkIds(new Set());
      setOlderCursor(null);
      setLoadingOlder(false);
      setNewMessageCount(0);
      void loadPage(null);
    });

    const channel = database
      .channel(`nodeine-conversation-${currentConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${currentConversationId}`,
        },
        async (payload) => {
          if (!isCurrent()) return;
          // Hard deletion is not used by message controls; tombstones arrive as UPDATE.
          if (payload.eventType === "DELETE") return;
          await controlsRequest;
          if (!isCurrent()) return;
          if (clearedBefore && compareMessageTimestamps((payload.new as MessageRow).created_at, clearedBefore) <= 0) return;
          const [incoming] = await hydrateMessages([payload.new as MessageRow]);
          if (!incoming || !isCurrent()) return;
          await loadSharedArtworkState([incoming], currentViewerId, isCurrent);
          if (!isCurrent()) return;
          received = mergeMessageHistory(received, [incoming]);
          setMessages(current => mergeMessageHistory(current, [incoming]));
          if (initialPageReady && payload.eventType === "INSERT") await markRetrievedRead(incoming.created_at);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      loadOlderRef.current = null;
      database.removeChannel(channel);
    };
  }, [
    activeConversationId,
    hydrateMessages,
    loadInbox,
    loadSharedArtworkState,
    viewerId,
    activeClearedBefore,
  ]);

  useLayoutEffect(() => {
    const result = syncMessageViewport({
      loading: conversationLoading,
      scroller: messagesScrollerRef.current,
      anchor: historyAnchor.current,
      messages,
      previousId: lastHandledMessage.current,
      viewerId,
      following: followingMessages.current,
      unseenCount: unseenMessageCount.current,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
    lastHandledMessage.current = result.previousId;
    historyAnchor.current = result.anchor;
    if (unseenMessageCount.current !== result.unseenCount) {
      unseenMessageCount.current = result.unseenCount;
      setNewMessageCount(result.unseenCount);
    }
  }, [messages, conversationLoading, viewerId]);

  function trackMessageScroll() {
    const scroller = messagesScrollerRef.current;
    if (!scroller) return;
    followingMessages.current = isMessageViewportNearBottom(scroller);
    if (followingMessages.current && unseenMessageCount.current) {
      unseenMessageCount.current = 0;
      setNewMessageCount(0);
    }
  }

  function showNewestMessages() {
    const scroller = messagesScrollerRef.current;
    if (!scroller) return;
    followingMessages.current = true;
    unseenMessageCount.current = 0;
    setNewMessageCount(0);
    scrollMessageViewportToEnd(scroller, window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    scroller.focus({preventScroll: true});
  }

  const resetConversationComposer = useCallback(() => {
    setSending(false);
    setUploadingMedia(false);
    setVoiceActiveKey(null);
    setVoiceSending(false);
    voiceSendLock.current = null;
    setConversationOptionsKey(null);
    setClearArmed(false);
    setClearingConversation(false);
    setClearError(null);
    setSavingArtworkId(null);
    setDraft("");
    setDragActive(false);
    setArtworkShareOpen(false);
    setGroupSettingsOpen(false);
    setError(null);
    followingMessages.current = true;
    unseenMessageCount.current = 0;
    setNewMessageCount(0);
  }, []);

  useEffect(() => {
    function syncConversationFromHistory() {
      const conversationId = new URLSearchParams(window.location.search).get(
        "conversation"
      );
      const next = conversationId && uuidPattern.test(conversationId) ? conversationId : null;
      if (next !== activeConversationId) {
        conversationVersion.current += 1;
        resetConversationComposer();
      }
      setActiveConversationId(next);
    }

    window.addEventListener("popstate", syncConversationFromHistory);
    return () =>
      window.removeEventListener("popstate", syncConversationFromHistory);
  }, [activeConversationId, resetConversationComposer]);

  function selectConversation(conversationId: string) {
    if (conversationId !== activeConversationId) {
      conversationVersion.current += 1;
      resetConversationComposer();
    }
    setActiveConversationId(conversationId);
    window.history.pushState(
      null,
      "",
      `/messages?conversation=${conversationId}`
    );
  }

  function closeConversation() {
    conversationVersion.current += 1;
    resetConversationComposer();
    setActiveConversationId(null);
    setMessages([]);
    setSharedArtworks(new Map());
    setSavedArtworkIds(new Set());
    setGroupSettingsOpen(false);
    window.history.pushState(null, "", "/messages");
  }

  function captureConversation() {
    const isAccountCurrent = accountScope.current.capture(viewerId);
    const version = conversationVersion.current;
    return () => isAccountCurrent() && conversationVersion.current === version;
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    const body = draft.trim();

    if (!client || !viewerId || !activeConversationId || !body || sending || uploadingMedia || voiceSending || voiceActive) return;
    const isCurrent = captureConversation();
    if (!isCurrent()) return;

    setSending(true);
    setError(null);

    const { data, error: sendError } = await client
      .from("messages")
      .insert({
        conversation_id: activeConversationId,
        sender_id: viewerId,
        body,
        message_type: "text",
      })
      .select(
        "id, conversation_id, sender_id, body, message_type, artwork_id, attachment_path, attachment_mime, attachment_name, created_at"
      )
      .single();
    if (!isCurrent()) return;

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
    if (!isCurrent()) return;
    setSending(false);
  }

  async function shareArtwork(artwork: SharedArtwork) {
    const client = supabase;
    if (!client || !viewerId || !activeConversationId || sending) return false;
    const isCurrent = captureConversation();
    if (!isCurrent()) return false;
    setSending(true);

    const { data, error: shareError } = await client
      .from("messages")
      .insert({
        conversation_id: activeConversationId,
        sender_id: viewerId,
        body: null,
        message_type: "artwork",
        artwork_id: artwork.id,
      })
      .select(
        "id, conversation_id, sender_id, body, message_type, artwork_id, attachment_path, attachment_mime, attachment_name, created_at"
      )
      .single();
    if (!isCurrent()) return false;

    if (shareError) {
      setError(shareError.message);
      toast.error("Artwork wasn't shared", { description: shareError.message });
      setSending(false);
      return false;
    }

    const message = data as MessageRow;
    setMessages((current) =>
      current.some((item) => item.id === message.id)
        ? current
        : [...current, message]
    );
    setSharedArtworks((current) => {
      const next = new Map(current);
      next.set(artwork.id, artwork);
      return next;
    });
    await loadInbox(viewerId);
    if (!isCurrent()) return false;
    toast.success("Artwork shared");
    setSending(false);
    return true;
  }

  async function saveSharedArtwork(artworkId: string) {
    const client = supabase;
    if (!client || !viewerId || savedArtworkIds.has(artworkId)) return;
    const isCurrent = captureConversation();
    if (!isCurrent()) return;
    setSavingArtworkId(artworkId);

    const { error: saveError } = await client.from("artwork_saves").insert({
      artwork_id: artworkId,
      user_id: viewerId,
    });
    if (!isCurrent()) return;

    if (saveError && saveError.code !== "23505") {
      toast.error("Artwork wasn't saved", { description: saveError.message });
      setSavingArtworkId(null);
      return;
    }

    setSavedArtworkIds((current) => new Set(current).add(artworkId));
    setSavingArtworkId(null);
    toast.success("Artwork saved to your stash");
  }

  async function saveAllSharedArtwork() {
    const client = supabase;
    if (!client || !viewerId || savingArtworkId) return;
    const isCurrent = captureConversation();
    if (!isCurrent()) return;
    const unsavedIds = Array.from(
      new Set(
        messages
          .map((message) => message.artwork_id)
          .filter(
            (id): id is string => Boolean(id) && !savedArtworkIds.has(id as string)
          )
      )
    );

    if (!unsavedIds.length) {
      toast.success("All shared artwork is already in your stash");
      return;
    }

    setSavingArtworkId("all");
    const { error: saveError } = await client.from("artwork_saves").upsert(
      unsavedIds.map((artworkId) => ({
        artwork_id: artworkId,
        user_id: viewerId,
      })),
      {
        onConflict: "artwork_id,user_id",
        ignoreDuplicates: true,
      }
    );
    if (!isCurrent()) return;

    if (saveError) {
      toast.error("Shared artwork wasn't saved", {
        description: saveError.message,
      });
      setSavingArtworkId(null);
      return;
    }

    setSavedArtworkIds((current) => {
      const next = new Set(current);
      unsavedIds.forEach((artworkId) => next.add(artworkId));
      return next;
    });
    setSavingArtworkId(null);
    toast.success(
      `${unsavedIds.length} shared ${unsavedIds.length === 1 ? "piece" : "pieces"} saved`
    );
  }

  async function changeOwnMessage(message: MessageRow, body?: string) {
    const client = supabase;
    if (!client || !viewerId || !controlsEnabled || message.sender_id !== viewerId || message.conversation_id !== activeConversationId) {
      throw new Error("Message controls are not available for this message.");
    }
    const isCurrent = captureConversation();
    const isAccountCurrent = accountScope.current.capture(viewerId);
    if (!isCurrent()) throw new Error("The conversation changed. Please reopen the message.");
    const result = body !== undefined
      ? {message: await editOwnMessage(client, message, body), removedAttachment: null}
      : await removeOwnMessage(client, message);
    if (!isAccountCurrent()) return;
    if (isCurrent()) {
      setMessages(current => mergeMessageHistory(current, [{...result.message, attachmentUrl: body !== undefined ? message.attachmentUrl : null}]));
    }
    if (result.removedAttachment) {
      // The server has confirmed the tombstone. Never remove media on an
      // ambiguous mutation response, or under a newly switched account.
      try {
        const {error: cleanupError} = await client.storage.from(result.removedAttachment.bucket).remove([result.removedAttachment.path]);
        if (cleanupError && isCurrent()) toast.warning("Message removed; its stored file still needs cleanup.");
      } catch {
        if (isCurrent()) toast.warning("Message removed; its stored file still needs cleanup.");
      }
    }
    if (isAccountCurrent()) void loadInbox(viewerId);
  }

  async function clearConversationForMe() {
    if (!supabase || !viewerId || !activeConversationId || !controlsEnabled || clearingConversation) return;
    const isCurrent = captureConversation();
    if (!isCurrent()) return;
    setClearingConversation(true);
    setClearError(null);
    try {
      const {clearedBefore} = await clearMyConversation(supabase, activeConversationId);
      if (!isCurrent()) return;
      // A realtime message may already have arrived after the server cutoff.
      setMessages(current => current.filter(message => compareMessageTimestamps(message.created_at, clearedBefore) > 0));
      setOlderCursor(null);
      setInbox(current => current.map(conversation => conversation.id === activeConversationId
        ? {...conversation, clearedBefore, preview: "Chat cleared for you", unreadCount: 0} : conversation));
      setConversationOptionsKey(null);
      setClearArmed(false);
      toast.success("Chat cleared for you. Other members keep their copies.");
      void loadInbox(viewerId);
    } catch (clearFailure) {
      if (isCurrent()) setClearError(clearFailure instanceof Error ? clearFailure.message : "Could not confirm the change. Reopen the conversation before trying again.");
    } finally {
      if (isCurrent()) setClearingConversation(false);
    }
  }

  async function sendVoiceNote(note: VoiceNotePayload) {
    const client = supabase;
    if (!client || !viewerId || !activeConversationId || !voiceEnabled) {
      throw new Error("Private voice-note delivery is not active for this conversation.");
    }
    if (voiceSendLock.current) throw new Error("A voice note is already sending.");
    const isCurrent = captureConversation();
    const isAccountCurrent = accountScope.current.capture(viewerId);
    if (!isCurrent()) throw new Error("The conversation changed. Please try again.");
    const operation = Symbol("voice-send");
    voiceSendLock.current = operation;
    setVoiceSending(true);
    try {
      const { data } = await client.auth.getSession();
      if (!isCurrent() || data.session?.user.id !== viewerId || !data.session.access_token) {
        throw new Error("Your session changed. Please open the conversation again.");
      }
      const persisted = await deliverVoiceNote({
        accessToken: data.session.access_token,
        conversationId: activeConversationId,
        senderId: viewerId,
        file: note.file,
        durationMs: note.durationMs,
      });
      if (!isAccountCurrent()) return;
      if (isCurrent()) {
        const [message] = await hydrateMessages([persisted]);
        if (isCurrent()) {
          setMessages(current => mergeMessageHistory(current, [message]));
          toast.success("Voice note sent");
        }
      }
      if (isAccountCurrent()) void loadInbox(viewerId);
    } finally {
      if (voiceSendLock.current === operation) voiceSendLock.current = null;
      if (isCurrent()) setVoiceSending(false);
    }
  }

  async function sendAttachment(file: File) {
    const client = supabase;
    if (!client || !viewerId || !activeConversationId || uploadingMedia || voiceSending || voiceActive) return;
    const isAccountCurrent = accountScope.current.capture(viewerId);
    const isCurrent = captureConversation();
    if (!isCurrent()) return;

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const isImage = file.type.startsWith("image/");
    const isVideo =
      file.type.startsWith("video/") || ["mov", "m4v", "mp4", "webm"].includes(extension);
    const messageType = isImage ? "image" : isVideo ? "video" : null;

    if (!messageType) {
      toast.error("Choose an image or video file");
      return;
    }

    const maxBytes = messageType === "image" ? 15 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(
        messageType === "image"
          ? "Images must be 15 MB or smaller"
          : "Videos must be 100 MB or smaller"
      );
      return;
    }

    const fallbackMime =
      extension === "mov"
        ? "video/quicktime"
        : extension === "m4v"
          ? "video/x-m4v"
          : messageType === "image"
            ? "image/jpeg"
            : "video/mp4";
    const mimeType = file.type || fallbackMime;
    const attachmentPath = `${activeConversationId}/attachments/${safeAttachmentName(file.name)}`;
    const caption = draft.trim() || null;

    setUploadingMedia(true);
    setError(null);

    let persisted: MessageRow | null;
    try {
      persisted = await persistMessageAttachment(client, {
        accountId: viewerId, conversationId: activeConversationId,
        path: attachmentPath, file, mime: mimeType, caption, messageType,
      }, isAccountCurrent);
    } catch (attachmentError) {
      if (!isCurrent()) return;
      setUploadingMedia(false);
      toast.error("Media message wasn't sent", {description: attachmentError instanceof Error ? attachmentError.message : "Please try again."});
      return;
    }
    if (!persisted || !isAccountCurrent()) return;

    if (!isCurrent()) {
      void loadInbox(viewerId);
      return;
    }

    const [message] = await hydrateMessages([persisted]);
    if (!isCurrent()) return;
    setMessages((current) =>
      current.some((item) => item.id === message.id)
        ? current
        : [...current, message]
    );
    setDraft("");
    setUploadingMedia(false);
    await loadInbox(viewerId);
    if (!isCurrent()) return;
    toast.success(messageType === "image" ? "Image shared" : "Video shared");
  }

  function handleMediaDrag(event: DragEvent<HTMLDivElement>) {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setDragActive(true);
  }

  function handleMediaDragLeave(event: DragEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }
    setDragActive(false);
  }

  function handleMediaDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) sendAttachment(file);
  }

  async function respondToInvite(inviteId: string, accept: boolean) {
    const client = supabase;
    if (!client || !viewerId || busyInviteId) return;
    const isCurrent = accountScope.current.capture(viewerId);
    if (!isCurrent()) return;
    setBusyInviteId(inviteId);
    const { data, error: inviteError } = await client.rpc(
      "respond_to_group_invite",
      {
        target_invite_id: inviteId,
        accept_invite: accept,
      }
    );
    if (!isCurrent()) return;
    setBusyInviteId(null);

    if (inviteError) {
      toast.error("Invitation response wasn't saved", {
        description: inviteError.message,
      });
      return;
    }

    await loadInbox(viewerId);
    if (!isCurrent()) return;
    if (accept) {
      const conversationId = data as string;
      selectConversation(conversationId);
      toast.success("Group invitation accepted");
    } else {
      toast.success("Invitation declined");
    }
  }

  function handleGroupLeft() {
    closeConversation();
    if (viewerId) loadInbox(viewerId);
  }

  async function startDirectMessage(profileId: string) {
    const client = supabase;
    if (!client || !viewerId || startingDirectId) return;
    const isCurrent = accountScope.current.capture(viewerId);
    if (!isCurrent()) return;

    setStartingDirectId(profileId);
    setError(null);

    const { data, error: startError } = await client.rpc(
      "start_direct_conversation",
      { other_profile_id: profileId }
    );
    if (!isCurrent()) return;

    if (startError) {
      const message = isMissingMessagingError(startError.code)
        ? "Messaging is waiting for its database connection."
        : startError.message;
      setError(message);
      toast.error("Conversation couldn't be opened", {
        description: message,
      });
      setStartingDirectId(null);
      return;
    }

    const conversationId = data as string;
    setNewMessageOpen(false);
    setNewMessageMode("direct");
    setGroupSearch("");
    setSelectedMemberIds([]);
    setSearch("");
    setActiveConversationId(conversationId);
    window.history.pushState(
      null,
      "",
      `/messages?conversation=${conversationId}`
    );
    await loadInbox(viewerId);
    if (!isCurrent()) return;
    setStartingDirectId(null);
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
      selectedMemberIds.length < 2 ||
      creatingGroup
    ) {
      return;
    }

    const isCurrent = accountScope.current.capture(viewerId);
    if (!isCurrent()) return;
    setCreatingGroup(true);
    setError(null);

    const { data, error: groupError } = await client.rpc(
      "create_group_conversation",
      {
        conversation_title: title,
        member_ids: selectedMemberIds,
      }
    );
    if (!isCurrent()) return;

    if (groupError) {
      setError(groupError.message);
      toast.error("Group wasn't created", { description: groupError.message });
    } else {
      const conversationId = data as string;
      setNewMessageOpen(false);
      setNewMessageMode("direct");
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
      if (!isCurrent()) return;
      toast.success("Group created and invitations sent");
    }

    setCreatingGroup(false);
  }

  return (
    <main
      data-chat-shell={shellMode}
      // The contained inbox reserves dock space inside its panels. Override the
      // global page-level dock padding so the same space is not reserved twice.
      style={loadState === "ready" ? { paddingBottom: 0 } : undefined}
      className={`${loadState === "ready" ? "flex h-dvh flex-col overflow-hidden" : "min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-0"} bg-zinc-950 text-zinc-100`}
    >
      <header data-chat-part="brand" className={`${focusedConversation ? "hidden lg:block" : "block"} shrink-0 border-b border-white/10 px-5 py-5 sm:px-8`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link
            href="/"
            className="text-lg font-light tracking-[0.24em] text-white hover:text-cyan-200"
          >
            NODEINE
          </Link>
          <DesktopAppNavigation />
        </div>
      </header>

      {!authReady || loadState === "loading" ? (
        <WorldLoadingScreen variant="viewport" label="Opening your inbox…" />
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
        <section className="grid min-h-0 w-full flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[clamp(280px,26vw,360px)_minmax(0,1fr)]">
          <aside
            className={`min-h-0 border-white/10 pb-[var(--nodeine-mobile-nav-clearance)] lg:border-r lg:pb-0 ${
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
                  onClick={() => {
                    setNewMessageMode("direct");
                    setGroupTitle("");
                    setGroupSearch("");
                    setSelectedMemberIds([]);
                    setNewMessageOpen(true);
                  }}
                  className="rounded-full"
                  aria-label="Start a new message"
                  title="Start a new message"
                >
                  <Plus />
                </Button>
              </div>
              <button type="button" onClick={() => {
                setNewMessageMode("group");
                setGroupTitle("");
                setGroupSearch("");
                setSelectedMemberIds([]);
                setNewMessageOpen(true);
              }} className="nodeine-action mt-2 flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-cyan-200 hover:bg-cyan-300/10 focus-visible:outline-2 focus-visible:outline-cyan-300">
                <Users className="size-4" aria-hidden="true" /> New group
              </button>

              <label className="relative mt-5 block">
                <span className="sr-only">Search people and conversations</span>
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
                <Input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Find people or conversations"
                  className="h-11 border-white/10 bg-black/45 pl-10"
                />
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {!search && pendingInvites.length > 0 && (
                <section className="border-b border-cyan-300/15 bg-cyan-300/[0.035] px-5 py-4 sm:px-7">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                    Group invitations
                  </p>
                  <div className="mt-3 space-y-3">
                    {pendingInvites.map((invite) => {
                      const inviter = profileById.get(invite.invited_by);
                      const responding = busyInviteId === invite.invite_id;
                      return (
                        <article
                          key={invite.invite_id}
                          className="rounded-xl border border-white/10 bg-black/30 p-3"
                        >
                          <div className="flex items-center gap-3">
                            <ConversationAvatar group className="size-10" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-white">
                                {invite.conversation_title}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-zinc-600">
                                Invited by {inviter?.display_name ?? "a creator"}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => respondToInvite(invite.invite_id, false)}
                              disabled={Boolean(busyInviteId)}
                              className="nodeine-action inline-flex min-h-9 flex-1 items-center justify-center rounded-lg border border-white/10 px-3 text-xs text-zinc-400 hover:border-white/25 hover:text-white"
                            >
                              Decline
                            </button>
                            <button
                              type="button"
                              onClick={() => respondToInvite(invite.invite_id, true)}
                              disabled={Boolean(busyInviteId)}
                              className="nodeine-action inline-flex min-h-9 flex-1 items-center justify-center rounded-lg bg-cyan-300 px-3 text-xs font-medium text-zinc-950 hover:bg-cyan-200 disabled:opacity-60"
                            >
                              {responding ? (
                                <LoaderCircle className="size-4 animate-spin" />
                              ) : (
                                "Join group"
                              )}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              {search && inboxProfileResults.length > 0 && (
                <section className="border-b border-white/10">
                  <p className="px-5 pb-2 pt-4 text-[10px] uppercase tracking-[0.2em] text-cyan-300 sm:px-7">
                    People
                  </p>
                  {inboxProfileResults.map((profile) => (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => startDirectMessage(profile.id)}
                      disabled={Boolean(startingDirectId)}
                      className="nodeine-action flex w-full items-center gap-3 border-t border-white/8 px-5 py-3 text-left hover:bg-white/[0.035] disabled:cursor-wait disabled:opacity-60 sm:px-7"
                    >
                      <ConversationAvatar profile={profile} className="size-10" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-zinc-100">
                          {profile.display_name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-zinc-600">
                          @{profile.username}
                        </span>
                      </span>
                      {startingDirectId === profile.id ? (
                        <LoaderCircle className="size-4 animate-spin text-cyan-300" />
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-cyan-300">
                          <MessageCircle className="size-4" />
                          Message
                        </span>
                      )}
                    </button>
                  ))}
                </section>
              )}

              {filteredInbox.length ? (
                <section>
                  {search && (
                    <p className="px-5 pb-2 pt-4 text-[10px] uppercase tracking-[0.2em] text-zinc-600 sm:px-7">
                      Conversations
                    </p>
                  )}
                  {filteredInbox.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => selectConversation(conversation.id)}
                      className="nodeine-action flex w-full items-center gap-3 border-b border-white/8 px-5 py-4 text-left hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300 sm:px-7"
                    >
                      <ConversationAvatar
                        profile={conversation.otherProfile}
                        group={conversation.kind === "group"}
                        groupAvatarUrl={conversation.avatarUrl}
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
                  ))}
                </section>
              ) : inboxProfileResults.length ? null : (
                <div className="grid min-h-80 place-items-center px-6 text-center">
                  <div className="max-w-xs">
                    <MessageCircle className="mx-auto size-9 text-zinc-700" />
                    <h2 className="mt-4 text-xl font-light text-white">
                      {search ? "No people found" : "Start with an artist"}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-600">
                      {search
                        ? "Try another display name or username."
                        : "Tap + to message a creator directly or start a group chat."}
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
            data-chat-part="conversation"
            style={{ "--chat-bubble": palette.background, "--chat-ink": palette.foreground } as CSSProperties}
            className={`min-h-0 min-w-0 ${
              activeConversationId ? "flex" : "hidden lg:flex"
            } flex-col ${focusedConversation ? "pb-[env(safe-area-inset-bottom)]" : "pb-[var(--nodeine-mobile-nav-clearance)]"} lg:pb-0`}
          >
            {activeConversation ? (
              <>
                <header data-chat-part="conversation-header" className="flex min-h-16 shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-zinc-950/95 px-3 py-2 sm:px-6 lg:min-h-[76px] lg:gap-3 lg:py-3">
                  <button
                    type="button"
                    onClick={closeConversation}
                    className="nodeine-action grid size-11 shrink-0 place-items-center rounded-full text-zinc-300 hover:bg-white/5 hover:text-white lg:hidden"
                    aria-label="Back to inbox"
                  >
                    <ArrowLeft className="size-5" />
                  </button>
                  <ConversationAvatar
                    profile={activeConversation.otherProfile}
                    group={activeConversation.kind === "group"}
                    groupAvatarUrl={activeConversation.avatarUrl}
                    className="size-10"
                  />
                  <div className="min-w-0 flex-1">
                    {activeConversation.kind === "direct" && activeConversation.otherProfile ? (
                      <Link href={`/creator/${activeConversation.otherProfile.username}`} title="View creator profile" className="nodeine-action flex min-h-11 min-w-0 flex-col justify-center rounded-md focus-visible:outline-2 focus-visible:outline-cyan-300">
                        <h2 className="w-full truncate text-sm font-medium text-white">{conversationName(activeConversation)}</h2>
                        <p className="mt-0.5 w-full truncate text-xs text-zinc-400">@{activeConversation.otherProfile.username}</p>
                      </Link>
                    ) : (
                      <div className="flex min-h-11 min-w-0 flex-col justify-center">
                        <h2 className="truncate text-sm font-medium text-white">{conversationName(activeConversation)}</h2>
                        <p className="mt-0.5 truncate text-xs text-zinc-400">
                          {activeConversation.kind === "group"
                            ? `${activeConversation.memberCount} ${activeConversation.memberCount === 1 ? "member" : "members"}`
                            : "Private conversation"}
                        </p>
                      </div>
                    )}
                  </div>
                  <ChatAppearanceDialog key={`${viewerId}:${activeConversationId}`} appearance={appearance} temporary={temporary} artworks={themeArtworks} onChange={updateAppearance} />
                  <button type="button" aria-label="Conversation options" title="Conversation options"
                    onClick={() => {setConversationOptionsKey(currentVoiceKey); setClearArmed(false); setClearError(null);}}
                    className="nodeine-action grid size-11 shrink-0 place-items-center rounded-full text-zinc-300 hover:bg-white/5 hover:text-cyan-200">
                    <MoreHorizontal className="size-4" />
                  </button>
                  {activeConversation.kind === "direct" && activeConversation.otherProfile && (
                    <Link
                      href={`/creator/${activeConversation.otherProfile.username}`}
                      className="nodeine-action hidden min-h-11 items-center rounded-lg border border-white/10 px-3 text-xs text-zinc-300 hover:border-cyan-300/40 hover:text-cyan-200 lg:inline-flex"
                    >
                      Profile
                    </Link>
                  )}
                </header>

                <div
                  data-chat-part="history"
                  ref={messagesScrollerRef}
                  onScroll={trackMessageScroll}
                  tabIndex={-1}
                  role="region"
                  aria-label="Conversation messages"
                  style={backgroundSource ? {
                    backgroundImage: `linear-gradient(rgb(9 11 15 / ${appearance.dim / 100}), rgb(9 11 15 / ${appearance.dim / 100})), url(${JSON.stringify(backgroundSource)})`,
                    backgroundSize: "cover", backgroundPosition: "center 25%",
                  } : undefined}
                  className={`relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 lg:py-5 ${
                    dragActive ? "bg-cyan-300/[0.035]" : ""
                  }`}
                  onDragEnter={handleMediaDrag}
                  onDragOver={handleMediaDrag}
                  onDragLeave={handleMediaDragLeave}
                  onDrop={handleMediaDrop}
                >
                  {dragActive && (
                    <div className="pointer-events-none absolute inset-3 z-20 grid place-items-center rounded-2xl border-2 border-dashed border-cyan-300/70 bg-zinc-950/90 backdrop-blur">
                      <div className="text-center">
                        <UploadCloud className="mx-auto size-8 text-cyan-300" />
                        <p className="mt-3 text-sm font-medium text-white">
                          Drop image or video
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          It stays inside this conversation.
                        </p>
                      </div>
                    </div>
                  )}
                  {conversationLoading ? (
                    <WorldLoadingScreen variant="panel" label="Opening your conversation…" />
                  ) : messages.length ? (
                    <div className="flex min-w-0 flex-col gap-3">
                      {olderCursor && (
                        <Button type="button" variant="outline" className="min-h-11 self-center border-white/15 text-zinc-300" disabled={loadingOlder} onClick={() => void loadOlderRef.current?.()}>
                          {loadingOlder ? <><LoaderCircle className="size-4 animate-spin" /> Loading older messages…</> : "Load older messages"}
                        </Button>
                      )}
                      {messages.map((message) => {
                        const mine = message.sender_id === viewerId;
                        const sender = profileById.get(message.sender_id);
                        const artwork = message.artwork_id
                          ? sharedArtworks.get(message.artwork_id)
                          : null;
                        const mediaMessage =
                          message.message_type === "image" ||
                          message.message_type === "video";

                        return (
                          <article
                            key={message.id}
                            className={`flex gap-2.5 ${mine ? "justify-end" : "justify-start"}`}
                          >
                            {!mine && (
                              <ConversationAvatar
                                profile={sender}
                                className="mt-1 size-8"
                              />
                            )}
                            <div
                              className={`min-w-0 max-w-[min(82%,42rem)] sm:max-w-[min(72%,42rem)] ${message.message_type === "voice" ? "w-72" : ""} ${
                                mine ? "text-right" : "text-left"
                              }`}
                            >
                              {!mine && activeConversation.kind === "group" && (
                                <p className="mb-1 w-fit max-w-full break-words rounded-md bg-[#202632] px-2 py-1 text-[11px] text-[#c7cfde]">
                                  {sender?.display_name ?? "NODEINE creator"}
                                </p>
                              )}
                              {message.removed_at ? (
                                <p className="rounded-2xl bg-[#252d3a] px-4 py-3 text-left text-sm italic text-zinc-300">Message removed</p>
                              ) : message.message_type === "artwork" && artwork ? (
                                <div className="space-y-2">
                                  <ChatArtworkCard
                                    artwork={artwork}
                                    saved={savedArtworkIds.has(artwork.id)}
                                    saving={savingArtworkId === artwork.id}
                                    onSave={saveSharedArtwork}
                                  />
                                  {message.body && (
                                    <div
                                      className={`rounded-2xl px-4 py-2.5 text-left text-sm leading-6 ${
                                        mine
                                          ? "rounded-br-md bg-[var(--chat-bubble)] text-[var(--chat-ink)]"
                                          : "rounded-bl-md border border-white/10 bg-[#252d3a] text-[#f2f3f8]"
                                      }`}
                                    >
                                      <p className="whitespace-pre-wrap break-words">
                                        {message.body}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ) : message.message_type === "voice" && message.attachmentUrl ? (
                                <VoiceNotePlayer key={message.attachmentUrl} src={message.attachmentUrl} mimeType={message.attachment_mime} durationMs={message.voice_duration_ms} outgoing={mine} />
                              ) : mediaMessage && message.attachmentUrl ? (
                                <div
                                  className={`overflow-hidden rounded-2xl border bg-zinc-950 ${
                                    mine
                                      ? "rounded-br-md border-cyan-300/25"
                                      : "rounded-bl-md border-white/10"
                                  }`}
                                >
                                  {message.message_type === "video" ? (
                                    <video
                                      src={message.attachmentUrl}
                                      controls
                                      playsInline
                                      preload="metadata"
                                      className="max-h-[520px] w-full object-contain"
                                    />
                                  ) : (
                                    <PolishedImage
                                      src={message.attachmentUrl}
                                      alt={message.attachment_name ?? "Shared image"}
                                      wrapperClassName="max-h-[520px] w-full"
                                      className="max-h-[520px] w-full object-contain"
                                    />
                                  )}
                                  {message.body && (
                                    <p className="whitespace-pre-wrap break-words px-4 py-3 text-left text-sm leading-6 text-zinc-200">
                                      {message.body}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div
                                  className={`rounded-2xl px-4 py-2.5 text-left text-sm leading-6 ${
                                    mine
                                      ? "rounded-br-md bg-[var(--chat-bubble)] text-[var(--chat-ink)]"
                                      : "rounded-bl-md border border-white/10 bg-[#252d3a] text-[#f2f3f8]"
                                  }`}
                                >
                                  <p className="whitespace-pre-wrap break-words">
                                    {message.body ??
                                      (message.message_type === "artwork"
                                        ? "Shared artwork is unavailable."
                                        : "Shared media is unavailable.")}
                                  </p>
                                </div>
                              )}
                              <div className={`mt-1 flex items-center gap-1 ${mine ? "justify-end" : "justify-start"}`}>
                                <time className="inline-block rounded-md bg-[#202632] px-2 py-1 text-[10px] text-[#c7cfde]">
                                  {formatMessageTime(message.created_at)}{message.edited_at && !message.removed_at ? " · edited" : ""}
                                </time>
                                {mine && !message.removed_at && <MessageActionsDialog key={`${currentVoiceKey}:${message.id}`} message={message} enabled={Boolean(controlsEnabled)} onEdit={body => changeOwnMessage(message, body)} onRemove={() => changeOwnMessage(message)} />}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid min-h-full place-items-center text-center">
                      <div className="max-w-sm rounded-2xl bg-zinc-950 p-4">
                        <MessageCircle className="mx-auto size-9 text-cyan-300" />
                        <h3 className="mt-4 text-xl font-light text-white">
                          {activeClearedBefore ? "A fresh page for you" : "Say something real"}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-zinc-400">
                          {activeClearedBefore ? "Earlier messages are cleared from your view. New messages will appear here; other members keep their conversation." : "This is the beginning of this conversation. Keep it creative, respectful, and human."}
                        </p>
                      </div>
                    </div>
                  )}
                  {!conversationLoading && newMessageCount > 0 && (
                    <div className="pointer-events-none sticky bottom-0 z-10 mt-3 flex justify-center" role="status" aria-live="polite" aria-atomic="true">
                      <button type="button" onClick={showNewestMessages}
                        className="nodeine-action pointer-events-auto min-h-11 max-w-full rounded-full border border-cyan-300/40 bg-zinc-950 px-4 py-2 text-sm font-medium text-cyan-200 shadow-lg focus-visible:outline-2 focus-visible:outline-cyan-300">
                        {newMessageCount} new {newMessageCount === 1 ? "message" : "messages"} · Jump to latest
                      </button>
                    </div>
                  )}
                </div>

                <form
                  data-chat-part="composer"
                  onSubmit={sendMessage}
                  className="nodeine-chat-composer shrink-0 border-t border-white/10 bg-zinc-950/95 px-3 py-2 backdrop-blur-xl sm:px-6 lg:py-3"
                >
                    <input
                      ref={attachmentInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,video/x-m4v,.mov,.m4v"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) sendAttachment(file);
                        event.target.value = "";
                      }}
                    />
                  <VoiceNoteComposer
                    key={currentVoiceKey}
                    conversationKey={currentVoiceKey ?? "unavailable"}
                    sendEnabled={voiceEnabled}
                    disabledReason={voiceDisabledReason}
                    disabled={sending || uploadingMedia}
                    onActiveChange={onVoiceActiveChange}
                    onSend={sendVoiceNote}
                    attachment={<DropdownMenu key={currentVoiceKey}>
                      <DropdownMenuTrigger
                        disabled={uploadingMedia || sending || voiceSending}
                        render={<button type="button" aria-label="Add attachment" title="Add attachment" className="nodeine-action grid size-[44px] shrink-0 place-items-center rounded-full border border-white/12 text-zinc-300 hover:border-cyan-300/40 hover:text-cyan-200 disabled:cursor-wait disabled:opacity-60" />}
                      >
                        {uploadingMedia ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-5" />}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="top" align="start" sideOffset={10} className="min-w-56 rounded-2xl border border-white/10 bg-zinc-950 p-2 text-zinc-100 shadow-2xl motion-reduce:animate-none! motion-reduce:transition-none!">
                        <DropdownMenuItem className="min-h-11 gap-3 rounded-xl px-3" disabled={uploadingMedia || sending || voiceSending} onClick={() => attachmentInputRef.current?.click()}>
                          <ImagePlus className="size-4 text-cyan-200" /> Photo or video
                        </DropdownMenuItem>
                        <DropdownMenuItem className="min-h-11 gap-3 rounded-xl px-3" disabled={uploadingMedia || sending || voiceSending} onClick={() => setArtworkShareOpen(true)}>
                          <BookmarkPlus className="size-4 text-cyan-200" /> Artwork from your worlds
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>}
                  >
                    <label className="nodeine-chat-composer-input flex min-w-0">
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
                        placeholder={
                          uploadingMedia ? "Uploading media..." : "Message..."
                        }
                        disabled={uploadingMedia}
                        className="max-h-32 min-h-11 w-full resize-none rounded-2xl border border-white/12 bg-white/[.035] px-3 py-2.5 text-base leading-6 text-white outline-none placeholder:text-zinc-500 focus:border-cyan-300 lg:text-sm"
                      />
                    </label>
                    <Button
                      type="submit"
                      size="icon-lg"
                      disabled={sending || uploadingMedia || voiceSending || !draft.trim()}
                      className="size-[44px] shrink-0 justify-self-end rounded-full"
                      aria-label="Send message"
                    >
                      {sending ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <Send />
                      )}
                    </Button>
                  </VoiceNoteComposer>
                  {error && (
                    <p className="mt-2 text-xs text-rose-300" role="alert">
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
                  {activeConversationId && (
                    <button type="button" onClick={closeConversation} className="nodeine-action mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm text-zinc-200 hover:border-cyan-300/50 hover:text-cyan-200">
                      <ArrowLeft className="size-4" /> Back to inbox
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </section>
      )}

      <Dialog open={Boolean(currentVoiceKey && conversationOptionsKey === currentVoiceKey)} onOpenChange={open => {
        if (!open) {setConversationOptionsKey(null); setClearArmed(false);}
      }}>
        <DialogContent className="max-h-[85svh] overflow-y-auto border-white/10 bg-zinc-950 text-zinc-100 sm:max-w-md [&_[data-slot=dialog-close]]:size-11">
          <DialogHeader className="pr-10">
            <DialogTitle>Conversation options</DialogTitle>
            <DialogDescription>Keep your archive and conversation organized.</DialogDescription>
          </DialogHeader>
          {messages.some(message => message.artwork_id) && <Button type="button" variant="outline" className="min-h-11 justify-start" disabled={savingArtworkId === "all"} onClick={() => void saveAllSharedArtwork()}><BookmarkPlus className="size-4" />Save all shared artwork</Button>}
          {activeConversation?.kind === "group" && <Button type="button" variant="outline" className="min-h-11 justify-start" onClick={() => {setConversationOptionsKey(null); setGroupSettingsOpen(true);}}><Settings className="size-4" />Group settings</Button>}
          <div className="space-y-3 border-t border-white/10 pt-4">
            <h3 className="text-sm font-medium">Clear chat for me</h3>
            <p className="text-xs leading-5 text-zinc-400">Clears earlier messages from your view on this account. Other members keep their copies, the group is not deleted, and new messages can still arrive. This does not erase stored files.</p>
            {!controlsEnabled && <p className="text-xs leading-5 text-amber-100" role="status">Editing, removing messages, and clearing chats are built but have not been activated yet.</p>}
            {clearArmed ? <>
              <p className="text-sm text-rose-200">Clear the conversation from your view? There is no restore button.</p>
              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="outline" className="min-h-11" disabled={clearingConversation} onClick={() => setClearArmed(false)}>Cancel</Button>
                <Button type="button" className="min-h-11 bg-rose-200 text-zinc-950 hover:bg-rose-100" disabled={clearingConversation || !controlsEnabled} onClick={() => void clearConversationForMe()}>{clearingConversation ? "Clearing…" : "Confirm clear"}</Button>
              </div>
            </> : <Button type="button" variant="outline" className="min-h-11" disabled={!controlsEnabled} onClick={() => setClearArmed(true)}>Clear chat for me</Button>}
            {clearError && <p role="alert" className="text-xs text-rose-200">{clearError}</p>}
          </div>
          <Button type="button" className="min-h-11" onClick={() => {setConversationOptionsKey(null); setClearArmed(false);}}>Done</Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={newMessageOpen}
        onOpenChange={(open) => {
          setNewMessageOpen(open);
          if (!open) {
            setNewMessageMode("direct");
            setGroupTitle("");
            setGroupSearch("");
            setSelectedMemberIds([]);
          }
        }}
      >
        <DialogContent className="max-h-[88dvh] overflow-y-auto border border-white/10 bg-zinc-950/98 p-0 shadow-2xl shadow-black/70 ring-0 sm:max-w-lg [&_[data-slot=dialog-close]]:size-11">
          <DialogHeader className="border-b border-white/10 px-5 py-5 pr-14 sm:px-6 sm:pr-14">
            <DialogTitle className="text-xl text-white">New message</DialogTitle>
            <DialogDescription className="leading-6 text-zinc-500">
              Message one creator directly or bring three or more people into a
              group.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={createGroup} className="flex flex-col">
            <div className="space-y-4 px-5 py-4 sm:px-6">
              <div className="grid grid-cols-2 rounded-xl border border-white/10 bg-black/40 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setNewMessageMode("direct");
                    setSelectedMemberIds([]);
                  }}
                  aria-pressed={newMessageMode === "direct"}
                  className={`nodeine-action inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm ${
                    newMessageMode === "direct"
                      ? "bg-cyan-300 font-medium text-zinc-950"
                      : "text-zinc-500 hover:text-white"
                  }`}
                >
                  <MessageCircle className="size-4" />
                  Direct message
                </button>
                <button
                  type="button"
                  onClick={() => setNewMessageMode("group")}
                  aria-pressed={newMessageMode === "group"}
                  className={`nodeine-action inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm ${
                    newMessageMode === "group"
                      ? "bg-cyan-300 font-medium text-zinc-950"
                      : "text-zinc-500 hover:text-white"
                  }`}
                >
                  <Users className="size-4" />
                  Group chat
                </button>
              </div>

              {newMessageMode === "group" && (
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
              )}

              <label className="relative block">
                <span className="sr-only">Search people</span>
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
                <Input
                  type="search"
                  value={groupSearch}
                  onChange={(event) => setGroupSearch(event.target.value)}
                  placeholder={
                    newMessageMode === "direct"
                      ? "Search for a creator"
                      : "Search creators"
                  }
                  className="h-11 border-white/12 bg-black/45 pl-10"
                />
              </label>
            </div>

            <div className="border-y border-white/10">
              {groupProfiles.length ? (
                groupProfiles.map((profile) => {
                  const selected = selectedMemberIds.includes(profile.id);
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() =>
                        newMessageMode === "direct"
                          ? startDirectMessage(profile.id)
                          : toggleGroupMember(profile.id)
                      }
                      aria-pressed={
                        newMessageMode === "group" ? selected : undefined
                      }
                      disabled={
                        newMessageMode === "direct" && Boolean(startingDirectId)
                      }
                      className="nodeine-action flex w-full items-center gap-3 border-b border-white/8 px-5 py-3 text-left last:border-b-0 hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300 disabled:cursor-wait disabled:opacity-60 sm:px-6"
                    >
                      <ConversationAvatar profile={profile} className="size-10" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-zinc-100">
                          {profile.display_name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-zinc-600">
                          @{profile.username}
                        </span>
                      </span>
                      {newMessageMode === "direct" ? (
                        startingDirectId === profile.id ? (
                          <LoaderCircle className="size-4 animate-spin text-cyan-300" />
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-cyan-300">
                            <MessageCircle className="size-4" />
                            Message
                          </span>
                        )
                      ) : (
                        <span
                          className={`grid size-6 place-items-center rounded-full border ${
                            selected
                              ? "border-cyan-300 bg-cyan-300 text-zinc-950"
                              : "border-white/15 text-transparent"
                          }`}
                        >
                          <Check className="size-3.5" />
                        </span>
                      )}
                    </button>
                  );
                })
              ) : (
                <p className="px-6 py-10 text-center text-sm text-zinc-600">
                  No matching creators found.
                </p>
              )}
            </div>

            {newMessageMode === "direct" ? (
              <p className="px-5 py-4 text-xs leading-5 text-zinc-600 sm:px-6">
                Direct messages are private between you and the creator you
                choose.
              </p>
            ) : (
              <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-zinc-950 px-5 py-4 sm:px-6">
                <p className="text-xs leading-5 text-zinc-600">
                  {selectedMemberIds.length + 1 === 1
                    ? "1 person total"
                    : `${selectedMemberIds.length + 1} people total`}
                  {selectedMemberIds.length < 2 && (
                    <span className="block text-amber-300/80">
                      Choose at least 2 people
                    </span>
                  )}
                </p>
                <Button
                  type="submit"
                  className="min-h-11"
                  disabled={
                    creatingGroup ||
                    !groupTitle.trim() ||
                    selectedMemberIds.length < 2
                  }
                >
                  {creatingGroup ? (
                    <LoaderCircle
                      data-icon="inline-start"
                      className="animate-spin"
                    />
                  ) : (
                    <Users data-icon="inline-start" />
                  )}
                  Create group
                </Button>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>

      <ArtworkShareDialog
        open={artworkShareOpen}
        onOpenChange={setArtworkShareOpen}
        onShare={shareArtwork}
      />

      {viewerId && (
        <GroupSettingsDialog
          open={groupSettingsOpen}
          onOpenChange={setGroupSettingsOpen}
          conversation={
            activeConversation?.kind === "group" ? activeConversation : null
          }
          viewerId={viewerId}
          profiles={profiles}
          onConversationChanged={() => loadInbox(viewerId)}
          onLeft={handleGroupLeft}
        />
      )}

      <MobileAppNavigation hidden={focusedConversation} />
    </main>
  );
}
