"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase-browser";
import { createAccountScope, observeAccount } from "@/lib/activity-session";
import { readArtworkComments, postArtworkComment, removeArtworkComment, UnknownCommentOutcome, type ArtworkComment, type FeedbackAnchor, type CommentAttempt } from "@/lib/artwork-feedback";
import ArtworkFeedbackDialog from "./artwork-feedback-dialog";
import styles from "./artwork-feedback.module.css";

export type FeedbackArtwork = { src: string; title: string; mediaType?: string | null };
type Props = { artworkId: string; artwork?: FeedbackArtwork };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function commentAuthor(comment: ArtworkComment) {
  const profile = Array.isArray(comment.profile) ? comment.profile[0] : comment.profile;
  return { name: profile?.display_name || "NODEINE creator", username: profile?.username };
}
export default function ArtworkComments(props: Props) { return <Discussion key={props.artworkId} {...props} />; }

function Discussion({ artworkId, artwork }: Props) {
  const [comments, setComments] = useState<ArtworkComment[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [accountVersion, setAccountVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [scope] = useState(createAccountScope);
  const [status, setStatus] = useState("");
  const valid = Boolean(supabase) && uuidPattern.test(artworkId);
  const image = artwork && artwork.mediaType !== "video" ? artwork : undefined;
  const pinned = comments.filter(comment => comment.pin_x != null && comment.pin_y != null);
  useEffect(() => {
    const account = scope;
    if (!supabase) return;
    const stop = observeAccount(supabase.auth, id => {
      if (account.account() !== id) { account.setAccount(id); setViewerId(id); setAccountVersion(value => value + 1); setConfirmDelete(null); setDeleting(null); setStatus(""); }
    });
    return () => { stop(); account.clear(); };
  }, [scope]);
  useEffect(() => {
    if (!supabase || !valid) return;
    let active = true;
    void readArtworkComments(supabase, artworkId).then(rows => {
      if (active) { setComments(rows); setLoading(false); setError(null); }
    }).catch(() => {
      if (active) { setLoading(false); setError("The discussion couldn’t load. Your artwork is still available. Please retry."); }
    });
    return () => { active = false; };
  }, [artworkId, retry, valid]);
  function addComment(comment: ArtworkComment) {
    setComments(current => [...current.filter(row => row.id !== comment.id), comment]); setSelected(comment.id); setStatus(comment.pin_x != null ? "Feedback posted." : "Comment posted.");
  }
  async function deleteComment(id: string) {
    if (!supabase || !viewerId || deleting) return;
    const isCurrent = scope.capture(viewerId);
    setDeleting(id);
    try {
      await removeArtworkComment(supabase, id, viewerId);
      if (isCurrent()) { setComments(rows => rows.filter(row => row.id !== id)); setConfirmDelete(null); setStatus("Comment removed."); }
    } catch { if (isCurrent()) setError("Removal couldn’t be confirmed. Retry to check the same comment safely."); }
    finally { if (isCurrent()) setDeleting(null); }
  }
  function openFeedback(id: string | null = null) { setSelected(id); setOpen(true); }
  function reload() { setLoading(true); setError(null); setRetry(value => value + 1); }
  return <section id={`discussion-${artworkId}`} className={`${styles.discussion} mt-7 border-t border-white/10 pt-6`}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h4 className="text-xs uppercase tracking-[0.2em] text-zinc-400">Discussion</h4><span className="text-xs text-zinc-400">{loading && valid ? "Loading…" : error ? "Unavailable" : `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`}</span></div>
    {image && valid && <button type="button" onClick={() => openFeedback()} className="mt-4 flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-cyan-200/20 bg-cyan-200/5 px-4 py-3 text-left text-sm text-cyan-100 hover:bg-cyan-200/10"><span className="flex items-center gap-2"><MapPin size={16} aria-hidden="true" />Feedback on the image</span><span className="text-xs text-zinc-300">{loading || error ? "Open" : `${pinned.length} ${pinned.length === 1 ? "pin" : "pins"}`}</span></button>}
    <CommentComposer key={`${viewerId ?? "guest"}:${accountVersion}`} artworkId={artworkId} viewerId={viewerId} enabled={valid && !loading && !error} isAccountCurrent={scope.capture(viewerId)} onPosted={addComment} />
    <p role="status" className="mt-2 text-xs text-cyan-100">{status}</p>
    {error && <div className="mt-3 text-sm text-rose-200" role="alert"><p>{error}</p><button className="nodeine-action underline" onClick={reload}>Retry discussion</button></div>}
    <div className="mt-5 space-y-5">
      {loading && valid ? <p className="text-sm text-zinc-400" role="status">Loading comments…</p> : comments.map(comment => {
        const author = commentAuthor(comment); const pinNumber = pinned.findIndex(pin => pin.id === comment.id) + 1;
        return <article key={comment.id} className="min-w-0 border-b border-white/8 pb-4">
          <div className="flex flex-wrap items-baseline gap-2">{author.username ? <Link href={`/creator/${author.username}`} className="text-sm text-zinc-100 hover:text-cyan-200">{author.name}</Link> : <span className="text-sm text-zinc-100">{author.name}</span>}<time dateTime={comment.created_at} className="text-xs text-zinc-400">{new Date(comment.created_at).toLocaleDateString("en", { month: "short", day: "numeric" })}</time></div>
          {pinNumber > 0 && (image ? <button className="nodeine-action mt-1 gap-2 text-xs text-cyan-200" onClick={() => openFeedback(comment.id)}><MapPin size={14} aria-hidden="true" />View pin {pinNumber}</button> : <Link className="nodeine-action text-xs text-cyan-200" href={`/artwork/${artworkId}#discussion-${artworkId}`}>View image feedback</Link>)}
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">{comment.body}</p>
          {viewerId === comment.user_id && <div className="mt-1">{confirmDelete === comment.id ? <div className="flex flex-wrap items-center gap-2 text-xs"><span>Remove your comment for everyone?</span><button className="nodeine-action text-rose-200" disabled={Boolean(deleting)} onClick={() => void deleteComment(comment.id)}>{deleting === comment.id ? "Removing…" : "Remove comment"}</button><button className="nodeine-action text-zinc-300" disabled={Boolean(deleting)} onClick={() => setConfirmDelete(null)}>Cancel</button></div> : <button className="nodeine-action text-xs text-zinc-400 hover:text-rose-200" onClick={() => setConfirmDelete(comment.id)}>Delete</button>}</div>}
        </article>;
      })}
      {!loading && !error && comments.length === 0 && <p className="text-sm leading-6 text-zinc-400">No comments yet. Start the discussion.</p>}
    </div>
    {image && <ArtworkFeedbackDialog key={`${artworkId}:${viewerId ?? "guest"}:${accountVersion}`} open={open} onOpenChange={setOpen} artworkId={artworkId} artwork={image} comments={pinned} selectedId={selected} onSelect={setSelected} viewerId={viewerId} loading={loading} error={error} onRetry={reload} isAccountCurrent={scope.capture(viewerId)} onPosted={addComment} />}
  </section>;
}

type ComposerProps = {
  artworkId: string; viewerId: string | null; enabled?: boolean; anchor?: FeedbackAnchor | null;
  onPosted: (comment: ArtworkComment) => void; onComplete?: () => void; isAccountCurrent?: () => boolean;
};
export function CommentComposer(props: ComposerProps) { return useCommentComposer(props).form; }

// State belongs above the dialog portal so closing/reopening preserves both a
// draft and an uncertain logical attempt. It never enters browser storage.
export function useCommentComposer({ artworkId, viewerId, enabled = true, anchor, onPosted, onComplete, isAccountCurrent = () => true }: ComposerProps) {
  const [draft, setDraft] = useState(""); const [pending, setPending] = useState(false); const [error, setError] = useState<string | null>(null); const [uncertain, setUncertain] = useState(false);
  const attempt = useRef<CommentAttempt | null>(null); const alive = useRef(true); const posting = useRef(false);
  const id = `comment-${artworkId}-${anchor === undefined ? "general" : "pin"}`;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !viewerId || !draft.trim() || (!enabled && !uncertain) || posting.current || !isAccountCurrent() || (anchor !== undefined && !anchor && !uncertain)) return;
    const original = attempt.current ?? { id: crypto.randomUUID(), artwork_id: artworkId, user_id: viewerId, body: draft.trim(), pin_x: anchor?.x ?? null, pin_y: anchor?.y ?? null, pin_src: anchor?.src ?? null };
    attempt.current = original; posting.current = true; setPending(true); setError(null);
    try {
      const comment = await postArtworkComment(supabase, original, { previousOutcomeUnknown: uncertain });
      if (!alive.current || !isAccountCurrent()) return;
      onPosted(comment); setDraft(""); attempt.current = null; setUncertain(false); onComplete?.();
    } catch (cause) {
      if (!alive.current || !isAccountCurrent()) return;
      // A rejection of a retry does not disprove an earlier unknown delivery.
      const unknown = uncertain || cause instanceof UnknownCommentOutcome;
      setUncertain(unknown); if (!unknown) attempt.current = null;
      setError(unknown ? "We couldn’t confirm delivery. Retry checks this same comment without creating a duplicate." : "Your comment wasn’t posted. Your text is safe here—please retry.");
    } finally { posting.current = false; if (alive.current && isAccountCurrent()) setPending(false); }
  }
  const form = !viewerId ? <p className="mt-4 text-sm leading-6 text-zinc-400"><Link className="nodeine-action text-cyan-200" href="/admin">Sign in</Link> to leave a comment. Feedback is public.</p> : <form onSubmit={submit} className="mt-4">
    <label htmlFor={id} className="mb-2 block text-sm text-zinc-300">{anchor === undefined ? "Add a comment" : "Feedback at this point"}</label>
    <textarea id={id} value={draft} onChange={event => setDraft(event.target.value)} maxLength={500} rows={3} disabled={pending || uncertain} placeholder={anchor === undefined ? "Add to the discussion…" : "What do you notice here?"} className="w-full resize-y rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-base leading-6 text-white outline-none placeholder:text-zinc-500 focus:border-cyan-200 disabled:opacity-70" />
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-zinc-400">Public · {draft.length}/500</span><button type="submit" disabled={pending || !draft.trim() || (!enabled && !uncertain) || (anchor !== undefined && !anchor && !uncertain)} className="nodeine-action rounded-lg bg-cyan-200 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-40">{pending ? "Posting…" : uncertain ? "Retry same comment" : anchor === undefined ? "Post" : "Post feedback"}</button></div>
    {error && <p role="alert" className="mt-3 text-sm leading-6 text-rose-200">{error}</p>}
  </form>;
  return { form, locked: pending || uncertain, hasDraft: Boolean(draft), discard: () => { if (!pending && !uncertain) { setDraft(""); setError(null); attempt.current = null; } } };
}
