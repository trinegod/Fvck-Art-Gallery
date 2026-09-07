"use client";

import { Check, Eye, EyeOff, ImagePlus, Palette } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CHAT_PALETTES, DEFAULT_CHAT_APPEARANCE, type ChatAppearance } from "@/lib/chat-appearance";
import type { SharedArtwork } from "./messages-types";
import { BACKGROUND_FILE_TYPES, prepareChatBackground } from "@/lib/chat-background-image";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950";

export default function ChatAppearanceDialog({ appearance, temporary, artworks, onChange: update }: {
  appearance: ChatAppearance;
  temporary: boolean;
  artworks: SharedArtwork[];
  onChange: (patch: Partial<ChatAppearance>) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const pendingImage = useRef<AbortController | null>(null);
  const selected = artworks.some(artwork => artwork.id === appearance.artworkId);

  useEffect(() => () => { pendingImage.current?.abort(); }, []);

  function cancelImage() {
    pendingImage.current?.abort();
    pendingImage.current = null;
    setPreparing(false);
  }

  function changeOpen(next: boolean) {
    if (!next) cancelImage();
    setOpen(next);
  }

  async function chooseImage(file: File) {
    cancelImage();
    setImageError(null);
    const request = new AbortController();
    pendingImage.current = request;
    setPreparing(true);
    try {
      const customBackground = await prepareChatBackground(file, request.signal);
      if (!request.signal.aborted) update({ customBackground, artworkId: null, hidden: false });
    } catch (error) {
      if (!request.signal.aborted) setImageError(error instanceof Error ? error.message : "Unable to use this image.");
    } finally {
      if (!request.signal.aborted && pendingImage.current === request) {
        pendingImage.current = null;
        setPreparing(false);
      }
    }
  }

  function changeBackground(patch: Partial<ChatAppearance>) {
    cancelImage();
    setImageError(null);
    update(patch);
  }

  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger render={<button type="button" aria-label="Chat appearance" title="Chat appearance" className={`nodeine-action grid size-11 shrink-0 place-items-center rounded-full text-zinc-300 hover:bg-white/5 hover:text-cyan-200 ${focusRing}`} />}>
      <Palette className="size-4" />
    </DialogTrigger>
      <DialogContent className="max-h-[85svh] overflow-y-auto border-white/15 bg-zinc-950 text-zinc-100 sm:max-w-md [&_[data-slot=dialog-close]]:size-11">
        <DialogHeader className="pr-10">
          <DialogTitle>Make room for the art</DialogTitle>
          <DialogDescription className="text-zinc-400">Your view only, {temporary ? "temporarily applied to this conversation" : "saved on this device for this conversation"}. Other members keep their own appearance.</DialogDescription>
        </DialogHeader>
        <fieldset className="min-w-0">
          <legend className="mb-3 text-sm text-zinc-300">Your message bubbles</legend>
          <div className="flex flex-wrap gap-3">
            {Object.entries(CHAT_PALETTES).map(([key, palette]) => <button key={key} type="button" aria-pressed={appearance.palette === key} onClick={() => update({ palette: key as ChatAppearance["palette"] })} style={{ backgroundColor: palette.background, color: palette.foreground }} className={`nodeine-action inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium aria-pressed:outline aria-pressed:outline-offset-2 aria-pressed:outline-white ${focusRing}`}>
              {palette.label}{appearance.palette === key && <Check className="size-4" aria-hidden="true" />}
            </button>)}
          </div>
        </fieldset>
        <div className="grid gap-2">
          <input ref={fileInput} type="file" accept={BACKGROUND_FILE_TYPES} aria-label="Choose a personal background image" className="hidden" onChange={event => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void chooseImage(file);
          }} />
          <button type="button" onClick={() => fileInput.current?.click()} className={`nodeine-action flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/5 px-3 text-sm text-cyan-200 ${focusRing}`}>
            <ImagePlus className="size-4" />{appearance.customBackground ? "Change device photo" : "Choose from device"}
          </button>
          <p className="text-xs leading-5 text-zinc-400">JPEG, PNG, or WebP · up to 8 MB. A smaller copy stays on this device. It is not uploaded or sent as a message.</p>
          {preparing && <p role="status" className="text-xs text-cyan-200">Preparing your background…</p>}
          {imageError && <p role="alert" className="text-xs leading-5 text-amber-200">{imageError}</p>}
          {appearance.customBackground && <>
            <div role="img" aria-label="Your personal background preview" className="h-20 rounded-lg border border-white/10 bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(appearance.customBackground)})` }} />
            <button type="button" onClick={() => changeBackground({ customBackground: null, artworkId: null })} className={`nodeine-action min-h-11 rounded-lg text-xs text-zinc-300 underline underline-offset-4 ${focusRing}`}>Remove device photo</button>
          </>}
        </div>
        <label className="grid gap-2 text-sm text-zinc-300">Background artwork
          <select value={appearance.customBackground ? "device" : selected ? appearance.artworkId ?? "" : ""} onChange={event => changeBackground({ artworkId: event.target.value || null, customBackground: null, hidden: false })} className={`min-h-11 min-w-0 w-full rounded-xl border border-white/20 bg-zinc-900 px-3 text-zinc-100 ${focusRing}`}>
            <option value="">No artwork</option>
            {appearance.customBackground && <option value="device" disabled>Your device photo</option>}
            {artworks.map(artwork => <option key={artwork.id} value={artwork.id}>{artwork.title}</option>)}
          </select>
          <span className="text-xs leading-5 text-zinc-400">Or use artwork already shared in this conversation.</span>
        </label>
        <button type="button" disabled={preparing} aria-pressed={appearance.hidden} onClick={() => update({ hidden: !appearance.hidden })} className={`nodeine-action inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-zinc-900 px-3 text-sm disabled:opacity-50 ${focusRing}`}>
          {appearance.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}{appearance.hidden ? "Show artwork for me" : "Hide artwork for me"}
        </button>
        <label className="grid gap-1 text-sm text-zinc-300">Artwork dimming: {appearance.dim}%
          <input type="range" min={35} max={85} step={5} value={appearance.dim} onChange={event => update({ dim: Number(event.target.value) })} className={`h-11 w-full accent-cyan-300 ${focusRing}`} />
          <span className="text-xs text-zinc-400">Bubbles and message labels stay opaque at every setting.</span>
        </label>
        {temporary && <p role="status" className="text-xs leading-5 text-amber-200">Browser storage is unavailable. These choices last until this page reloads or closes.</p>}
        <div className="sticky -bottom-4 -mx-4 -mb-4 border-t border-white/10 bg-zinc-950 p-4">
          <p className="mb-2 text-xs text-zinc-400">Changes apply as you choose.</p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => changeBackground(DEFAULT_CHAT_APPEARANCE)} className={`nodeine-action min-h-11 rounded-xl border border-white/15 text-xs text-zinc-400 ${focusRing}`}>Reset appearance</button>
            <button type="button" disabled={preparing} onClick={() => changeOpen(false)} className={`nodeine-action inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-semibold text-zinc-950 disabled:opacity-50 ${focusRing}`}><Check className="size-4" />Done</button>
          </div>
        </div>
      </DialogContent>
  </Dialog>;
}
