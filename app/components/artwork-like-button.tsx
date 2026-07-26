"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, LoaderCircle } from "lucide-react";
import { supabase } from "@/lib/supabase-browser";

type ArtworkLikeButtonProps = {
  artworkId: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isMissingTableError(code?: string) {
  return code === "42P01" || code === "PGRST205";
}

const baseClassName =
  "inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

export default function ArtworkLikeButton({
  artworkId,
}: ArtworkLikeButtonProps) {
  const canUseDatabase = Boolean(supabase) && uuidPattern.test(artworkId);
  const [viewerId, setViewerId] = useState<string | null | undefined>(() =>
    supabase ? undefined : null
  );
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
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
      (_event, session) => setViewerId(session?.user.id ?? null)
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const client = supabase;
    let cancelled = false;

    if (!client || !uuidPattern.test(artworkId)) {
      return;
    }
    const database = client;

    async function loadLikeCount() {
      const { count, error: countError } = await database
        .from("artwork_likes")
        .select("artwork_id", { count: "exact", head: true })
        .eq("artwork_id", artworkId);

      if (cancelled) return;

      if (countError) {
        setAvailable(false);
        setError(
          isMissingTableError(countError.code)
            ? "Likes are waiting for their database connection."
            : countError.message
        );
      } else {
        setAvailable(true);
        setLikeCount(count ?? 0);
      }

      setLoading(false);
    }

    loadLikeCount();

    return () => {
      cancelled = true;
    };
  }, [artworkId]);

  useEffect(() => {
    const client = supabase;
    let cancelled = false;

    if (!client || !viewerId || !available || !uuidPattern.test(artworkId))
      return;
    const database = client;

    async function loadViewerLike() {
      const { data, error: viewerLikeError } = await database
        .from("artwork_likes")
        .select("artwork_id")
        .eq("artwork_id", artworkId)
        .eq("user_id", viewerId)
        .maybeSingle();

      if (cancelled) return;

      if (viewerLikeError) {
        if (isMissingTableError(viewerLikeError.code)) {
          setAvailable(false);
          setError("Likes are waiting for their database connection.");
        } else {
          setError(viewerLikeError.message);
        }
      } else {
        setLiked(Boolean(data));
      }
    }

    loadViewerLike();

    return () => {
      cancelled = true;
    };
  }, [artworkId, available, viewerId]);

  async function toggleLike() {
    const client = supabase;
    if (!client || !viewerId || !available || saving) return;

    const wasLiked = liked;
    setSaving(true);
    setError(null);
    setLiked(!wasLiked);
    setLikeCount((current) => Math.max(0, current + (wasLiked ? -1 : 1)));

    const result = wasLiked
      ? await client
          .from("artwork_likes")
          .delete()
          .eq("artwork_id", artworkId)
          .eq("user_id", viewerId)
      : await client
          .from("artwork_likes")
          .insert({ artwork_id: artworkId, user_id: viewerId });

    if (result.error) {
      setLiked(wasLiked);
      setLikeCount((current) => Math.max(0, current + (wasLiked ? 1 : -1)));
      setError(result.error.message);
    }

    setSaving(false);
  }

  const countLabel = `${likeCount} ${likeCount === 1 ? "like" : "likes"}`;

  if (loading || viewerId === undefined) {
    return (
      <button
        type="button"
        disabled
        className={`${baseClassName} cursor-wait border-white/10 text-zinc-500`}
        aria-label="Loading likes"
      >
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>Like</span>
      </button>
    );
  }

  if (!available) {
    return (
      <button
        type="button"
        disabled
        className={`${baseClassName} cursor-not-allowed border-white/10 text-zinc-600`}
        title={error ?? "Likes are unavailable"}
      >
        <Heart className="h-4 w-4" aria-hidden="true" />
        <span>Like</span>
        <span className="text-xs text-zinc-600">{likeCount}</span>
      </button>
    );
  }

  if (!viewerId) {
    return (
      <Link
        href="/admin"
        className={`${baseClassName} border-white/15 text-zinc-200 hover:border-rose-300/70 hover:text-rose-200`}
        aria-label={`Sign in to like this artwork. ${countLabel}.`}
        title="Sign in to like"
      >
        <Heart className="h-4 w-4" aria-hidden="true" />
        <span>Like</span>
        <span className="text-xs text-zinc-500">{likeCount}</span>
      </Link>
    );
  }

  return (
    <div className="inline-flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={toggleLike}
        disabled={saving}
        aria-pressed={liked}
        aria-label={`${liked ? "Unlike" : "Like"} this artwork. ${countLabel}.`}
        className={`${baseClassName} disabled:cursor-wait disabled:opacity-70 ${
          liked
            ? "border-rose-300/50 bg-rose-300/10 text-rose-200"
            : "border-white/15 text-zinc-200 hover:border-rose-300/70 hover:text-rose-200"
        }`}
      >
        <Heart
          className="h-4 w-4"
          fill={liked ? "currentColor" : "none"}
          aria-hidden="true"
        />
        <span>{liked ? "Liked" : "Like"}</span>
        <span className={liked ? "text-rose-200/70" : "text-zinc-500"}>
          {likeCount}
        </span>
      </button>
      {error && (
        <span className="max-w-52 text-xs leading-5 text-rose-300" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
