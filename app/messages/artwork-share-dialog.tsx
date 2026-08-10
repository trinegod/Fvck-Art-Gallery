"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ImageIcon,
  Layers3,
  LoaderCircle,
  Play,
  Search,
  Send,
} from "lucide-react";
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
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { supabase } from "@/lib/supabase-browser";
import PolishedImage from "../components/polished-image";
import type { SharedArtwork } from "./messages-types";

type ArtworkShareDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare: (artwork: SharedArtwork) => Promise<boolean>;
};

type ArtworkWorld = {
  id: string;
  title: string;
  world_code: string | null;
  sort_order: number | null;
};

export default function ArtworkShareDialog({
  open,
  onOpenChange,
  onShare,
}: ArtworkShareDialogProps) {
  const [artworks, setArtworks] = useState<SharedArtwork[]>([]);
  const [worlds, setWorlds] = useState<ArtworkWorld[]>([]);
  const [selectedWorldId, setSelectedWorldId] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!open || !client || loaded) return;
    const database = client;
    let cancelled = false;

    async function loadArtworks() {
      setLoading(true);
      const [artworkResult, worldResult] = await Promise.all([
        database
          .from("artworks")
          .select(
            "id, collection_id, title, src, thumb_src, media_type, mood"
          )
          .order("created_at", { ascending: false })
          .limit(1000),
        database
          .from("collections")
          .select("id, title, world_code, sort_order")
          .order("sort_order", { ascending: true }),
      ]);

      if (cancelled) return;
      setLoading(false);
      setLoaded(true);

      const error = artworkResult.error ?? worldResult.error;
      if (error) {
        toast.error("Artwork couldn't be loaded", {
          description: error.message,
        });
        return;
      }

      setArtworks((artworkResult.data ?? []) as SharedArtwork[]);
      setWorlds((worldResult.data ?? []) as ArtworkWorld[]);
    }

    loadArtworks();
    return () => {
      cancelled = true;
    };
  }, [loaded, open]);

  const filteredArtworks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return artworks.filter((artwork) => {
      const matchesWorld =
        selectedWorldId === "all" ||
        artwork.collection_id === selectedWorldId;
      const matchesSearch =
        !query ||
        `${artwork.title} ${artwork.mood ?? ""}`
          .toLowerCase()
          .includes(query);
      return matchesWorld && matchesSearch;
    });
  }, [artworks, search, selectedWorldId]);

  const artworkCountByWorld = useMemo(() => {
    const counts = new Map<string, number>();
    for (const artwork of artworks) {
      if (!artwork.collection_id) continue;
      counts.set(
        artwork.collection_id,
        (counts.get(artwork.collection_id) ?? 0) + 1
      );
    }
    return counts;
  }, [artworks]);

  async function shareArtwork(artwork: SharedArtwork) {
    if (sharingId) return;
    setSharingId(artwork.id);
    const shared = await onShare(artwork);
    setSharingId(null);
    if (shared) {
      setSearch("");
      setSelectedWorldId("all");
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88svh] overflow-hidden border border-white/10 bg-zinc-950/98 p-0 shadow-2xl shadow-black/70 ring-0 sm:max-w-2xl">
        <DialogHeader className="border-b border-white/10 px-5 py-5 sm:px-6">
          <DialogTitle className="text-xl text-white">
            Drop from a world
          </DialogTitle>
          <DialogDescription className="leading-6 text-zinc-500">
            Choose one of your visual worlds, then drop a piece into this
            conversation with its original page and credit intact.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 border-b border-white/10 px-5 py-4 sm:px-6">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
              <Layers3 className="size-3.5 text-cyan-300" />
              Choose a world
            </span>
            <NativeSelect
              value={selectedWorldId}
              onChange={(event) => setSelectedWorldId(event.target.value)}
              aria-label="Choose a visual world"
              className="w-full [&_select]:h-11"
            >
              <NativeSelectOption value="all">
                All worlds ({artworks.length})
              </NativeSelectOption>
              {worlds.map((world) => (
                <NativeSelectOption key={world.id} value={world.id}>
                  {world.world_code ? `${world.world_code} — ` : ""}
                  {world.title} ({artworkCountByWorld.get(world.id) ?? 0})
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>

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
                  No matching artwork found in this world.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
