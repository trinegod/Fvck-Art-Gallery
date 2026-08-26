"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, GitFork, LoaderCircle, Pencil, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase-browser";
import { forkWorldThread } from "@/lib/world-threads";

export default function ThreadActions({
  threadId,
  slug,
  ownerId,
  allowForks,
}: {
  threadId: string;
  slug: string;
  ownerId: string;
  allowForks: boolean;
}) {
  const router = useRouter();
  const [viewerId, setViewerId] = useState<string | null | undefined>(
    supabase ? undefined : null
  );
  const [forking, setForking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const database = client;
    let cancelled = false;

    database.auth.getUser().then(({ data }) => {
      if (!cancelled) setViewerId(data.user?.id ?? null);
    });
    const { data: authListener } = database.auth.onAuthStateChange(
      (_event, session) => {
        if (!cancelled) setViewerId(session?.user.id ?? null);
      }
    );
    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function forkThread() {
    const database = supabase;
    if (!database || forking) return;
    if (!viewerId) {
      router.push("/admin");
      return;
    }
    setForking(true);
    setMessage(null);
    try {
      const result = await forkWorldThread(database, threadId);
      router.push(`/threads/${result.threadSlug}/edit`);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "This path could not be forked."
      );
      setForking(false);
    }
  }

  async function shareThread() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("The link could not be shared from this browser.");
    }
  }

  const isOwner = viewerId === ownerId;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={shareThread}
        className="h-10 rounded-full border-white/12 bg-white/5 px-4"
      >
        {copied ? <Check className="size-4" aria-hidden="true" /> : <Share2 className="size-4" aria-hidden="true" />}
        {copied ? "Copied" : "Share"}
      </Button>

      {isOwner ? (
        <Button className="h-10 rounded-full px-4" render={<Link href={`/threads/${slug}/edit`} />}>
          <Pencil className="size-4" aria-hidden="true" />
          Edit thread
        </Button>
      ) : allowForks ? (
        <Button type="button" onClick={forkThread} disabled={forking || viewerId === undefined} className="h-10 rounded-full px-4">
          {forking ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <GitFork className="size-4" aria-hidden="true" />}
          {forking ? "Forking" : "Fork this path"}
        </Button>
      ) : null}

      {message && (
        <span role="status" aria-live="polite" className="basis-full text-xs text-rose-300">
          {message}
        </span>
      )}
    </div>
  );
}
