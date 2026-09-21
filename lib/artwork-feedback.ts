import type { SupabaseClient } from "@supabase/supabase-js";

export type FeedbackAnchor = { x: number; y: number; src: string };
export type CommentAttempt = {
  id: string;
  artwork_id: string;
  user_id: string;
  body: string;
  pin_x: number | null;
  pin_y: number | null;
  pin_src: string | null;
};
export type ArtworkComment = CommentAttempt & {
  created_at: string;
  profile: {
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | {
    username: string;
    display_name: string;
    avatar_url: string | null;
  }[] | null;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
const selection = "*, profile:profiles!comments_user_id_fkey(username, display_name, avatar_url)";
const pageSize = 500;

export class UnknownCommentOutcome extends Error {
  readonly outcome = "unknown";
  constructor(message = "We couldn't confirm the change. Retry to check it safely; your draft is still here.") {
    super(message);
    this.name = "UnknownCommentOutcome";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isValidFeedbackAnchor(value: unknown): value is FeedbackAnchor {
  if (!isRecord(value)) return false;
  return typeof value.x === "number" && Number.isFinite(value.x) && value.x >= 0 && value.x <= 1
    && typeof value.y === "number" && Number.isFinite(value.y) && value.y >= 0 && value.y <= 1
    && typeof value.src === "string" && value.src.trim().length > 0 && value.src.length <= 2048;
}

function normalizeComment(value: unknown, artworkId?: string): ArtworkComment {
  if (!isRecord(value) || typeof value.id !== "string" || !uuid.test(value.id)
    || typeof value.artwork_id !== "string" || !uuid.test(value.artwork_id)
    || (artworkId !== undefined && value.artwork_id !== artworkId)
    || typeof value.user_id !== "string" || !uuid.test(value.user_id)
    || typeof value.body !== "string" || !value.body.trim() || [...value.body.trim()].length > 500
    || typeof value.created_at !== "string" || !timestamp.test(value.created_at)
    || !Number.isFinite(Date.parse(value.created_at))) throw new Error("The discussion couldn't be read. Please retry.");
  const pin_x = value.pin_x ?? null;
  const pin_y = value.pin_y ?? null;
  const pin_src = value.pin_src ?? null;
  if (!(pin_x === null && pin_y === null && pin_src === null)
    && !isValidFeedbackAnchor({ x: pin_x, y: pin_y, src: pin_src })) {
    throw new Error("The discussion couldn't be read. Please retry.");
  }
  const normalizeProfile = (profile: unknown) => isRecord(profile)
    && typeof profile.username === "string" && typeof profile.display_name === "string"
    && (profile.avatar_url === null || typeof profile.avatar_url === "string")
    ? { username: profile.username, display_name: profile.display_name, avatar_url: profile.avatar_url as string | null }
    : null;
  return {
    id: value.id, artwork_id: value.artwork_id, user_id: value.user_id, body: value.body,
    created_at: value.created_at, pin_x: pin_x as number | null, pin_y: pin_y as number | null,
    pin_src: pin_src as string | null,
    profile: Array.isArray(value.profile) ? value.profile.flatMap((entry) => normalizeProfile(entry) ?? []) : normalizeProfile(value.profile),
  };
}

/** Keyset pagination avoids skipping a comment when an earlier page is deleted. */
export async function readArtworkComments(client: SupabaseClient, artworkId: string): Promise<ArtworkComment[]> {
  if (!uuid.test(artworkId)) throw new Error("This artwork isn't available for discussion.");
  const result: ArtworkComment[] = [];
  const seen = new Set<string>();
  let cursor: ArtworkComment | undefined;
  while (true) {
    let query = client.from("comments").select(selection).eq("artwork_id", artworkId)
      .order("created_at", { ascending: true }).order("id", { ascending: true }).limit(pageSize);
    if (cursor) query = query.or(`created_at.gt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.gt.${cursor.id})`);
    const { data, error } = await query;
    if (error || !Array.isArray(data)) throw new Error("The discussion couldn't be loaded. Check your connection and retry.");
    const page = data.map((row) => normalizeComment(row, artworkId));
    for (const row of page) {
      if (seen.has(row.id)) throw new Error("The discussion changed while loading. Please retry.");
      seen.add(row.id);
      result.push(row);
    }
    if (page.length < pageSize) return result;
    cursor = page.at(-1);
  }
}

function validateAttempt(attempt: CommentAttempt) {
  if (![attempt.id, attempt.artwork_id, attempt.user_id].every((value) => uuid.test(value))) {
    throw new Error("Sign in and reopen this artwork before posting.");
  }
  if (typeof attempt.body !== "string" || !attempt.body.trim() || [...attempt.body].length > 500) {
    throw new Error("Write a comment between 1 and 500 characters.");
  }
  if (!(attempt.pin_x === null && attempt.pin_y === null && attempt.pin_src === null)
    && !isValidFeedbackAnchor({ x: attempt.pin_x, y: attempt.pin_y, src: attempt.pin_src })) {
    throw new Error("Select a point inside the image before posting feedback.");
  }
}

function matchesAttempt(comment: ArtworkComment, attempt: CommentAttempt) {
  // Postgres JSON can serialize float8 coordinates with fewer significant
  // digits than JavaScript. Permit only sub-pixel serialization noise on the
  // normalized 0–1 range; identity, text and source still match exactly.
  const sameCoordinate = (actual: number | null, expected: number | null) => actual === expected
    || (actual !== null && expected !== null && Math.abs(actual - expected) <= 1e-14);
  return comment.id === attempt.id && comment.artwork_id === attempt.artwork_id
    && comment.user_id === attempt.user_id && comment.body === attempt.body
    && sameCoordinate(comment.pin_x, attempt.pin_x) && sameCoordinate(comment.pin_y, attempt.pin_y)
    && comment.pin_src === attempt.pin_src;
}

/** Retain the same attempt ID for retries; one logical post must have one ID.
 * Once a prior outcome is unknown, a later rejection cannot disprove that first
 * commit (e.g. the image source or account permissions changed in between).
 */
export async function postArtworkComment(
  client: SupabaseClient,
  attempt: CommentAttempt,
  options: { previousOutcomeUnknown?: boolean } = {},
): Promise<ArtworkComment> {
  validateAttempt(attempt);
  let rejected: string | null = null;
  try {
    const { data, error } = await client.from("comments").insert(attempt).select(selection).single();
    if (!error) {
      const comment = normalizeComment(data, attempt.artwork_id);
      if (matchesAttempt(comment, attempt)) return comment;
    } else if (error.code === "42501" || error.code === "PGRST301") {
      rejected = "Your comment wasn't posted. Sign in again and retry.";
    } else if (["23503", "23514", "22023", "P0001"].includes(error.code)) {
      rejected = "Your comment wasn't posted. Reopen the artwork and check your selected point.";
    } else if (["42703", "42P01", "PGRST204", "PGRST205"].includes(error.code)) {
      rejected = "Feedback is temporarily unavailable. Your draft is still here.";
    }
  } catch {
    // A response/transport failure cannot tell us whether the insert committed.
  }
  if (rejected && !options.previousOutcomeUnknown) throw new Error(rejected);
  try {
    const { data, error } = await client.from("comments").select(selection)
      .eq("id", attempt.id).eq("artwork_id", attempt.artwork_id).eq("user_id", attempt.user_id).maybeSingle();
    if (!error && data) {
      const comment = normalizeComment(data, attempt.artwork_id);
      if (matchesAttempt(comment, attempt)) return comment;
    }
  } catch {
    // Keep the attempt frozen for an exact-ID retry, including an empty read:
    // the first request may still be in flight on the server.
  }
  throw new UnknownCommentOutcome();
}

export async function removeArtworkComment(client: SupabaseClient, id: string, userId: string): Promise<void> {
  if (!uuid.test(id) || !uuid.test(userId)) throw new Error("Sign in and reopen the discussion before removing a comment.");
  let confirmedRejection = false;
  try {
    const { data, error } = await client.from("comments").delete().eq("id", id).eq("user_id", userId).select("id");
    if (!error && Array.isArray(data) && data.length === 1 && data[0]?.id === id) return;
    confirmedRejection = !error || ["42501", "PGRST301"].includes(error.code);
  } catch {
    // Reconcile an ambiguous delete without issuing a second mutation.
  }
  let stillExists = false;
  try {
    // Read by ID alone: filtering by user would incorrectly treat someone
    // else's still-existing public comment as successfully removed.
    const { data, error } = await client.from("comments").select("id,user_id").eq("id", id).maybeSingle();
    if (!error && data === null) return;
    if (!error && isRecord(data) && data.id === id) stillExists = true;
  } catch {
    // Keep the visible comment until deletion can be verified.
  }
  if (stillExists && confirmedRejection) throw new Error("This comment wasn't removed. Only its author can remove it; sign in and retry.");
  throw new UnknownCommentOutcome("We couldn't confirm removal. Retry safely; the comment will stay visible until confirmed.");
}

/** Pass the image content rectangle, never the padded/letterboxed viewer. */
export function anchorFromPoint(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): { x: number; y: number } | null {
  if (![clientX, clientY, rect.left, rect.top, rect.width, rect.height].every(Number.isFinite)
    || rect.width <= 0 || rect.height <= 0) return null;
  const x = (clientX - rect.left) / rect.width;
  const y = (clientY - rect.top) / rect.height;
  return x >= 0 && x <= 1 && y >= 0 && y <= 1 ? { x, y } : null;
}
