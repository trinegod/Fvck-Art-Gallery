"use client";

import { FormEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Crown,
  Flag,
  LoaderCircle,
  LogOut,
  Search,
  ShieldCheck,
  Trash2,
  User,
  UserMinus,
  UserPlus,
  X,
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
import AvatarCropEditor from "@/components/avatar-crop-editor";
import GroupDescriptionSection from "./group-description-section";
import { supabase } from "@/lib/supabase-browser";
import { createAccountScope } from "@/lib/activity-session";
import ConversationAvatar from "./conversation-avatar";
import ConversationMuteControl from "./conversation-mute-control";
import { groupMembershipNeedsRefresh } from "@/lib/group-membership-status";
import type {
  ConversationInviteRow,
  ConversationRole,
  InboxConversation,
  MembershipRow,
  Profile,
} from "./messages-types";

type GroupSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: InboxConversation | null;
  viewerId: string;
  profiles: Profile[];
  onConversationChanged: () => Promise<void>;
  onLeft: () => void;
};

const reportReasons = [
  ["spam", "Spam or scam"],
  ["harassment", "Harassment"],
  ["copyright", "Copyright or ownership"],
  ["unsafe", "Unsafe content"],
  ["other", "Something else"],
] as const;

function safeFileName(name: string) {
  const extension = name.split(".").pop()?.toLowerCase() || "jpg";
  return `${crypto.randomUUID()}.${extension.replace(/[^a-z0-9]/g, "") || "jpg"}`;
}

function roleLabel(role: ConversationRole) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  return "Member";
}

function RoleIcon({ role }: { role: ConversationRole }) {
  if (role === "owner") return <Crown className="size-3.5 text-amber-300" />;
  if (role === "admin") {
    return <ShieldCheck className="size-3.5 text-cyan-300" />;
  }
  return <User className="size-3.5 text-zinc-600" />;
}

export default function GroupSettingsDialog(props: GroupSettingsDialogProps) {
  if (!props.conversation) return null;
  // A different account/group or reopened dialog must never inherit private
  // member lists, permissions, drafts, or pending controls from the old session.
  return <GroupSettingsSession key={`${props.viewerId}:${props.conversation.id}:${props.open}`} {...props} />;
}

