"use client";

import { LoaderCircle } from "lucide-react";
import { filterGroupInvitations } from "@/lib/group-membership-status";
import ConversationAvatar from "./conversation-avatar";
import type { PendingGroupInvite, Profile } from "./messages-types";

export default function GroupInvitations({ invites, search, profiles, busyId, onRespond }: {
  invites: readonly PendingGroupInvite[];
  search: string;
  profiles: ReadonlyMap<string, Profile>;
  busyId: string | null;
  onRespond: (inviteId: string, accept: boolean) => void;
}) {
  const visible = filterGroupInvitations(invites, search, profiles);
  if (!visible.length) return null;
  return <section aria-label="Group invitations" className="border-b border-cyan-300/15 bg-cyan-300/[0.035] px-5 py-4 sm:px-7">
    <h2 className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">Group invitations ({visible.length})</h2>
    <div className="mt-3 space-y-3">
      {visible.map(invite => <article key={invite.invite_id} className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="flex items-center gap-3">
          <ConversationAvatar group className="size-10" />
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-sm font-medium text-white">{invite.conversation_title}</h3>
            <p className="mt-0.5 break-words text-xs text-zinc-400">Invited by {profiles.get(invite.invited_by)?.display_name ?? "a creator"}</p>
          </div>
        </div>
        <p className="mt-2 text-xs leading-5 text-zinc-400">Join to become a member and read this group&apos;s existing messages. An invitation alone does not add you.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => onRespond(invite.invite_id, false)} disabled={Boolean(busyId)}
            className="nodeine-action inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-white/10 px-3 text-xs text-zinc-300 hover:border-white/25 hover:text-white disabled:opacity-60">Decline</button>
          <button type="button" onClick={() => onRespond(invite.invite_id, true)} disabled={Boolean(busyId)}
            className="nodeine-action inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-cyan-300 px-3 text-xs font-medium text-zinc-950 hover:bg-cyan-200 disabled:opacity-60">Join group</button>
        </div>
        {busyId === invite.invite_id && <p role="status" className="mt-2 flex items-center gap-2 text-xs text-cyan-200"><LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Saving your response…</p>}
      </article>)}
    </div>
  </section>;
}
