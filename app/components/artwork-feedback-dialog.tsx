"use client";

import { useRef, useState } from "react";
import { MapPin, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { anchorFromPoint, type ArtworkComment, type FeedbackAnchor } from "@/lib/artwork-feedback";
import { useCommentComposer, commentAuthor, type FeedbackArtwork } from "./artwork-comments";
import styles from "./artwork-feedback.module.css";

type Props = {
  open: boolean; onOpenChange: (open: boolean) => void; artworkId: string; artwork: FeedbackArtwork;
  comments: ArtworkComment[]; selectedId: string | null; onSelect: (id: string | null) => void;
  viewerId: string | null; loading: boolean; error: string | null; onRetry: () => void;
  onPosted: (comment: ArtworkComment) => void; isAccountCurrent: () => boolean;
};

export default function ArtworkFeedbackDialog(props: Props) {
  const { artwork, comments, viewerId } = props;
  const [placing, setPlacing] = useState(false);
  const [anchor, setAnchor] = useState<FeedbackAnchor | null>(null);
  const [imageState, setImageState] = useState<"loading" | "ready" | "error">("loading");
  const [imageRetry, setImageRetry] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);
  const [status, setStatus] = useState("");
  const composer = useCommentComposer({ artworkId: props.artworkId, viewerId, anchor, enabled: imageState === "ready" && !props.loading && !props.error, isAccountCurrent: props.isAccountCurrent, onPosted: props.onPosted, onComplete: () => { setAnchor(null); setPlacing(false); setStatus("Feedback posted. Select its numbered pin to review it."); } });
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const selected = comments.find(comment => comment.id === props.selectedId);
  const pinForSource = (comment: ArtworkComment) => comment.pin_src === artwork.src && comment.pin_x != null && comment.pin_y != null;
  function beginPin() { props.onSelect(null); setPlacing(true); setAnchor(null); imageRef.current?.scrollIntoView({ block: "center", behavior: "instant" }); }
  function selectPin(id: string) {
    props.onSelect(id);
    const note = document.getElementById(`feedback-note-${id}`);
    note?.scrollIntoView({ block: "nearest", behavior: "instant" }); note?.focus({ preventScroll: true });
  }
  return <Dialog open={props.open} onOpenChange={props.onOpenChange}>
    <DialogContent showCloseButton={false} className={styles.dialog} onKeyDown={event => {
      // Legacy gallery viewers listen on document: editing/position keys belong
      // to this dialog, and one Escape must close only this view.
      event.stopPropagation();
      if (event.key === "Escape") { event.preventDefault(); props.onOpenChange(false); }
    }}>
      <header className={styles.header}>
        <div className="min-w-0"><DialogTitle className="flex items-center gap-2 text-base text-zinc-100"><MapPin size={18} aria-hidden="true" />Image feedback</DialogTitle><DialogDescription className="mt-1 truncate text-xs text-zinc-400">{artwork.title}</DialogDescription></div>
        <DialogClose className="nodeine-action shrink-0 rounded-full border border-white/15 text-zinc-200" aria-label="Close feedback"><X size={20} aria-hidden="true" /></DialogClose>
      </header>
      <div className={styles.body}>
        <section className={styles.canvas} aria-label="Artwork with feedback pins">
          <p id={`pin-help-${props.artworkId}`} className="mb-3 text-center text-xs leading-5 text-zinc-400">{placing ? "Tap a detail to place your pin. Or use the position controls below." : "Select a numbered pin to read its feedback. The original artwork stays unchanged."}</p>
          <div className={styles.imageWrap}>
            {/* Native dimensions keep pins tied to the actual image, not letterboxing. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={imageRetry} ref={imageRef} src={artwork.src} alt={artwork.title} className={styles.image} onLoad={() => setImageState("ready")} onError={() => setImageState("error")} />
            {imageState === "ready" && <div className={styles.overlay}>
              {placing && <button type="button" disabled={composer.locked} className={styles.placeTarget} aria-label="Place feedback pin on image" aria-describedby={`pin-help-${props.artworkId}`} onClick={event => {
                const bounds = imageRef.current?.getBoundingClientRect(); if (!bounds) return;
                const point = event.detail === 0 ? { x: 0.5, y: 0.5 } : anchorFromPoint(event.clientX, event.clientY, bounds);
                if (point) setAnchor({ ...point, src: artwork.src });
              }} />}
              {comments.map((comment, index) => pinForSource(comment) && <button key={comment.id} type="button" className={styles.pin} aria-label={`Read feedback pin ${index + 1}`} aria-pressed={props.selectedId === comment.id} style={{ left: `${comment.pin_x! * 100}%`, top: `${comment.pin_y! * 100}%` }} onClick={() => selectPin(comment.id)}><span>{index + 1}</span></button>)}
              {placing && anchor && <span className={styles.draftPin} style={{ left: `${anchor.x * 100}%`, top: `${anchor.y * 100}%` }} aria-label="New feedback pin"><Plus size={18} aria-hidden="true" /></span>}
            </div>}
          </div>
          {imageState === "loading" && <p role="status" className="mt-3 text-center text-sm text-zinc-400">Loading artwork…</p>}
          {imageState === "error" && <div role="alert" className="mt-3 text-center text-sm text-rose-200">The image couldn’t load. Your notes are still readable.<button className="nodeine-action mx-auto block underline" onClick={() => { setImageState("loading"); setImageRetry(value => value + 1); }}>Retry image</button></div>}
          {selected && pinForSource(selected) && <p className="mt-3 text-center text-xs text-cyan-100">Viewing pin {comments.indexOf(selected) + 1} · {commentAuthor(selected).name}</p>}
        </section>
        <aside className={styles.notes} aria-label="Feedback notes">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-medium text-zinc-100">{props.loading ? "Loading feedback…" : props.error ? "Feedback unavailable" : `${comments.length} ${comments.length === 1 ? "note" : "notes"}`}</h3>{viewerId && !placing && <button className="nodeine-action gap-2 rounded-lg border border-cyan-200/25 px-3 text-sm text-cyan-100" disabled={imageState !== "ready" || props.loading || Boolean(props.error)} onClick={beginPin}><Plus size={16} aria-hidden="true" />Add a pin</button>}</div>
          {props.error && <div className="mt-3 text-sm text-rose-200" role="alert"><p>{props.error}</p><button className="nodeine-action underline" onClick={props.onRetry}>Retry feedback</button></div>}
          {placing && <div className="mt-4 rounded-xl border border-cyan-200/20 bg-cyan-200/5 p-3">
            <p className="text-sm text-zinc-200">{anchor ? "Pin selected. Fine-tune its position if needed." : "Choose a point on the image, or start at the center."}</p>
            {!anchor && <button className="nodeine-action mt-2 text-sm text-cyan-100" disabled={imageState !== "ready"} onClick={() => setAnchor({ x: 0.5, y: 0.5, src: artwork.src })}>Use center point</button>}
            {anchor && <details className="mt-2 text-sm text-zinc-300"><summary className="min-h-11 cursor-pointer py-3">Adjust pin position</summary>{(["x", "y"] as const).map(axis => <label key={axis} className="mt-2 block">{axis === "x" ? "Horizontal" : "Vertical"} · {Math.round(anchor[axis] * 100)}%<input type="range" disabled={composer.locked} min="0" max="100" step="1" value={Math.round(anchor[axis] * 100)} onChange={event => setAnchor({ ...anchor, [axis]: Number(event.target.value) / 100 })} className="block h-11 w-full accent-cyan-200" /></label>)}</details>}
            {composer.form}
            {confirmDiscard ? <div className="mt-2 flex flex-wrap items-center gap-2 text-xs"><span>Discard this unfinished note?</span><button className="nodeine-action text-rose-200" onClick={() => { composer.discard(); setPlacing(false); setAnchor(null); setConfirmDiscard(false); }}>Discard note</button><button className="nodeine-action text-zinc-200" onClick={() => setConfirmDiscard(false)}>Keep writing</button></div> : <button className="nodeine-action mt-2 text-xs text-zinc-400" disabled={composer.locked} onClick={() => { if (composer.hasDraft) setConfirmDiscard(true); else { setPlacing(false); setAnchor(null); } }}>Cancel new pin</button>}
          </div>}
          {!viewerId && composer.form}
          <p role="status" className="mt-3 text-xs text-cyan-100">{status}</p>
          <div className="mt-4 space-y-3">{comments.map((comment, index) => <article tabIndex={-1} key={comment.id} id={`feedback-note-${comment.id}`} className={`${styles.note} ${props.selectedId === comment.id ? styles.selectedNote : ""}`}>
            <button className="nodeine-action w-full gap-2 text-left text-sm text-zinc-100" onClick={() => { props.onSelect(comment.id); imageRef.current?.scrollIntoView({ block: "center", behavior: "instant" }); }} aria-pressed={props.selectedId === comment.id}><span className={styles.number}>{index + 1}</span><span>{commentAuthor(comment).name}</span></button>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">{comment.body}</p>
            {!pinForSource(comment) && <p className="mt-2 text-xs text-amber-200">This note refers to an earlier image version; its pin is hidden.</p>}
          </article>)}</div>
          {!props.loading && !props.error && comments.length === 0 && <p className="mt-4 text-sm leading-6 text-zinc-400">No pinpoint feedback yet. Notice a detail? Leave the first note.</p>}
          <p className="mt-5 text-xs leading-5 text-zinc-400">Public discussion · Pins appear only in this view. Manage your own comments in Discussion.</p>
        </aside>
      </div>
    </DialogContent>
  </Dialog>;
}
