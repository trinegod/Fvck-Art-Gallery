import type { Profile } from "../app/messages/messages-types";

export type GroupMentionToken = { start: number; end: number; username: string };
export type GroupMentionQuery = { start: number; end: number; query: string };
export type GroupMentionSuggestion = { username: string; displayName: string };
const usernamePattern = /^[a-z0-9][a-z0-9-]{2,29}$/;

function uniqueMembers(members: readonly Profile[]) {
  const byUsername = new Map<string, Profile | null>();
  for (const member of members) {
    const username = member.username.toLowerCase();
    if (!usernamePattern.test(username) || username === "everyone") continue;
    const previous = byUsername.get(username);
    byUsername.set(username, previous === undefined || previous?.id === member.id ? member : null);
  }
  return byUsername;
}

/** Keep this token grammar aligned with the server's original-send resolver. */
export function resolveGroupMentionTokens(body: string, members: readonly Profile[], allowEveryone: boolean): GroupMentionToken[] {
  const byUsername = uniqueMembers(members);
  const tokens: GroupMentionToken[] = [];
  const scanner = /(^|[\s(\[{])@([a-z0-9][a-z0-9-]{2,29})(?![a-z0-9_-])/gi;
  for (const match of body.matchAll(scanner)) {
    const username = match[2].toLowerCase();
    if (username === "everyone" ? !allowEveryone : !byUsername.get(username)) continue;
    const start = match.index + match[1].length;
    tokens.push({ start, end: start + match[2].length + 1, username });
  }
  return tokens;
}

export function findGroupMentionQuery(value: string, caret: number): GroupMentionQuery | null {
  if (!Number.isInteger(caret) || caret < 0 || caret > value.length) return null;
  const before = value.slice(0, caret);
  const match = /(^|[\s(\[{])@([a-z0-9][a-z0-9-]{0,29}|)$/i.exec(before);
  if (!match) return null;
  const suffix = /^[a-z0-9-]*/i.exec(value.slice(caret))![0];
  const end = caret + suffix.length;
  if (/[a-z0-9_-]/i.test(value[end] ?? "") || match[2].length + suffix.length > 30) return null;
  return { start: caret - match[2].length - 1, end, query: match[2].toLowerCase() };
}

export function groupMentionSuggestions(query: string, members: readonly Profile[], allowEveryone: boolean): GroupMentionSuggestion[] {
  const normalized = query.toLowerCase();
  const suggestions: GroupMentionSuggestion[] = [];
  if (allowEveryone && "everyone".startsWith(normalized)) suggestions.push({ username: "everyone", displayName: "Everyone in this group" });
  for (const [username, member] of uniqueMembers(members)) {
    if (member && (username.startsWith(normalized) || member.display_name.toLowerCase().includes(normalized))) {
      suggestions.push({ username, displayName: member.display_name });
    }
    if (suggestions.length >= 6) break;
  }
  return suggestions;
}

export function applyGroupMention(value: string, query: GroupMentionQuery, username: string) {
  if (!usernamePattern.test(username)) return null;
  const suffix = value.slice(query.end);
  const separator = suffix && /^[\s.,!?;:)\]}]/.test(suffix) ? "" : " ";
  const replacement = `@${username}${separator}`;
  const next = value.slice(0, query.start) + replacement + suffix;
  if (next.length > 2000) return null;
  return { value: next, caret: query.start + replacement.length };
}
