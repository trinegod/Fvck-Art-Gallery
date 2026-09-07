"use client";

import { Check, Eye, EyeOff, Palette } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CHAT_PALETTES, DEFAULT_CHAT_APPEARANCE, type ChatAppearance } from "@/lib/chat-appearance";
import type { SharedArtwork } from "./messages-types";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-4 focus-visible:ring-offset-zinc-950";

export default function ChatAppearanceDialog({ appearance, temporary, artworks, onChange: update }: {
  appearance: ChatAppearance;
  temporary: boolean;
  artworks: SharedArtwork[];
  onChange: (patch: Partial<ChatAppearance>) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = artworks.some(artwork => artwork.id === appearance.artworkId);

  return <Dialog open={open} onOpenChange={setOpen}>
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
        <label className="grid gap-2 text-sm text-zinc-300">Background artwork
          <select value={selected ? appearance.artworkId ?? "" : ""} onChange={event => update({ artworkId: event.target.value || null })} className={`min-h-11 min-w-0 w-full rounded-xl border border-white/20 bg-zinc-900 px-3 text-zinc-100 ${focusRing}`}>
            <option value="">No artwork</option>
            {artworks.map(artwork => <option key={artwork.id} value={artwork.id}>{artwork.title}</option>)}
          </select>
          <span className="text-xs leading-5 text-zinc-400">Choose an image already shared in this conversation. Share a piece using Worlds to add a choice.</span>
        </label>
        <button type="button" aria-pressed={appearance.hidden} onClick={() => update({ hidden: !appearance.hidden })} className={`nodeine-action inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-zinc-900 px-3 text-sm ${focusRing}`}>
          {appearance.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}{appearance.hidden ? "Show artwork for me" : "Hide artwork for me"}
        </button>
        <label className="grid gap-1 text-sm text-zinc-300">Artwork dimming: {appearance.dim}%
          <input type="range" min={35} max={85} step={5} value={appearance.dim} onChange={event => update({ dim: Number(event.target.value) })} className={`h-11 w-full accent-cyan-300 ${focusRing}`} />
          <span className="text-xs text-zinc-400">Bubbles and message labels stay opaque at every setting.</span>
        </label>
        <button type="button" onClick={() => update(DEFAULT_CHAT_APPEARANCE)} className={`nodeine-action min-h-11 rounded-xl border border-white/15 text-sm text-zinc-300 ${focusRing}`}>Reset appearance</button>
        {temporary && <p role="status" className="text-xs leading-5 text-amber-200">Browser storage is unavailable. These choices last until this page reloads or closes.</p>}
      </DialogContent>
  </Dialog>;
}
