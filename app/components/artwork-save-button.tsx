"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-browser";

type ArtworkSaveButtonProps = {
  artworkId: string;
  onSavedChange?: (saved: boolean) => void;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isMissingTableError(code?: string) {
  return code === "42P01" || code === "PGRST205";
}

const baseClassName =
  "nodeine-action inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

export default function ArtworkSaveButton({
  artworkId,
  onSavedChange,
}: ArtworkSaveButtonProps) {
  const canUseDatabase = Boolean(supabase) && uuidPattern.test(artworkId);
  const [viewerId, setViewerId] = useState<string | null | undefined>(() =>
    supabase ? undefined : null
  );
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(canUseDatabase);
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState(canUseDatabase);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    client.auth.getUser().then(({ data }) => {
      setViewerId(data.user?.id ?? null);
    });

    const { data: authListener } = client.auth.onAuthStateChange(
      (_event, session) => {
        setViewerId(session?.user.id ?? null);
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const client = supabase;
    let cancelled = false;

    if (!client || !viewerId || !uuidPattern.test(artworkId)) {
      return;
    }
    const database = client;

    async function loadSavedState() {
      const { data, error: savedStateError } = await database
        .from("artwork_saves")
        .select("artwork_id")
        .eq("artwork_id", artworkId)
        .eq("user_id", viewerId)
        .maybeSingle();

      if (cancelled) return;

      if (savedStateError) {
        setAvailable(false);
        setError(
          isMissingTableError(savedStateError.code)
            ? "Saves are waiting for their database connection."
            : savedStateError.message
        );
      } else {
        setAvailable(true);
        setSaved(Boolean(data));
      }

      setLoading(false);
    }

    loadSavedState();

    return () => {
      cancelled = true;
    };
  }, [artworkId, viewerId]);

  async function toggleSave() {
    const client = supabase;
    if (!client || !viewerId || !available || saving) return;

    const wasSaved = saved;
    setSaving(true);
    setError(null);
    setSaved(!wasSaved);

    const result = wasSaved
      ? await client
          .from("artwork_saves")
          .delete()
          .eq("artwork_id", artworkId)
          .eq("user_id", viewerId)
      : await client
          .from("artwork_saves")
          .insert({ artwork_id: artworkId, user_id: viewerId });

    if (result.error) {
      setSaved(wasSaved);
      setError(result.error.message);
      toast.error("Save wasn't updated", {
        description: result.error.message,
      });
    } else {
      toast.success(
        wasSaved ? "Removed from saved artwork" : "Saved to your collection"
      );
      setSaving(false);
      onSavedChange?.(!wasSaved);
      return;
    }

    setSaving(false);
  }

  if (viewerId === undefined) {
    return (
      <button
        type="button"
        disabled
        className={`${baseClassName} cursor-wait border-white/10 text-zinc-500`}
        aria-label="Loading saved state"
      >
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        <span>Save</span>
      </button>
    );
  }

  if (!viewerId) {
    return (
      <Link
        href="/admin"
        className={`${baseClassName} border-white/15 text-zinc-200 hover:border-cyan-300/70 hover:text-cyan-200`}
        aria-label="Sign in to save this artwork"
        title="Sign in to save"
      >
        <Bookmark className="size-4" aria-hidden="true" />
        <span>Save</span>
      </Link>
    );
  }

  if (loading) {
    return (
      <button
        type="button"
        disabled
        className={`${baseClassName} cursor-wait border-white/10 text-zinc-500`}
        aria-label="Loading saved state"
      >
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        <span>Save</span>
      </button>
    );
  }

  if (!available) {
    return (
      <button
        type="button"
        disabled
        className={`${baseClassName} cursor-not-allowed border-white/10 text-zinc-600`}
        title={error ?? "Saves are unavailable"}
      >
        <Bookmark className="size-4" aria-hidden="true" />
        <span>Save</span>
      </button>
    );
  }

  return (
    <div className="inline-flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={toggleSave}
        disabled={saving}
        aria-pressed={saved}
        aria-label={saved ? "Remove from saved artwork" : "Save this artwork"}
        className={`${baseClassName} disabled:cursor-wait disabled:opacity-70 ${
          saved
            ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-200"
            : "border-white/15 text-zinc-200 hover:border-cyan-300/70 hover:text-cyan-200"
        }`}
      >
        <Bookmark
          className="size-4"
          fill={saved ? "currentColor" : "none"}
          aria-hidden="true"
        />
        <span>{saved ? "Saved" : "Save"}</span>
      </button>
      {error && (
        <span className="max-w-52 text-xs leading-5 text-rose-300" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
