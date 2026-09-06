"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, FilePenLine, LockKeyhole, Network, Plus, Sparkles, Upload } from "lucide-react";
import DesktopAppNavigation from "@/app/components/desktop-app-navigation";
import MobileAppNavigation from "@/app/components/mobile-app-navigation";
import { supabase } from "@/lib/supabase-browser";
import { getOwnedWorldThreadDrafts, type OwnedWorldThreadDraft } from "@/lib/world-threads";

type WorkspaceState = {
  status: "loading" | "signed-out" | "ready" | "error";
  ownerId: string | null;
  drafts: OwnedWorldThreadDraft[];
  hasMore: boolean;
  loadingMore: boolean;
  moreError: boolean;
};

const initialState: WorkspaceState = {
  status: "loading",
  ownerId: null,
  drafts: [],
  hasMore: false,
  loadingMore: false,
  moreError: false,
};

const actions = [
  { href: "/forge", label: "Forge", description: "Analyze your references. Shape a prompt.", detail: "Reference analysis · prompt export", icon: Sparkles },
  { href: "/admin", label: "Publish", description: "Give your artwork a home in a World.", detail: "Creator Studio", icon: Upload },
  { href: "/threads/new", label: "New Thread", description: "Connect pieces into a story of your own.", detail: "Curated visual paths", icon: Network },
];

function updatedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Saved draft"
    : `Updated ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date)}`;
}

