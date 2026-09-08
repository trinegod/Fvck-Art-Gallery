"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useSyncExternalStore, type PointerEvent } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { avatarCropRect, createAvatarCropSession, DEFAULT_AVATAR_CROP, moveAvatarCrop, type AvatarCrop } from "@/lib/avatar-crop";

type AvatarCropEditorProps = { file:File; onConfirm:(file:File) => void; onCancel:() => void };
type Session = ReturnType<typeof createAvatarCropSession>;
const control = "h-auto min-h-[44px] min-w-0 whitespace-normal px-4 py-2";

/** Embeds inside the parent's existing form/dialog. Confirmation prepares a local
 * file only; the parent owns its preview URL, permissions, upload and Save action. */
export default function AvatarCropEditor({ file, onConfirm, onCancel }: AvatarCropEditorProps) {
  const session = useMemo(() => createAvatarCropSession(file), [file]);
  useLayoutEffect(() => {
    void session.start();
    return () => session.dispose();
  }, [session]);
  return <AvatarCropEditorPanel session={session} onConfirm={onConfirm} onCancel={onCancel} />;
}

/** Shared presentation uses the same session seam as the file-owning wrapper. */
export function AvatarCropEditorPanel({ session, onConfirm, onCancel }: { session:Session; onConfirm:(file:File) => void; onCancel:() => void }) {
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  const id = useId();
  const canvas = useRef<HTMLCanvasElement>(null);
  const region = useRef<HTMLElement>(null);
  const horizontal = useRef<HTMLInputElement>(null);
  const lastSession = useRef<Session | null>(null);
  const drag = useRef<{ pointer:number; x:number; y:number; edge:number; crop:AvatarCrop } | null>(null);
  const ready = state.phase === "ready";
  const cropRect = state.size ? avatarCropRect(state.size.width, state.size.height, state.crop) : null;

  useLayoutEffect(() => {
    drag.current = null;
    const preview = canvas.current;
    if (preview) { preview.width = 512; preview.height = 512; }
    region.current?.focus({ preventScroll:true });
    return () => { if (preview) { preview.width = 0; preview.height = 0; } };
  }, [session]);
  useEffect(() => {
    if (state.size && canvas.current) session.draw(canvas.current);
  }, [session, state.size, state.crop]);
  useEffect(() => {
    if (ready && lastSession.current !== session) {
      if (region.current?.contains(document.activeElement)) horizontal.current?.focus({ preventScroll:true });
      lastSession.current = session;
    }
  }, [ready, session]);

  const finishDrag = (event: PointerEvent<HTMLCanvasElement>, cancelled = false) => {
    const gesture = drag.current;
    if (!gesture || gesture.pointer !== event.pointerId) return;
    drag.current = null;
    if (cancelled) session.setCrop(gesture.crop);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const cancel = () => { session.dispose(); onCancel(); };
  return (
    <section ref={region} tabIndex={-1} aria-labelledby={`${id}-title`} aria-describedby={`${id}-help`} className="min-w-0 space-y-4 rounded-xl border border-cyan-300/20 bg-zinc-950 p-4 outline-none" data-avatar-crop-editor>
      <div className="space-y-2">
        <h3 id={`${id}-title`} className="text-base font-medium text-zinc-100">Adjust avatar</h3>
        <p id={`${id}-help`} className="text-sm leading-6 text-zinc-400">Drag the photo or use the position and zoom controls. Use avatar prepares this image; Save applies it.</p>
      </div>
      <div className="mx-auto aspect-square w-full max-w-[240px] overflow-hidden rounded-full border border-white/20 bg-zinc-900">
        <canvas ref={canvas} width={512} height={512} role="img" aria-label="Circular avatar crop preview" className="block aspect-square w-full touch-none select-none cursor-grab active:cursor-grabbing" onPointerDown={event => {
          if (!ready || !state.size || !event.isPrimary || event.button !== 0) return;
          const edge = event.currentTarget.getBoundingClientRect().width;
          if (edge <= 0) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { pointer:event.pointerId, x:event.clientX, y:event.clientY, edge, crop:state.crop };
        }} onPointerMove={event => {
          const gesture = drag.current;
          if (!gesture || event.pointerId !== gesture.pointer || !state.size) return;
          session.setCrop(moveAvatarCrop(state.size.width, state.size.height, gesture.crop, event.clientX - gesture.x, event.clientY - gesture.y, gesture.edge));
        }} onPointerUp={event => finishDrag(event)} onPointerCancel={event => finishDrag(event, true)} onLostPointerCapture={event => finishDrag(event)} />
      </div>
      <p role="status" className="text-sm leading-6 text-zinc-400">{state.phase === "loading" ? "Opening image…" : state.phase === "encoding" ? "Preparing avatar…" : state.phase === "confirmed" ? "Avatar prepared." : "Square image, circular preview. JPEG, PNG or WebP; up to 8 MiB and 24 megapixels."}</p>
      <div className="space-y-2">
        {([{ key:"x", label:"Horizontal position", max:100, step:1, value:state.crop.x }, { key:"y", label:"Vertical position", max:100, step:1, value:state.crop.y }, { key:"zoom", label:"Zoom", max:3, step:0.01, value:state.crop.zoom }] as const).map(item => (
          <div key={item.key} className="min-w-0">
            <Label htmlFor={`${id}-${item.key}`} className="flex flex-wrap justify-between gap-x-3 leading-6 text-zinc-200">{item.label}<span className="text-zinc-400 tabular-nums">{item.key === "zoom" ? `${Math.round(item.value * 100)}%` : `${Math.round(item.value)}%`}</span></Label>
            <input ref={item.key === "x" ? horizontal : undefined} id={`${id}-${item.key}`} type="range" min={item.key === "zoom" ? 1 : 0} max={item.max} step={item.step} value={item.value} disabled={!ready}
              aria-valuetext={item.key === "zoom" ? `${Math.round(item.value * 100)} percent zoom` : `${Math.round(item.value)} percent from ${item.key === "x" ? "left" : "top"}`}
              onChange={event => { drag.current = null; session.setCrop({ ...state.crop, [item.key]:Number(event.target.value) }); }}
              className="block h-[44px] min-h-[44px] w-full min-w-0 accent-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:opacity-40" />
          </div>
        ))}
      </div>
      {cropRect && state.size?.width === cropRect.size && state.size.height === cropRect.size && <p className="text-sm leading-6 text-zinc-400">Zoom in to move the photo within the circle.</p>}
      {state.error && <p role="alert" className="text-sm leading-6 text-rose-200">{state.error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" className={control} disabled={!ready} onClick={() => { drag.current = null; session.setCrop({ ...DEFAULT_AVATAR_CROP }); }}>Reset</Button>
        <Button type="button" variant="outline" className={control} onClick={cancel}>Cancel</Button>
        <Button type="button" className={control} disabled={!ready} onClick={() => { drag.current = null; void session.confirm(onConfirm); }}>Use avatar</Button>
      </div>
    </section>
  );
}
