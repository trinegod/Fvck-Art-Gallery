"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, LoaderCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-browser";
import ProfileShareButton from "./profile-share-button";

type ProfileFollowControlProps = {
  profileId: string;
  creatorName: string;
  creatorUsername?: string;
  variant?: "profile" | "compact";
  collectionCount?: number;
  artworkCount?: number;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isMissingTableError(code?: string) {
  return code === "42P01" || code === "PGRST205";
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <p>
      <span className="block text-xl text-white">{value}</span>
      <span className="text-zinc-500">{label}</span>
    </p>
  );
}

export default function ProfileFollowControl({
  profileId,
  creatorName,
  creatorUsername,
  variant = "profile",
  collectionCount = 0,
  artworkCount = 0,
}: ProfileFollowControlProps) {
  const canUseDatabase = Boolean(supabase) && uuidPattern.test(profileId);
  const [viewerId, setViewerId] = useState<string | null | undefined>(() =>
    supabase ? undefined : null
  );
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [relationshipLoading, setRelationshipLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState(canUseDatabase);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    let authResolved = false;

    function syncViewer(nextViewerId: string | null) {
      setViewerId(nextViewerId);
      setFollowing(false);
      setRelationshipLoading(
        Boolean(
          nextViewerId &&
            nextViewerId !== profileId &&
            uuidPattern.test(profileId)
        )
      );
    }

    function resolveViewer(nextViewerId: string | null) {
      if (!active) return;
      authResolved = true;
      window.clearTimeout(authFallbackTimer);
      syncViewer(nextViewerId);
    }

    const authFallbackTimer = window.setTimeout(() => {
      if (!authResolved) syncViewer(null);
    }, 1500);

    client.auth.getSession().then(({ data }) => {
      resolveViewer(data.session?.user.id ?? null);
    });

    const { data: authListener } = client.auth.onAuthStateChange(
      (_event, session) => resolveViewer(session?.user.id ?? null)
    );

    return () => {
      active = false;
      window.clearTimeout(authFallbackTimer);
      authListener.subscription.unsubscribe();
    };
  }, [profileId]);

  useEffect(() => {
    const client = supabase;
    let cancelled = false;

    if (!client || !uuidPattern.test(profileId)) return;
    const database = client;

    async function loadCounts() {
      const [followersResult, followingResult] = await Promise.all([
        database
          .from("profile_follows")
          .select("follower_id", { count: "exact", head: true })
          .eq("followed_id", profileId),
        database
          .from("profile_follows")
          .select("followed_id", { count: "exact", head: true })
          .eq("follower_id", profileId),
      ]);

      if (cancelled) return;
      const countError = followersResult.error ?? followingResult.error;

      if (countError) {
        setAvailable(false);
        setError(
          isMissingTableError(countError.code)
            ? "Follows are waiting for their database connection."
            : countError.message
        );
      } else {
        setAvailable(true);
        setFollowerCount(followersResult.count ?? 0);
        setFollowingCount(followingResult.count ?? 0);
      }

    }

    loadCounts();

    return () => {
      cancelled = true;
    };
  }, [profileId]);

  useEffect(() => {
    const client = supabase;
    let cancelled = false;

    if (
      !client ||
      !viewerId ||
      viewerId === profileId ||
      !available ||
      !uuidPattern.test(profileId)
    ) {
      return;
    }
    const database = client;

    async function loadRelationship() {
      const { data, error: relationshipError } = await database
        .from("profile_follows")
        .select("followed_id")
        .eq("follower_id", viewerId)
        .eq("followed_id", profileId)
        .maybeSingle();

      if (cancelled) return;

      if (relationshipError) {
        if (isMissingTableError(relationshipError.code)) {
          setAvailable(false);
          setError("Follows are waiting for their database connection.");
        } else {
          setError(relationshipError.message);
        }
      } else {
        setFollowing(Boolean(data));
      }
      setRelationshipLoading(false);
    }

    loadRelationship();

    return () => {
      cancelled = true;
    };
  }, [available, profileId, viewerId]);

  async function toggleFollow() {
    const client = supabase;
    if (
      !client ||
      !viewerId ||
      viewerId === profileId ||
      !available ||
      saving
    )
      return;

    const wasFollowing = following;
    setSaving(true);
    setError(null);
    setFollowing(!wasFollowing);
    setFollowerCount((current) =>
      Math.max(0, current + (wasFollowing ? -1 : 1))
    );

    const result = wasFollowing
      ? await client
          .from("profile_follows")
          .delete()
          .eq("follower_id", viewerId)
          .eq("followed_id", profileId)
      : await client.from("profile_follows").insert({
          follower_id: viewerId,
          followed_id: profileId,
        });

    if (result.error) {
      setFollowing(wasFollowing);
      setFollowerCount((current) =>
        Math.max(0, current + (wasFollowing ? 1 : -1))
      );
      setError(result.error.message);
      toast.error("Follow wasn't updated", {
        description: result.error.message,
      });
    } else {
      toast.success(
        wasFollowing
          ? `Unfollowed ${creatorName}`
          : `Now following ${creatorName}`
      );
    }

    setSaving(false);
  }

  const isSelf = Boolean(viewerId) && viewerId === profileId;
  const loading = viewerId === undefined || relationshipLoading;
  const followerLabel = `${followerCount} ${
    followerCount === 1 ? "follower" : "followers"
  }`;
  const buttonClassName =
    variant === "compact"
      ? "nodeine-action inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
      : "nodeine-action inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

  let action;

  if (loading) {
    action = (
      <button
        type="button"
        disabled
        className={`${buttonClassName} cursor-wait border-white/10 text-zinc-500`}
        aria-label="Loading follow status"
      >
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        Follow
      </button>
    );
  } else if (isSelf) {
    action = (
      <Link
        href="/admin"
        className={`${buttonClassName} border-white/15 text-zinc-200 hover:border-cyan-300/60 hover:text-cyan-200`}
      >
        Edit profile
      </Link>
    );
  } else if (!available) {
    action = (
      <button
        type="button"
        disabled
        className={`${buttonClassName} cursor-not-allowed border-white/10 text-zinc-600`}
        title={error ?? "Follows are unavailable"}
      >
        <UserPlus className="size-4" aria-hidden="true" />
        Follow
      </button>
    );
  } else if (!viewerId) {
    action = (
      <Link
        href="/admin"
        className={`${buttonClassName} border-cyan-300/40 bg-cyan-300 text-zinc-950 hover:bg-cyan-200`}
        aria-label={`Sign in to follow ${creatorName}. ${followerLabel}.`}
        title="Sign in to follow"
      >
        <UserPlus className="size-4" aria-hidden="true" />
        Follow
      </Link>
    );
  } else {
    action = (
      <button
        type="button"
        onClick={toggleFollow}
        disabled={saving}
        aria-pressed={following}
        aria-label={`${following ? "Unfollow" : "Follow"} ${creatorName}. ${followerLabel}.`}
        className={`${buttonClassName} disabled:cursor-wait disabled:opacity-70 ${
          following
            ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-200 hover:border-rose-300/50 hover:text-rose-200"
            : "border-cyan-300/40 bg-cyan-300 text-zinc-950 hover:bg-cyan-200"
        }`}
      >
        {following ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <UserPlus className="size-4" aria-hidden="true" />
        )}
        {following ? "Following" : "Follow"}
      </button>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {action}
        <span className="text-[11px] text-zinc-600" aria-live="polite">
          {followerLabel}
        </span>
        {error && available && (
          <span className="max-w-44 text-right text-[11px] text-rose-300" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col items-center gap-5 sm:items-start">
      <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm sm:justify-start">
        <Stat value={collectionCount} label="Collections" />
        <Stat value={artworkCount} label="Artworks" />
        <Stat value={followerCount} label="Followers" />
        <Stat value={followingCount} label="Following" />
      </div>
      <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
        {action}
        {creatorUsername && (
          <ProfileShareButton
            creatorName={creatorName}
            creatorUsername={creatorUsername}
          />
        )}
      </div>
      {error && available && (
        <span className="max-w-md text-xs leading-5 text-rose-300" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
