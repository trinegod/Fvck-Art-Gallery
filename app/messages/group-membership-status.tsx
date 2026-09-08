"use client";

import { groupMembershipSummary, type GroupInvitationStatus } from "@/lib/group-membership-status";

export default function GroupMembershipStatus({ title, memberCount, invitations, onOpen }: {
  title: string;
  memberCount: number;
  invitations?: GroupInvitationStatus;
  onOpen: () => void;
}) {
  const summary = groupMembershipSummary(memberCount, invitations);
  return <h2 className="min-w-0"><button type="button" onClick={onOpen}
    aria-label={`${title}. Members and invitations: ${summary}. Open group details`}
    className="nodeine-action flex min-h-11 w-full min-w-0 flex-col justify-center rounded-md text-left focus-visible:outline-2 focus-visible:outline-cyan-300">
    <span className="w-full truncate text-sm font-medium text-white">{title}</span>
    <span className="mt-0.5 w-full break-words text-xs text-zinc-400">{summary}</span>
  </button></h2>;
}
