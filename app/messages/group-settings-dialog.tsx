"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellOff,
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
import { supabase } from "@/lib/supabase-browser";
import ConversationAvatar from "./conversation-avatar";
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

export default function GroupSettingsDialog({
  open,
  onOpenChange,
  conversation,
  viewerId,
  profiles,
  onConversationChanged,
  onLeft,
}: GroupSettingsDialogProps) {
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [invites, setInvites] = useState<ConversationInviteRow[]>([]);
  const [title, setTitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [inviteSearch, setInviteSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("spam");
  const [reportTarget, setReportTarget] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);

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
  const muted = Boolean(viewerMembership?.muted_until);

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
    setLoading(true);

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

    setLoading(false);

    const queryError = memberResult.error ?? inviteResult.error;
    if (queryError) {
      toast.error("Group settings couldn't be loaded", {
        description: queryError.message,
      });
      return;
    }

    setMemberships((memberResult.data ?? []) as MembershipRow[]);
    setInvites((inviteResult.data ?? []) as ConversationInviteRow[]);
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
      setDeleteArmed(false);
      loadGroupData();
    });

    if (conversation.avatar_path) {
      client.storage
        .from("conversation-media")
        .createSignedUrl(conversation.avatar_path, 3600)
        .then(({ data }) => {
          if (!cancelled) setAvatarUrl(data?.signedUrl ?? null);
        });
    }

    return () => {
      cancelled = true;
    };
    // loadGroupData intentionally keys off the active conversation and dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id, open]);

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    const cleanTitle = title.trim();
    if (!client || !conversation || !cleanTitle || savingDetails) return;

    setSavingDetails(true);
    let uploadedPath: string | null = null;
    let nextAvatarPath = removeAvatar ? null : conversation.avatar_path;

    if (avatarFile) {
      if (!avatarFile.type.startsWith("image/")) {
        toast.error("Choose an image for the group avatar");
        setSavingDetails(false);
        return;
      }
      if (avatarFile.size > 10 * 1024 * 1024) {
        toast.error("Group avatars must be 10 MB or smaller");
        setSavingDetails(false);
        return;
      }

      uploadedPath = `${conversation.id}/avatars/${safeFileName(avatarFile.name)}`;
      const { error: uploadError } = await client.storage
        .from("conversation-media")
        .upload(uploadedPath, avatarFile, {
          contentType: avatarFile.type,
          upsert: false,
        });

      if (uploadError) {
        toast.error("Group avatar wasn't uploaded", {
          description: uploadError.message,
        });
        setSavingDetails(false);
        return;
      }
      nextAvatarPath = uploadedPath;
    }

    const { error } = await client.rpc("update_group_details", {
      target_conversation_id: conversation.id,
      new_title: cleanTitle,
      new_avatar_path: nextAvatarPath,
    });

    if (error) {
      if (uploadedPath) {
        await client.storage.from("conversation-media").remove([uploadedPath]);
      }
      toast.error("Group details weren't saved", { description: error.message });
      setSavingDetails(false);
      return;
    }

    if (
      conversation.avatar_path &&
      conversation.avatar_path !== nextAvatarPath
    ) {
      await client.storage
        .from("conversation-media")
        .remove([conversation.avatar_path]);
    }

    setAvatarFile(null);
    setRemoveAvatar(false);
    await onConversationChanged();
    toast.success("Group details updated");
    setSavingDetails(false);
  }

  async function inviteProfile(profileId: string) {
    const client = supabase;
    if (!client || !conversation || busyKey) return;
    setBusyKey(`invite-${profileId}`);
    const { error } = await client.rpc("invite_to_group", {
      target_conversation_id: conversation.id,
      target_profile_id: profileId,
    });
    setBusyKey(null);

    if (error) {
      toast.error("Invitation wasn't sent", { description: error.message });
      return;
    }

    setInviteSearch("");
    await loadGroupData();
    toast.success("Invitation sent");
  }

  async function cancelInvite(inviteId: string) {
    const client = supabase;
    if (!client || busyKey) return;
    setBusyKey(`cancel-${inviteId}`);
    const { error } = await client.rpc("cancel_group_invite", {
      target_invite_id: inviteId,
    });
    setBusyKey(null);

    if (error) {
      toast.error("Invitation wasn't cancelled", { description: error.message });
      return;
    }

    await loadGroupData();
  }

  async function changeRole(profileId: string, role: "admin" | "member") {
    const client = supabase;
    if (!client || !conversation || busyKey) return;
    setBusyKey(`role-${profileId}`);
    const { error } = await client.rpc("set_group_member_role", {
      target_conversation_id: conversation.id,
      target_profile_id: profileId,
      new_role: role,
    });
    setBusyKey(null);

    if (error) {
      toast.error("Member role wasn't changed", { description: error.message });
      return;
    }

    await loadGroupData();
    await onConversationChanged();
    toast.success(role === "admin" ? "Admin added" : "Member role restored");
  }

  async function removeMember(profileId: string) {
    const client = supabase;
    const profile = profileById.get(profileId);
    if (!client || !conversation || busyKey) return;
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
    setBusyKey(null);

    if (error) {
      toast.error("Member wasn't removed", { description: error.message });
      return;
    }

    await loadGroupData();
    await onConversationChanged();
    toast.success("Member removed");
  }

  async function toggleMute() {
    const client = supabase;
    if (!client || !conversation || busyKey) return;
    setBusyKey("mute");
    const { error } = await client.rpc("set_conversation_mute", {
      target_conversation_id: conversation.id,
      new_muted_until: muted ? null : "2999-12-31T23:59:59.000Z",
    });
    setBusyKey(null);

    if (error) {
      toast.error("Mute setting wasn't changed", { description: error.message });
      return;
    }

    await loadGroupData();
    await onConversationChanged();
    toast.success(muted ? "Notifications unmuted" : "Group notifications muted");
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    if (!client || !conversation || reporting) return;
    setReporting(true);
    const { error } = await client.rpc("report_conversation", {
      target_conversation_id: conversation.id,
      target_profile_id: reportTarget || null,
      target_message_id: null,
      report_reason: reportReason,
      report_details: reportDetails,
    });
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
    setBusyKey(null);

    if (error) {
      toast.error("You couldn't leave this group", { description: error.message });
      return;
    }

    onOpenChange(false);
    onLeft();
    toast.success("You left the group");
  }

  async function deleteGroup() {
    const client = supabase;
    if (!client || !conversation || viewerRole !== "owner" || busyKey) return;
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }

    setBusyKey("delete");
    const mediaPaths: string[] = [];
    for (const folder of ["attachments", "avatars"]) {
      const { data, error: listError } = await client.storage
        .from("conversation-media")
        .list(`${conversation.id}/${folder}`, { limit: 1000 });
      if (listError) {
        toast.error("Group media couldn't be prepared for deletion", {
          description: listError.message,
        });
        setBusyKey(null);
        return;
      }
      for (const item of data ?? []) {
        mediaPaths.push(`${conversation.id}/${folder}/${item.name}`);
      }
    }

    if (mediaPaths.length) {
      const { error: mediaError } = await client.storage
        .from("conversation-media")
        .remove(mediaPaths);
      if (mediaError) {
        toast.error("Group media couldn't be deleted", {
          description: mediaError.message,
        });
        setBusyKey(null);
        return;
      }
    }

    const { error } = await client.rpc("delete_group", {
      target_conversation_id: conversation.id,
    });
    setBusyKey(null);

    if (error) {
      toast.error("Group wasn't deleted", { description: error.message });
      return;
    }

    onOpenChange(false);
    onLeft();
    toast.success("Group deleted");
  }

  if (!conversation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto border border-white/10 bg-zinc-950/98 p-0 shadow-2xl shadow-black/70 ring-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-white/10 px-5 py-5 sm:px-6">
          <DialogTitle className="text-xl text-white">Group settings</DialogTitle>
          <DialogDescription className="leading-6 text-zinc-500">
            Manage the group, its members, invitations, notifications, and
            safety controls.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="grid min-h-80 place-items-center">
            <LoaderCircle className="size-7 animate-spin text-cyan-300" />
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            <section className="px-5 py-5 sm:px-6">
              <div className="flex items-center gap-4">
                <ConversationAvatar
                  group
                  groupAvatarUrl={removeAvatar ? null : avatarUrl}
                  className="size-16"
                />
                <div>
                  <p className="text-sm font-medium text-white">
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
                      <label className="nodeine-action inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-white/12 px-3 text-xs text-zinc-300 hover:border-cyan-300/40 hover:text-cyan-200">
                        <Camera className="size-4" />
                        Choose image
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="sr-only"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            setAvatarFile(file);
                            if (file) {
                              setRemoveAvatar(false);
                              setAvatarUrl(URL.createObjectURL(file));
                            }
                            event.target.value = "";
                          }}
                        />
                      </label>
                      {(conversation.avatar_path || avatarFile) && (
                        <button
                          type="button"
                          onClick={() => {
                            setAvatarFile(null);
                            setAvatarUrl(null);
                            setRemoveAvatar(true);
                          }}
                          className="nodeine-action inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/12 px-3 text-xs text-zinc-400 hover:border-rose-300/40 hover:text-rose-200"
                        >
                          <X className="size-4" />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={savingDetails || !title.trim()}
                  >
                    {savingDetails && (
                      <LoaderCircle
                        data-icon="inline-start"
                        className="animate-spin"
                      />
                    )}
                    Save group details
                  </Button>
                </form>
              )}
            </section>

            <section className="px-5 py-5 sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-white">Members</h3>
                  <p className="mt-1 text-xs text-zinc-600">
                    {memberships.length} active · {invites.length} pending
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
                      className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/25 p-3"
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
                            className="nodeine-action inline-flex min-h-9 items-center rounded-lg border border-white/10 px-2.5 text-[11px] text-zinc-400 hover:border-cyan-300/40 hover:text-cyan-200"
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
                          className="nodeine-action grid size-9 place-items-center rounded-lg text-zinc-600 hover:bg-rose-300/10 hover:text-rose-300"
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
                    </article>
                  );
                })}
              </div>

              {canManage && invites.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-600">
                    Pending invitations
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
                            <p className="mt-0.5 text-xs text-zinc-700">Pending</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => cancelInvite(invite.id)}
                            disabled={Boolean(busyKey)}
                            className="nodeine-action grid size-9 place-items-center rounded-lg text-zinc-600 hover:bg-white/5 hover:text-white"
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
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  disabled={Boolean(busyKey)}
                  className="nodeine-action inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/12 px-3 text-xs text-zinc-300 hover:border-cyan-300/40 hover:text-cyan-200"
                >
                  {busyKey === "mute" ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : muted ? (
                    <Bell className="size-4" />
                  ) : (
                    <BellOff className="size-4" />
                  )}
                  {muted ? "Unmute notifications" : "Mute notifications"}
                </button>
                <button
                  type="button"
                  onClick={leaveGroup}
                  disabled={Boolean(busyKey)}
                  className="nodeine-action inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/12 px-3 text-xs text-zinc-400 hover:border-rose-300/40 hover:text-rose-200"
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
                      onClick={deleteGroup}
                      disabled={Boolean(busyKey)}
                      className="nodeine-action inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-300/20 px-3 text-xs text-rose-300 hover:border-rose-300/50 hover:bg-rose-300/8"
                    >
                      {busyKey === "delete" ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                      {deleteArmed ? "Confirm delete group" : "Delete group"}
                    </button>
                    {deleteArmed && !busyKey && (
                      <button
                        type="button"
                        onClick={() => setDeleteArmed(false)}
                        className="nodeine-action inline-flex min-h-10 items-center rounded-lg px-3 text-xs text-zinc-500 hover:bg-white/5 hover:text-white"
                      >
                        Cancel
                      </button>
                    )}
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
                  value={reportDetails}
                  onChange={(event) => setReportDetails(event.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder="Optional details for the moderation team"
                  className="w-full resize-none rounded-lg border border-white/12 bg-black/45 px-3 py-2.5 text-sm leading-6 text-white outline-none placeholder:text-zinc-700 focus:border-cyan-300"
                />
                <Button type="submit" variant="outline" disabled={reporting}>
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
