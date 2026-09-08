import { resolveGroupMentionTokens } from "@/lib/group-mentions";
import type { Profile } from "./messages-types";

/** Plain React text only; matching mentions never turn arbitrary body text into HTML. */
export default function GroupMentionText({ body, members, allowEveryone }: { body: string; members: readonly Profile[]; allowEveryone: boolean }) {
  const tokens = resolveGroupMentionTokens(body, members, allowEveryone);
  const parts = [];
  let cursor = 0;
  for (const token of tokens) {
    parts.push(body.slice(cursor, token.start));
    parts.push(<strong key={token.start} className="rounded bg-current/10 font-semibold underline decoration-current/40 underline-offset-2">{body.slice(token.start, token.end)}</strong>);
    cursor = token.end;
  }
  parts.push(body.slice(cursor));
  return <>{parts}</>;
}
