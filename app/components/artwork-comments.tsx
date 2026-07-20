"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

type CommentProfile = {
  username: string;
  display_name: string;
  avatar_url: string | null;
};

type ArtworkComment = {
  id: string;
  artwork_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profile: CommentProfile | CommentProfile[] | null;
};

type ArtworkCommentsProps = {
  artworkId: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getProfile(comment: ArtworkComment) {
  return Array.isArray(comment.profile)
    ? comment.profile[0] ?? null
    : comment.profile;
}

function formatCommentDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function ArtworkComments({ artworkId }: ArtworkCommentsProps) {
  const [comments, setComments] = useState<ArtworkComment[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(
    () => Boolean(supabase) && uuidPattern.test(artworkId)
  );
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

    async function loadComments() {
      const { data, error: commentsError } = await database
        .from("comments")
        .select(
          "id, artwork_id, user_id, body, created_at, profile:profiles!comments_user_id_fkey(username, display_name, avatar_url)"
        )
        .eq("artwork_id", artworkId)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      if (commentsError) {
        setError(
          commentsError.code === "42P01" || commentsError.code === "PGRST205"
            ? "Comments are waiting for their database connection."
            : commentsError.message
        );
      } else {
        setComments((data ?? []) as unknown as ArtworkComment[]);
      }

      setLoading(false);
    }

    loadComments();

    return () => {
      cancelled = true;
    };
  }, [artworkId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    const body = draft.trim();

    if (!client || !viewerId || !body || !uuidPattern.test(artworkId)) return;

    setSubmitting(true);
    setError(null);

    const { data, error: insertError } = await client
      .from("comments")
      .insert({ artwork_id: artworkId, user_id: viewerId, body })
      .select(
        "id, artwork_id, user_id, body, created_at, profile:profiles!comments_user_id_fkey(username, display_name, avatar_url)"
      )
      .single();

    if (insertError) {
      setError(insertError.message);
    } else {
      setComments((current) => [
        ...current,
        data as unknown as ArtworkComment,
      ]);
      setDraft("");
    }

    setSubmitting(false);
  }

  async function handleDelete(commentId: string) {
    const client = supabase;
    if (!client || !viewerId) return;

    setDeletingId(commentId);
    setError(null);

    const { error: deleteError } = await client
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", viewerId);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setComments((current) =>
        current.filter((comment) => comment.id !== commentId)
      );
    }

    setDeletingId(null);
  }

  return (
    <section className="mt-7 border-t border-white/10 pt-6">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs uppercase tracking-[0.2em] text-zinc-400">
          Discussion
        </h4>
        <span className="text-xs text-zinc-600">
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </span>
      </div>

      {viewerId ? (
        <form onSubmit={handleSubmit} className="mt-4">
          <label htmlFor={`comment-${artworkId}`} className="sr-only">
            Add a comment
          </label>
          <textarea
            id={`comment-${artworkId}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Add to the discussion..."
            className="w-full resize-none border border-white/15 bg-black px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-zinc-600 focus:border-cyan-300"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-xs text-zinc-600">{draft.length}/500</span>
            <button
              type="submit"
              disabled={submitting || !draft.trim()}
              className="bg-cyan-300 px-4 py-2 text-xs font-medium uppercase tracking-[0.14em] text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-4 border border-white/10 bg-black/40 px-3 py-3 text-sm leading-6 text-zinc-500">
          <Link href="/admin" className="text-cyan-300 hover:text-cyan-200">
            Sign in
          </Link>{" "}
          to join the discussion.
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm leading-6 text-rose-300" role="alert">
          {error}
        </p>
      )}

      <div className="mt-5 space-y-5">
        {loading ? (
          <p className="text-sm text-zinc-600">Loading comments...</p>
        ) : comments.length ? (
          comments.map((comment) => {
            const profile = getProfile(comment);
            const displayName = profile?.display_name || "NODEINE creator";
            const initial = displayName.charAt(0).toUpperCase() || "N";

            return (
              <article key={comment.id} className="flex gap-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-black text-xs text-cyan-300">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initial
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    {profile?.username ? (
                      <Link
                        href={`/creator/${profile.username}`}
                        className="text-sm text-zinc-200 hover:text-cyan-200"
                      >
                        {displayName}
                      </Link>
                    ) : (
                      <span className="text-sm text-zinc-200">
                        {displayName}
                      </span>
                    )}
                    <time className="text-xs text-zinc-600">
                      {formatCommentDate(comment.created_at)}
                    </time>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-zinc-400">
                    {comment.body}
                  </p>
                  {viewerId === comment.user_id && (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      disabled={deletingId === comment.id}
                      className="mt-2 text-xs text-zinc-600 hover:text-rose-300 disabled:opacity-50"
                    >
                      {deletingId === comment.id ? "Deleting..." : "Delete"}
                    </button>
                  )}
                </div>
              </article>
            );
          })
        ) : (
          !error && (
            <p className="text-sm leading-6 text-zinc-600">
              No comments yet. Start the discussion.
            </p>
          )
        )}
      </div>
    </section>
  );
}
