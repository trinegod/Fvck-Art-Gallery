import type { SupabaseClient } from "@supabase/supabase-js";
import type { MembershipRow, PendingGroupInvite, Profile } from "../app/messages/messages-types";

export type GroupInvitationStatus =
  | { state: "loading" }
  | { state: "ready"; count: number }
  | { state: "error"; message: string };

/** Call only for a current owner/admin; an RLS-filtered empty list is not a count. */
export async function fetchGroupInvitationStatus(database: SupabaseClient, conversationId: string): Promise<GroupInvitationStatus> {
  try {
    const { count, error } = await database.from("conversation_invites")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId).eq("status", "pending");
    if (error || count === null || !Number.isSafeInteger(count) || count < 0) {
      return { state: "error", message: "Invitations could not be checked. Try again." };
    }
    return { state: "ready", count };
  } catch {
    return { state: "error", message: "Invitations could not be checked. Try again." };
  }
}

export function groupMembershipSummary(memberCount: number, invitations?: GroupInvitationStatus) {
  const members = `${memberCount} ${memberCount === 1 ? "member" : "members"}`;
  if (!invitations) return members;
  if (invitations.state === "loading") return `${members} · Checking invitations…`;
  if (invitations.state === "error") return `${members} · Invitations unavailable — retry`;
  return `${members} · ${invitations.count} invited`;
}

export function filterGroupInvitations(invites: readonly PendingGroupInvite[], search: string, profiles: ReadonlyMap<string, Pick<Profile, "display_name" | "username">>) {
  const query = search.trim().toLowerCase();
  if (!query) return invites;
  return invites.filter(invite => {
    const inviter = profiles.get(invite.invited_by);
    return `${invite.conversation_title} ${inviter?.display_name ?? ""} ${inviter?.username ?? ""}`.toLowerCase().includes(query);
  });
}

export function groupMembershipNeedsRefresh(members: readonly MembershipRow[], event: { eventType: string; new: Record<string, unknown> }) {
  if (event.eventType !== "UPDATE") return true;
  const previous = members.find(member => member.profile_id === event.new.profile_id);
  return !previous || previous.role !== event.new.role || previous.muted_until !== event.new.muted_until;
}
