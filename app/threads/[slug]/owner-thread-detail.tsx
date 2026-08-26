"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, Network } from "lucide-react";
import { supabase } from "@/lib/supabase-browser";
import { getWorldThreadBySlug, type WorldThread } from "@/lib/world-threads";
import ThreadHeader from "../thread-header";
import ThreadDetail from "./thread-detail";

type OwnerLoadState = "loading" | "ready" | "missing" | "error";

export default function OwnerThreadDetail({ slug }: { slug: string }) {
  const [thread, setThread] = useState<WorldThread | null>(null);
  const [loadState, setLoadState] = useState<OwnerLoadState>(
    supabase ? "loading" : "missing"
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const database = client;
    let cancelled = false;

    async function load() {
      try {
        const { data } = await database.auth.getUser();
        if (!data.user) {
          if (!cancelled) setLoadState("missing");
          return;
        }
        const result = await getWorldThreadBySlug(database, slug);
        if (cancelled) return;
        if (!result || result.ownerId !== data.user.id) {
          setLoadState("missing");
          return;
        }
        setThread(result);
        setLoadState("ready");
      } catch (error) {
        if (cancelled) return;
        setMessage(error instanceof Error ? error.message : "The thread could not be opened.");
        setLoadState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loadState === "ready" && thread) return <ThreadDetail thread={thread} />;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <ThreadHeader />
      <div className="grid min-h-[calc(100svh-73px)] place-items-center px-5 py-16">
        <div className="max-w-md text-center">
          {loadState === "loading" ? (
            <LoaderCircle className="mx-auto size-8 animate-spin text-cyan-300 motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <Network className="mx-auto size-8 text-zinc-600" aria-hidden="true" />
          )}
          <h1 className="mt-5 text-2xl font-medium text-white">
            {loadState === "loading"
              ? "Checking this path"
              : loadState === "error"
                ? "The path could not open"
                : "World Thread not found"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {loadState === "loading"
              ? "Public threads open immediately; private drafts appear only for their owner."
              : message || "This thread may be private, unpublished, or no longer available."}
          </p>
          {loadState !== "loading" && (
            <Link href="/threads" className="mt-6 inline-flex min-h-10 items-center rounded-full bg-cyan-300 px-5 text-sm font-semibold text-zinc-950 hover:bg-cyan-200">
              Browse public threads
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
