"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageIcon, LoaderCircle, Play, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase-browser";
import PolishedImage from "../components/polished-image";
import type { SharedArtwork } from "./messages-types";

type ArtworkShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare: (artwork: SharedArtwork) => Promise<boolean>;
};

export default function ArtworkShareDialog({
  open,
  onOpenChange,
  onShare,
}: ArtworkShareDialogProps) {
  const [artworks, setArtworks] = useState<SharedArtwork[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!open || !client || artworks.length) return;
    const database = client;
    let cancelled = false;

    async function loadArtworks() {
      setLoading(true);
      const { data, error } = await database
        .from("artworks")
        .select("id, title, src, thumb_src, media_type, mood")
        .order("created_at", { ascending: false })
        .limit(160);

      if (cancelled) return;
      setLoading(false);

      if (error) {
        toast.error("Artwork couldn't be loaded", {
          description: error.message,
        });
        return;
      }

      setArtworks((data ?? []) as SharedArtwork[]);
    }

    loadArtworks();
    return () => {
      cancelled = true;
    };
  }, [artworks.length, open]);

  const filteredArtworks = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return artworks;
    return artworks.filter((artwork) =>
      `${artwork.title} ${artwork.mood ?? ""}`.toLowerCase().includes(query)
    );
  }, [artworks, search]);

  async function shareArtwork(artwork: SharedArtwork) {
    if (sharingId) return;
    setSharingId(artwork.id);
    const shared = await onShare(artwork);
    setSharingId(null);
    if (shared) {
      setSearch("");
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88svh] overflow-hidden border border-white/10 bg-zinc-950/98 p-0 shadow-2xl shadow-black/70 ring-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-white/10 px-5 py-5 sm:px-6">
          <DialogTitle className="text-xl text-white">Share artwork</DialogTitle>
          <DialogDescription className="leading-6 text-zinc-500">
            Drop a piece from the archive into this conversation with its
            original page and credit intact.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b border-white/10 px-5 py-4 sm:px-6">
          <label className="relative block">
            <span className="sr-only">Search artwork</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search artwork or mood"
              className="h-11 border-white/12 bg-black/45 pl-10"
            />
          </label>
        </div>

        <div className="min-h-72 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="grid min-h-72 place-items-center">
              <LoaderCircle className="size-7 animate-spin text-cyan-300" />
            </div>
          ) : filteredArtworks.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filteredArtworks.map((artwork) => {
                const sharing = sharingId === artwork.id;
                return (
                  <article
                    key={artwork.id}
                    className="overflow-hidden rounded-xl border border-white/10 bg-black/35"
                  >
                    <div className="relative aspect-[4/5] bg-zinc-900">
                      {artwork.thumb_src || artwork.media_type === "image" ? (
                        <PolishedImage
                          src={artwork.thumb_src ?? artwork.src}
                          alt={artwork.title}
                          wrapperClassName="size-full"
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="grid size-full place-items-center text-zinc-700">
                          <ImageIcon className="size-8" />
                        </span>
                      )}
                      {artwork.media_type === "video" && (
                        <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/70 text-white backdrop-blur">
                          <Play className="size-3.5" fill="currentColor" />
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="line-clamp-2 text-sm leading-5 text-zinc-100">
                        {artwork.title}
                      </h3>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => shareArtwork(artwork)}
                        disabled={Boolean(sharingId)}
                        className="mt-3 w-full"
                      >
                        {sharing ? (
                          <LoaderCircle
                            data-icon="inline-start"
                            className="animate-spin"
                          />
                        ) : (
                          <Send data-icon="inline-start" />
                        )}
                        Share
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="grid min-h-72 place-items-center px-5 text-center">
              <div>
                <ImageIcon className="mx-auto size-8 text-zinc-700" />
                <p className="mt-3 text-sm text-zinc-500">
                  No matching artwork found.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