function GroupSettingsSession({
  open,
  onOpenChange,
  conversation,
  viewerId,
  profiles,
  onConversationChanged,
  onLeft,
}: GroupSettingsDialogProps) {
  const requestScope = useRef(createAccountScope());
  useLayoutEffect(() => {
    const scope = requestScope.current;
    scope.setAccount(open ? viewerId : null);
    return () => { scope.clear(); };
  }, [open, viewerId]);

  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const membershipsRef = useRef(memberships);
  useLayoutEffect(() => { membershipsRef.current = memberships; }, [memberships]);
  const [invites, setInvites] = useState<ConversationInviteRow[]>([]);
  const [title, setTitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [cropSource, setCropSource] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const saveLock = useRef(false);
  const preparedUpload = useRef<{ file: File; path: string } | null>(null);
  const confirmedAvatarPath = useRef(conversation?.avatar_path ?? null);
  useLayoutEffect(() => { confirmedAvatarPath.current = conversation?.avatar_path ?? null; }, [conversation?.avatar_path]);
  const avatarInput = useRef<HTMLInputElement>(null);
  const cropRegion = useRef<HTMLDivElement>(null);
  useEffect(() => () => { if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl); }, [avatarPreviewUrl]);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [inviteSearch, setInviteSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("spam");
  const [reportTarget, setReportTarget] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);

  const profileById = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles]
  );

  const viewerMembership = memberships.find(
    (membership) => membership.profile_id === viewerId
  );
  const viewerRole = viewerMembership?.role ?? "member";
  const canManage = viewerRole === "owner" || viewerRole === "admin";
  const canChangeRoles = viewerRole === "owner";

  const pendingProfileIds = useMemo(
    () => new Set(invites.map((invite) => invite.invited_profile_id)),
    [invites]
  );
  const memberProfileIds = useMemo(
    () => new Set(memberships.map((membership) => membership.profile_id)),
    [memberships]
  );

  const inviteCandidates = useMemo(() => {
    const query = inviteSearch.trim().toLowerCase();
    return profiles
      .filter(
        (profile) =>
          profile.id !== viewerId &&
          !memberProfileIds.has(profile.id) &&
          !pendingProfileIds.has(profile.id)
      )
      .filter((profile) =>
        query
          ? `${profile.display_name} ${profile.username}`
              .toLowerCase()
              .includes(query)
          : true
      )
      .slice(0, 12);
  }, [inviteSearch, memberProfileIds, pendingProfileIds, profiles, viewerId]);

  async function loadGroupData() {
    const client = supabase;
    if (!client || !conversation) return;
    const isCurrent = requestScope.current.latest("group-data", viewerId);
    if (!isCurrent()) return;
    // Focus/realtime refreshes must not unmount a crop editor or reset its
    // local positioning. Only the first authorized load needs a full spinner.
    setLoading(!membershipsRef.current.some(member => member.profile_id === viewerId));
    setLoadError(null);

    try {
      const [memberResult, inviteResult] = await Promise.all([
        client
          .from("conversation_members")
          .select(
            "conversation_id, profile_id, role, joined_at, last_read_at, muted_until"
          )
          .eq("conversation_id", conversation.id)
          .order("joined_at"),
        client
          .from("conversation_invites")
          .select(
            "id, conversation_id, invited_profile_id, invited_by, status, created_at, responded_at"
          )
          .eq("conversation_id", conversation.id)
          .eq("status", "pending")
          .order("created_at"),
      ]);
      if (!isCurrent()) return;

      setLoading(false);

      if (memberResult.error) {
        if (memberResult.error.code === "42501") {
          membershipsRef.current = [];
          setMemberships([]);
          setInvites([]);
        }
        setLoadError(memberResult.error.message);
        toast.error("Group settings couldn't be loaded", {
          description: memberResult.error.message,
        });
        return;
      }

      const currentMembers = (memberResult.data ?? []) as MembershipRow[];
      const currentViewer = currentMembers.find(member => member.profile_id === viewerId);
      if (!currentViewer) {
        membershipsRef.current = [];
        setMemberships([]);
        setInvites([]);
        setLoadError("Your group membership could not be found. You may no longer have access.");
        return;
      }
      // Apply authoritative membership/role changes even when the separate
      // invitation request fails. Never retain manager-only lists on demotion.
      membershipsRef.current = currentMembers;
      setMemberships(currentMembers);
      const managesInvites = currentViewer.role === "owner" || currentViewer.role === "admin";
      if (!managesInvites || inviteResult.error?.code === "42501") setInvites([]);
      if (inviteResult.error) {
        setLoadError(inviteResult.error.message);
        return;
      }
      setInvites(managesInvites ? (inviteResult.data ?? []) as ConversationInviteRow[] : []);
    } catch {
      if (!isCurrent()) return;
      setLoading(false);
      setLoadError("Check your connection and try again.");
    }
  }

  useEffect(() => {
    const client = supabase;
    if (!open || !conversation || !client) return;
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      setTitle(conversation.title ?? "");
      setAvatarFile(null);
      setRemoveAvatar(false);
      setAvatarUrl(conversation.avatarUrl);
      setInviteSearch("");
      setReportReason("spam");
      setReportTarget("");
      setReportDetails("");
      loadGroupData();
    });

    if (conversation.avatar_path) {
      const requestedAvatarPath = conversation.avatar_path;
      client.storage
        .from("conversation-media")
        .createSignedUrl(requestedAvatarPath, 3600)
        .then(({ data }) => {
          if (!cancelled && confirmedAvatarPath.current === requestedAvatarPath) setAvatarUrl(data?.signedUrl ?? null);
        }).catch(() => { /* Retain the already loaded avatar if preview refresh fails. */ });
    }

    return () => {
      cancelled = true;
    };
    // loadGroupData intentionally keys off the active conversation and dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id, open]);

  useEffect(() => {
    const client = supabase;
    if (!client || !open || !conversation) return;
    const refresh = () => { void loadGroupData(); };
    const channel = client.channel(`nodeine-group-details-${viewerId}-${conversation.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_members", filter: `conversation_id=eq.${conversation.id}` }, event => {
        if (groupMembershipNeedsRefresh(membershipsRef.current, event)) refresh();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_invites", filter: `conversation_id=eq.${conversation.id}` }, refresh)
      .subscribe(status => { if (status === "SUBSCRIBED") refresh(); });
    window.addEventListener("focus", refresh);
    return () => { window.removeEventListener("focus", refresh); void client.removeChannel(channel); };
    // The request scope cancels old responses; same-group renders do not need a new channel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id, open, viewerId]);

  function restoreAvatarFocus() {
    const isCurrent = requestScope.current.capture(viewerId);
    if (!cropRegion.current?.contains(document.activeElement)) return;
    queueMicrotask(() => { if (isCurrent()) avatarInput.current?.focus({ preventScroll: true }); });
  }

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    const cleanTitle = title.trim();
    if (!client || !conversation || !cleanTitle || !canManage || savingDetails || saveLock.current || cropSource) return;
    const isCurrent = requestScope.current.capture(viewerId);
    if (!isCurrent()) return;

    saveLock.current = true;
    setSavingDetails(true);
    setDetailsError(null);
    try {
      let nextAvatarPath = removeAvatar ? null : confirmedAvatarPath.current;

      if (avatarFile) {
        if (avatarFile.type !== "image/jpeg" || avatarFile.size === 0 || avatarFile.size > 2 * 1024 * 1024) throw new Error("Choose and confirm a cropped avatar up to 2 MiB before saving.");

        const uploadedPath = preparedUpload.current?.file === avatarFile
          ? preparedUpload.current.path
          : `${conversation.id}/avatars/${safeFileName(avatarFile.name)}`;
        if (preparedUpload.current?.file !== avatarFile) {
          const { error: uploadError } = await client.storage
            .from("conversation-media")
            .upload(uploadedPath, avatarFile, {
              contentType: avatarFile.type,
              upsert: false,
            });
          if (!isCurrent()) return;

          if (uploadError) throw new Error(`Group avatar wasn't uploaded. ${uploadError.message}`);
          preparedUpload.current = { file: avatarFile, path: uploadedPath };
        }
        nextAvatarPath = uploadedPath;
      }

      const { error } = await client.rpc("update_group_details", {
        target_conversation_id: conversation.id,
        new_title: cleanTitle,
        new_avatar_path: nextAvatarPath,
      });
      if (!isCurrent()) return;

      if (error) {
        // A transport error can follow a committed save. Keep both image versions
        // rather than deleting an object that may now be the group's active avatar.
        throw new Error(`Group details weren't confirmed. Your draft is kept. ${error.message}`);
      }

      // The RPC is authoritative even if the parent inbox/image refresh fails.
      // A later title-only save must not restore an older prop's avatar path.
      confirmedAvatarPath.current = nextAvatarPath;
      setAvatarFile(null);
      setRemoveAvatar(false);
      preparedUpload.current = null;
      // A failed display refresh is not a failed save. Keep the confirmed local
      // preview until a new signed image can be displayed, without re-uploading.
      try {
        await onConversationChanged();
        if (!isCurrent()) return;
        if (nextAvatarPath) {
          const result = await client.storage.from("conversation-media").createSignedUrl(nextAvatarPath, 3600);
          if (!isCurrent() || confirmedAvatarPath.current !== nextAvatarPath) return;
          if (result.error || !result.data?.signedUrl) throw new Error("Image refresh unavailable");
          setAvatarUrl(result.data.signedUrl);
          setAvatarPreviewUrl(null);
        } else {
          setAvatarUrl(null);
          setAvatarPreviewUrl(null);
        }
      } catch {
        if (!isCurrent()) return;
        setDetailsError("Group details saved, but the display could not refresh. Reopen Group details to see the latest image.");
      }
      if (!isCurrent()) return;
      toast.success("Group details updated");
    } catch (failure) {
      if (!isCurrent()) return;
      setDetailsError(failure instanceof Error ? failure.message : "Group details could not be confirmed. Your draft is kept; check your connection and try again.");
    } finally {
      if (isCurrent()) { saveLock.current = false; setSavingDetails(false); }
    }
  }

  async function inviteProfile(profileId: string) {
    const client = supabase;
    if (!client || !conversation || busyKey) return;
    const isCurrent = requestScope.current.capture(viewerId);
    if (!isCurrent()) return;
    setBusyKey(`invite-${profileId}`);
    const { error } = await client.rpc("invite_to_group", {
      target_conversation_id: conversation.id,
      target_profile_id: profileId,
    });
    if (!isCurrent()) return;
    setBusyKey(null);

    if (error) {
      toast.error("Invitation wasn't sent", { description: error.message });
      return;
    }

    setInviteSearch("");
    await loadGroupData();
    if (!isCurrent()) return;
    await onConversationChanged();
    if (!isCurrent()) return;
    toast.success("Invitation sent");
  }

  async function cancelInvite(inviteId: string) {
    const client = supabase;
    if (!client || busyKey) return;
    const isCurrent = requestScope.current.capture(viewerId);
    if (!isCurrent()) return;
    setBusyKey(`cancel-${inviteId}`);
    const { error } = await client.rpc("cancel_group_invite", {
      target_invite_id: inviteId,
    });
    if (!isCurrent()) return;
    setBusyKey(null);

    if (error) {
      toast.error("Invitation wasn't cancelled", { description: error.message });
      return;
    }

    await loadGroupData();
    if (!isCurrent()) return;
    await onConversationChanged();
  }

  async function changeRole(profileId: string, role: "admin" | "member") {
    const client = supabase;
    if (!client || !conversation || busyKey) return;
    const isCurrent = requestScope.current.capture(viewerId);
    if (!isCurrent()) return;
    setBusyKey(`role-${profileId}`);
    const { error } = await client.rpc("set_group_member_role", {
      target_conversation_id: conversation.id,
      target_profile_id: profileId,
      new_role: role,
    });
    if (!isCurrent()) return;
    setBusyKey(null);

    if (error) {
      toast.error("Member role wasn't changed", { description: error.message });
      return;
    }

    await loadGroupData();
    if (!isCurrent()) return;
    await onConversationChanged();
    if (!isCurrent()) return;
    toast.success(role === "admin" ? "Admin added" : "Member role restored");
  }

  async function removeMember(profileId: string) {
    const client = supabase;
    const profile = profileById.get(profileId);
    if (!client || !conversation || busyKey) return;
    const isCurrent = requestScope.current.capture(viewerId);
    if (!isCurrent()) return;
    if (
      !window.confirm(
        `Remove ${profile?.display_name ?? "this member"} from the group?`
      )
    ) {
      return;
    }

    setBusyKey(`remove-${profileId}`);
    const { error } = await client.rpc("remove_group_member", {
      target_conversation_id: conversation.id,
      target_profile_id: profileId,
    });
    if (!isCurrent()) return;
    setBusyKey(null);

    if (error) {
      toast.error("Member wasn't removed", { description: error.message });
      return;
    }

    await loadGroupData();
    if (!isCurrent()) return;
    await onConversationChanged();
    if (!isCurrent()) return;
    toast.success("Member removed");
  }

  function muteChanged(mutedUntil: string | null) {
    const isCurrent = requestScope.current.capture(viewerId);
    if (!isCurrent()) return;
    setMemberships(current => current.map(member => member.profile_id === viewerId
      ? { ...member, muted_until: mutedUntil } : member));
    void onConversationChanged().catch(() => {
      if (isCurrent()) toast.error("Notifications saved, but the inbox couldn't refresh", {
        description: "Reopen the inbox to refresh its settings.",
      });
    });
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    if (!client || !conversation || reporting) return;
    const isCurrent = requestScope.current.capture(viewerId);
    if (!isCurrent()) return;
    setReporting(true);
    const { error } = await client.rpc("report_conversation", {
      target_conversation_id: conversation.id,
      target_profile_id: reportTarget || null,
      target_message_id: null,
      report_reason: reportReason,
      report_details: reportDetails,
    });
    if (!isCurrent()) return;
    setReporting(false);

    if (error) {
      toast.error("Report wasn't submitted", { description: error.message });
      return;
    }

    setReportTarget("");
    setReportDetails("");
    toast.success("Report submitted for review");
  }

  async function leaveGroup() {
    const client = supabase;
    if (!client || !conversation || busyKey) return;
    const isCurrent = requestScope.current.capture(viewerId);
    if (!isCurrent()) return;
    const ownerNote =
      viewerRole === "owner"
        ? " Ownership will transfer to the longest-standing admin or member."
        : "";
    if (!window.confirm(`Leave ${conversation.title ?? "this group"}?${ownerNote}`)) {
      return;
    }

    setBusyKey("leave");
    const { error } = await client.rpc("leave_group", {
      target_conversation_id: conversation.id,
    });
    if (!isCurrent()) return;
    setBusyKey(null);

    if (error) {
      toast.error("You couldn't leave this group", { description: error.message });
      return;
    }

    onOpenChange(false);
    onLeft();
    toast.success("You left the group");
  }

  if (!conversation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto border border-white/10 bg-zinc-950/98 p-0 shadow-2xl shadow-black/70 ring-0 sm:max-w-2xl [&_[data-slot=dialog-close]]:size-11 [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-cyan-300 motion-reduce:animate-none! motion-reduce:transition-none!">
        <DialogHeader className="border-b border-white/10 px-5 py-5 pr-16 sm:px-6 sm:pr-16">
          <DialogTitle className="text-xl text-white">Group details</DialogTitle>
          <DialogDescription className="leading-6 text-zinc-500">
            Manage the group, its members, invitations, notifications, and
            safety controls.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="grid min-h-48 place-items-center" role="status" aria-live="polite">
            <LoaderCircle className="size-7 animate-spin text-cyan-300 motion-reduce:animate-none" aria-hidden="true" />
            <span className="sr-only">Loading group settings…</span>
          </div>
        ) : loadError && !memberships.some(member => member.profile_id === viewerId) ? (
          <div className="space-y-4 px-5 py-6 sm:px-6">
            <p role="alert" className="text-sm leading-6 text-amber-100">Group settings couldn&apos;t be loaded. {loadError}</p>
            <Button type="button" className="min-h-11" onClick={() => void loadGroupData()}>Try again</Button>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {loadError && <div className="space-y-3 px-5 py-4 sm:px-6">
              <p role="alert" className="text-sm leading-6 text-amber-100">Group settings couldn&apos;t refresh. Previously loaded details may be out of date. {loadError}</p>
              <Button type="button" className="min-h-11" onClick={() => void loadGroupData()}>Try again</Button>
            </div>}
            <section className="px-5 py-5 sm:px-6">
              <div className="flex items-center gap-4">
                <ConversationAvatar
                  group
                  groupAvatarUrl={removeAvatar ? null : avatarPreviewUrl ?? avatarUrl}
                  className="size-16"
                />
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-white [overflow-wrap:anywhere]">
                    {conversation.title}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-600">
                    <RoleIcon role={viewerRole} />
                    You are the {roleLabel(viewerRole).toLowerCase()}
                  </p>
                </div>
              </div>

              {canManage && (
                <form onSubmit={saveDetails} className="mt-5 space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-zinc-500">
                      Group name
                    </span>
                    <Input
                      value={title}
                      disabled={savingDetails}
                      onChange={(event) => setTitle(event.target.value)}
                      maxLength={80}
                      className="h-11 border-white/12 bg-black/45"
                    />
                  </label>

                  <div>
                    <span className="mb-2 block text-xs uppercase tracking-[0.16em] text-zinc-500">
                      Group avatar
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <label className="nodeine-action inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-white/12 px-3 text-xs text-zinc-300 hover:border-cyan-300/40 hover:text-cyan-200 focus-within:outline-2 focus-within:outline-cyan-300">
                        <Camera className="size-4" />
                        Choose image
                        <input
                          ref={avatarInput}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          aria-label="Choose group avatar image"
                          disabled={savingDetails}
                          className="sr-only"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            if (file) setCropSource(file);
                            event.target.value = "";
                          }}
                        />
                      </label>
                      {(conversation.avatar_path || avatarFile) && (
                        <button
                          type="button"
                          disabled={savingDetails || Boolean(cropSource)}
                          onClick={() => {
                            setAvatarFile(null);
                            setAvatarPreviewUrl(null);
                            setAvatarUrl(null);
                            setRemoveAvatar(true);
                          }}
                          className="nodeine-action inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/12 px-3 text-xs text-zinc-400 hover:border-rose-300/40 hover:text-rose-200"
                        >
                          <X className="size-4" />
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-zinc-400">Choose a still JPEG, PNG or WebP up to 8 MiB, then position it inside the circle. Nothing uploads until Save group details.</p>
                    {cropSource && <div ref={cropRegion} className="mt-4"><AvatarCropEditor file={cropSource} onCancel={() => { restoreAvatarFocus(); setCropSource(null); }} onConfirm={file => {
                      if (!requestScope.current.capture(viewerId)() || !canManage) return;
                      const preview = URL.createObjectURL(file);
                      restoreAvatarFocus();
                      setAvatarFile(file); setAvatarPreviewUrl(preview); setRemoveAvatar(false); setCropSource(null); setDetailsError(null);
                    }} /></div>}
                    {avatarFile && !cropSource && <p role="status" className="mt-2 text-xs text-cyan-200">Avatar preview ready. Save group details to apply it for everyone.</p>}
                  </div>

                  <Button
                    type="submit"
                    className="h-auto min-h-11 max-w-full whitespace-normal py-2"
                    disabled={savingDetails || Boolean(cropSource) || !title.trim()}
                  >
                    {savingDetails && (
                      <LoaderCircle
                        data-icon="inline-start"
                        className="animate-spin"
                      />
                    )}
                    Save group details
                  </Button>
                  {detailsError && <p role="alert" className="text-sm leading-5 text-amber-100">{detailsError}</p>}
                </form>
              )}
            </section>

            <GroupDescriptionSection key={`${viewerId}:${conversation.id}:${canManage}`} conversationId={conversation.id} viewerId={viewerId} canManage={canManage} />

            <section className="px-5 py-5 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-white">Members</h3>
                  <p className="mt-1 text-xs text-zinc-600">
                    {memberships.length} {memberships.length === 1 ? "member" : "members"}
                    {canManage ? ` · ${invites.length} invited` : " · Invitations are managed by the owner and admins"}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {memberships.map((membership) => {
                  const profile = profileById.get(membership.profile_id);
                  const isViewer = membership.profile_id === viewerId;
                  const canRemove =
                    canManage &&
                    !isViewer &&
                    membership.role !== "owner" &&
                    (viewerRole === "owner" || membership.role === "member");
                  return (
                    <article
                      key={membership.profile_id}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-black/25 p-3"
                    >
                      <ConversationAvatar profile={profile} className="size-10" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-zinc-100">
                          {profile?.display_name ?? "NODEINE creator"}
                          {isViewer ? " · You" : ""}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-600">
                          <RoleIcon role={membership.role} />
                          {roleLabel(membership.role)}
                        </p>
                      </div>

                      {(canRemove || (canChangeRoles && !isViewer && membership.role !== "owner")) && (
                        <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
                          {canChangeRoles &&
                            !isViewer &&
                            membership.role !== "owner" && (
                              <button
                                type="button"
                                onClick={() =>
                                  changeRole(
                                    membership.profile_id,
                                    membership.role === "admin" ? "member" : "admin"
                                  )
                                }
                                disabled={Boolean(busyKey)}
                                className="nodeine-action inline-flex min-h-11 items-center rounded-lg border border-white/10 px-3 text-xs text-zinc-300 hover:border-cyan-300/40 hover:text-cyan-200"
                              >
                                {membership.role === "admin"
                                  ? "Make member"
                                  : "Make admin"}
                              </button>
                            )}

                          {canRemove && (
                            <button
                              type="button"
                              onClick={() => removeMember(membership.profile_id)}
                              disabled={Boolean(busyKey)}
                              className="nodeine-action grid size-11 shrink-0 place-items-center rounded-lg text-zinc-400 hover:bg-rose-300/10 hover:text-rose-300"
                              aria-label={`Remove ${profile?.display_name ?? "member"}`}
                              title="Remove member"
                            >
                              {busyKey === `remove-${membership.profile_id}` ? (
                                <LoaderCircle className="size-4 animate-spin" />
                              ) : (
                                <UserMinus className="size-4" />
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>

              {canManage && invites.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                    Invited · waiting to join
                  </p>
                  <div className="mt-2 space-y-2">
                    {invites.map((invite) => {
                      const profile = profileById.get(invite.invited_profile_id);
                      return (
                        <article
                          key={invite.id}
                          className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 p-3"
                        >
                          <ConversationAvatar profile={profile} className="size-9" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-zinc-300">
                              {profile?.display_name ?? "Invited creator"}
                            </p>
                            <p className="mt-0.5 text-xs text-zinc-400">Invitation sent · not yet a member</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => cancelInvite(invite.id)}
                            disabled={Boolean(busyKey)}
                            className="nodeine-action grid size-11 shrink-0 place-items-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white"
                            aria-label="Cancel invitation"
                            title="Cancel invitation"
                          >
                            {busyKey === `cancel-${invite.id}` ? (
                              <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                              <X className="size-4" />
                            )}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}

              {canManage && (
                <div className="mt-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                    Invite creators
                  </p>
                  <label className="relative mt-2 block">
                    <span className="sr-only">Search creators to invite</span>
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
                    <Input
                      type="search"
                      value={inviteSearch}
                      onChange={(event) => setInviteSearch(event.target.value)}
                      placeholder="Search creators"
                      className="h-11 border-white/12 bg-black/45 pl-10"
                    />
                  </label>
                  {inviteSearch.trim() && (
                    <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-black/30">
                      {inviteCandidates.length ? (
                        inviteCandidates.map((profile) => (
                          <button
                            key={profile.id}
                            type="button"
                            onClick={() => inviteProfile(profile.id)}
                            disabled={Boolean(busyKey)}
                            className="nodeine-action flex w-full items-center gap-3 border-b border-white/8 p-3 text-left last:border-0 hover:bg-white/[0.04]"
                          >
                            <ConversationAvatar profile={profile} className="size-9" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm text-zinc-200">
                                {profile.display_name}
                              </span>
                              <span className="block truncate text-xs text-zinc-600">
                                @{profile.username}
                              </span>
                            </span>
                            {busyKey === `invite-${profile.id}` ? (
                              <LoaderCircle className="size-4 animate-spin text-cyan-300" />
                            ) : (
                              <UserPlus className="size-4 text-cyan-300" />
                            )}
                          </button>
                        ))
                      ) : (
                        <p className="p-5 text-center text-xs text-zinc-600">
                          No available creators found.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="px-5 py-5 sm:px-6">
              <h3 className="text-sm font-medium text-white">Your controls</h3>
              <div className="mt-3">
                <ConversationMuteControl
                  viewerId={viewerId}
                  conversationId={conversation.id}
                  mutedUntil={viewerMembership?.muted_until ?? null}
                  onMuteChanged={muteChanged}
                  disabled={Boolean(busyKey) || !viewerMembership}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={leaveGroup}
                  disabled={Boolean(busyKey)}
                  className="nodeine-action inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/12 px-3 text-xs text-zinc-400 hover:border-rose-300/40 hover:text-rose-200"
                >
                  {busyKey === "leave" ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <LogOut className="size-4" />
                  )}
                  Leave group
                </button>
                {viewerRole === "owner" && (
                  <>
                    <button
                      type="button"
                      disabled
                      aria-describedby="group-delete-gate"
                      className="nodeine-action inline-flex min-h-11 items-center gap-2 rounded-lg border border-rose-300/20 px-3 text-xs text-rose-300 opacity-50"
                    >
                      <Trash2 className="size-4" />
                      Delete group
                    </button>
                    <p id="group-delete-gate" className="w-full text-xs leading-5 text-amber-100">Whole-group deletion is paused while private-file cleanup is upgraded. You can leave after another member joins; clearing your own view is a separate conversation option.</p>
                  </>
                )}
              </div>
            </section>

            <section className="px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <Flag className="mt-0.5 size-4 text-rose-300" />
                <div>
                  <h3 className="text-sm font-medium text-white">Report</h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-600">
                    Reports are private and create a moderation record for review.
                  </p>
                </div>
              </div>

              <form onSubmit={submitReport} className="mt-4 space-y-3">
                <select
                  aria-label="Report target"
                  value={reportTarget}
                  onChange={(event) => setReportTarget(event.target.value)}
                  className="h-11 w-full rounded-lg border border-white/12 bg-black/45 px-3 text-sm text-zinc-300 outline-none focus:border-cyan-300"
                >
                  <option value="">Report the group</option>
                  {memberships
                    .filter((membership) => membership.profile_id !== viewerId)
                    .map((membership) => {
                      const profile = profileById.get(membership.profile_id);
                      return (
                        <option
                          key={membership.profile_id}
                          value={membership.profile_id}
                        >
                          Report {profile?.display_name ?? "member"}
                        </option>
                      );
                    })}
                </select>
                <select
                  aria-label="Report reason"
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value)}
                  className="h-11 w-full rounded-lg border border-white/12 bg-black/45 px-3 text-sm text-zinc-300 outline-none focus:border-cyan-300"
                >
                  {reportReasons.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <textarea
                  aria-label="Report details (optional)"
                  value={reportDetails}
                  onChange={(event) => setReportDetails(event.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder="Optional details for the moderation team"
                  className="w-full resize-none rounded-lg border border-white/12 bg-black/45 px-3 py-2.5 text-sm leading-6 text-white outline-none placeholder:text-zinc-700 focus:border-cyan-300"
                />
                <Button type="submit" variant="outline" className="h-auto min-h-11 max-w-full whitespace-normal py-2" disabled={reporting}>
                  {reporting ? (
                    <LoaderCircle
                      data-icon="inline-start"
                      className="animate-spin"
                    />
                  ) : (
                    <Flag data-icon="inline-start" />
                  )}
                  Submit report
                </Button>
              </form>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