export default function CreateWorkspace() {
  const [state, setState] = useState<WorkspaceState>(initialState);
  const [reload, setReload] = useState(0);
  const requestVersion = useRef(0);
  const ownerRef = useRef<string | null>(null);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const database = supabase;
    let disposed = false;
    let receivedAuthEvent = false;
    let resolvedOwner: string | null | undefined;

    function invalidateRequests() {
      ++requestVersion.current;
    }

    function applySession(userId: string | null) {
      if (disposed || resolvedOwner === userId) return;
      resolvedOwner = userId;
      ownerRef.current = userId;
      const request = ++requestVersion.current;
      loadingMoreRef.current = false;
      // Clear private rows before starting a new account's read.
      setState({ ...initialState, ownerId: userId, status: userId ? "loading" : "signed-out" });
      if (!database || !userId) return;

      // Defer authenticated work until after Supabase's auth callback returns.
      void Promise.resolve().then(async () => {
        if (disposed || request !== requestVersion.current) return;
        try {
          const result = await getOwnedWorldThreadDrafts(database, userId);
          if (disposed || request !== requestVersion.current || ownerRef.current !== userId) return;
          setState({ ...initialState, status: "ready", ownerId: userId, ...result });
        } catch {
          if (disposed || request !== requestVersion.current) return;
          setState({ ...initialState, ownerId: userId, status: "error" });
        }
      });
    }

    if (!database) {
      void Promise.resolve().then(() => {
        if (!disposed) setState({ ...initialState, status: "error" });
      });
      return () => { disposed = true; };
    }

    const { data: listener } = database.auth.onAuthStateChange((_event, session) => {
      receivedAuthEvent = true;
      applySession(session?.user?.id ?? null);
    });
    void database.auth.getSession().then(({ data, error }) => {
      if (disposed || receivedAuthEvent) return;
      if (error) {
        setState({ ...initialState, status: "error" });
        return;
      }
      applySession(data.session?.user?.id ?? null);
    }).catch(() => {
      if (!disposed && !receivedAuthEvent) setState({ ...initialState, status: "error" });
    });

    return () => {
      disposed = true;
      invalidateRequests();
      ownerRef.current = null;
      loadingMoreRef.current = false;
      listener.subscription.unsubscribe();
    };
  }, [reload]);

  async function loadMore() {
    const database = supabase;
    const userId = state.ownerId;
    if (!database || !userId || state.status !== "ready" || !state.hasMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    const request = ++requestVersion.current;
    setState((current) => ({ ...current, loadingMore: true, moreError: false }));
    try {
      const result = await getOwnedWorldThreadDrafts(database, userId, { offset: state.drafts.length });
      if (request !== requestVersion.current || ownerRef.current !== userId) return;
      setState((current) => ({
        ...current,
        drafts: [...current.drafts, ...result.drafts.filter((draft) => !current.drafts.some((existing) => existing.id === draft.id))],
        hasMore: result.hasMore,
        loadingMore: false,
      }));
    } catch {
      if (request !== requestVersion.current || ownerRef.current !== userId) return;
      setState((current) => ({ ...current, loadingMore: false, moreError: true }));
    } finally {
      if (request === requestVersion.current) loadingMoreRef.current = false;
    }
  }

  return (
    <main className="min-h-svh bg-zinc-950 pb-[calc(7rem+env(safe-area-inset-bottom))] text-zinc-100 lg:pb-12">
      <header className="border-b border-white/10 px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/feed" className="inline-flex min-h-11 items-center text-lg font-light tracking-[0.24em] text-white hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">NODEINE</Link>
          <DesktopAppNavigation />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
        <div className="max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-violet-300">Create / Your workspace</p>
          <h1 className="mt-3 text-4xl font-light tracking-[-0.04em] text-white sm:text-6xl">Make it yours.</h1>
          <p className="mt-4 max-w-lg text-sm leading-7 text-zinc-400 sm:text-base">A new idea, a new World, or a path still taking shape. Pick up where you left off.</p>
        </div>

        <nav aria-label="Creation tools" className="mt-9 grid gap-3 sm:grid-cols-3">
          {actions.map(({ href, label, description, detail, icon: Icon }) => (
            <Link key={href} href={href} className="group flex min-w-0 flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.045] to-white/[0.015] p-5 hover:border-violet-300/35 hover:bg-violet-300/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:min-h-52 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <Icon className="size-5 text-violet-300" aria-hidden="true" />
                <ArrowRight className="size-4 text-zinc-600 group-hover:text-violet-200" aria-hidden="true" />
              </div>
              <span className="mt-5 text-lg font-medium text-white">{label}</span>
              <span className="mt-1 text-sm leading-6 text-zinc-400">{description}</span>
              <span className="mt-4 font-mono text-[9px] uppercase tracking-[0.12em] text-zinc-500">{detail}</span>
            </Link>
          ))}
        </nav>

        <section aria-labelledby="your-work-heading" className="mt-12 border-t border-white/10 pt-8 sm:mt-16">
          <div className="flex items-center justify-between gap-4">
            <h2 id="your-work-heading" className="text-2xl font-light tracking-tight text-white">Your work</h2>
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-zinc-400"><LockKeyhole className="size-3" aria-hidden="true" /> Private drafts</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Saved Thread drafts, ready to resume. Forge projects are not saved here yet.</p>

          {state.status === "loading" && <p role="status" className="py-10 text-sm text-zinc-400">Finding your saved drafts…</p>}

          {state.status === "signed-out" && (
            <div className="mt-6 rounded-2xl border border-white/10 px-5 py-8 sm:px-7">
              <h3 className="text-lg text-white">Your next chapter is waiting.</h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-400">Sign in to see your private Thread drafts. Only their owner can reopen and edit them.</p>
              <Link href="/admin" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-violet-200 px-5 text-sm font-semibold text-zinc-950 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Sign in to resume <ArrowRight className="size-4" aria-hidden="true" /></Link>
            </div>
          )}

          {state.status === "error" && (
            <div role="alert" className="mt-6 rounded-2xl border border-rose-300/20 px-5 py-7">
              <h3 className="text-base text-white">Your drafts could not be loaded.</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">This does not change your saved work. Check your connection and try again.</p>
              <button type="button" onClick={() => setReload((value) => value + 1)} className="mt-4 inline-flex min-h-11 items-center rounded-full border border-white/15 px-5 text-sm text-white hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Try again</button>
            </div>
          )}

          {state.status === "ready" && state.drafts.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-white/15 px-5 py-9 sm:px-7">
              <FilePenLine className="size-6 text-violet-300" aria-hidden="true" />
              <h3 className="mt-4 text-lg text-white">Nothing unfinished. Room for something new.</h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-400">Start a Thread with at least two saved pieces, then save it as a private draft. It will be waiting here.</p>
              <Link href="/threads/new" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-violet-300/30 px-5 text-sm text-violet-200 hover:bg-violet-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"><Plus className="size-4" aria-hidden="true" /> Start a Thread</Link>
            </div>
          )}

          {state.status === "ready" && state.drafts.length > 0 && (
            <>
              <ul className="mt-6 divide-y divide-white/10 border-y border-white/10">
                {state.drafts.map((draft) => (
                  <li key={draft.id}>
                    <Link href={`/threads/${encodeURIComponent(draft.slug)}/edit`} prefetch={false} className="group flex min-h-28 items-center justify-between gap-4 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] text-zinc-500"><time dateTime={draft.updatedAt}>{updatedDate(draft.updatedAt)}</time></p>
                        <h3 className="mt-2 break-words text-base font-medium text-white group-hover:text-violet-200">{draft.title}</h3>
                        {draft.summary && <p className="mt-1 line-clamp-2 break-words text-sm leading-6 text-zinc-400">{draft.summary}</p>}
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-2 text-xs text-violet-200">Resume <ArrowRight className="size-4" aria-hidden="true" /></span>
                    </Link>
                  </li>
                ))}
              </ul>
              {state.moreError && <p role="alert" className="mt-4 text-sm text-rose-200">Older drafts could not be loaded. Your current list is still here; try again below.</p>}
              {state.hasMore && <button type="button" disabled={state.loadingMore} onClick={() => void loadMore()} className="mt-6 inline-flex min-h-11 items-center rounded-full border border-white/15 px-5 text-sm text-zinc-200 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-50">{state.loadingMore ? "Loading older drafts…" : state.moreError ? "Try older drafts again" : "Load older drafts"}</button>}
            </>
          )}
        </section>
      </div>
      <MobileAppNavigation />
    </main>
  );
}
