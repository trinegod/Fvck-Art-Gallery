"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bell, Bookmark, MessageCircle, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase-browser";
import MobileAppNavigation from "@/app/components/mobile-app-navigation";
import SectionHeader from "@/app/components/section-header";
import { formatActivityCount, useUnreadActivityCount } from "@/app/components/use-activity-count";

type Profile = { username: string; display_name: string };

export default function YourSpace() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(Boolean(supabase));
  const unreadCount = useUnreadActivityCount();

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let cancelled = false;
    let request = 0;
    let authEvent = 0;

    async function syncViewer(userId: string | null) {
      if (!client) return;
      const version = ++request;
      if (cancelled) return;
      setProfile(null);
      setSignedIn(Boolean(userId));
      setLoading(Boolean(userId));
      if (!userId) return;
      try {
        const { data, error } = await client.from("profiles").select("username, display_name").eq("id", userId).maybeSingle();
        if (cancelled || request !== version) return;
        setProfile(error ? null : data as Profile | null);
      } catch {
        if (!cancelled && request === version) setProfile(null);
      } finally {
        if (!cancelled && request === version) setLoading(false);
      }
    }

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      authEvent++;
      void syncViewer(session?.user.id ?? null);
    });
    const initialEvent = authEvent;
    void client.auth.getUser().then(({ data }) => {
      if (!cancelled && initialEvent === authEvent) void syncViewer(data.user?.id ?? null);
    }).catch(() => {
      if (!cancelled && initialEvent === authEvent) void syncViewer(null);
    });
    return () => { cancelled = true; request++; listener.subscription.unsubscribe(); };
  }, []);

  const destinations = [
    { href: "/saved", title: "Saved", caption: "Keep what moves you.", detail: "Your private collection of artwork worth returning to.", icon: Bookmark },
    { href: "/messages", title: "Inbox", caption: "Keep the conversation going.", detail: "Direct messages, group chats, and the artwork you share.", icon: MessageCircle },
    { href: "/activity", title: "Activity", caption: "See what reached you.", detail: "Follows, reactions, comments, and conversation updates.", icon: Bell },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <SectionHeader />
      <div className="mx-auto max-w-6xl px-5 pb-14 pt-10 sm:px-8 sm:pt-16">
        <p className="font-mono text-[10px] uppercase tracking-[.26em] text-zinc-400">You / A space to return to</p>
        <h1 className="mt-4 text-5xl font-light leading-[1.05] tracking-[-.045em] sm:text-7xl">Your corner<br /><span className="text-zinc-500">of the archive.</span></h1>
        <p className="mt-5 max-w-lg text-sm leading-7 text-zinc-400 sm:text-base">The pieces you keep. The people you meet. Everything that makes this place yours.</p>

        <section aria-label="Your account" className="mt-9 grid grid-cols-[48px_minmax(0,1fr)] items-center gap-4 rounded-2xl border border-white/10 bg-[linear-gradient(120deg,rgba(255,255,255,.045),transparent)] p-5 sm:grid-cols-[48px_minmax(0,1fr)_auto]">
          <span className="grid size-12 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[.025]"><UserRound className="size-5 text-zinc-400" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-medium text-white">{loading ? "Opening your space…" : profile?.display_name || (signedIn ? "Your creator account" : "Make yourself at home")}</h2>
            <p className="mt-1 break-words text-xs leading-6 text-zinc-500">{profile?.username ? `@${profile.username}` : signedIn ? "Manage your creator profile in Studio." : "Sign in to keep your saves and conversations together."}</p>
          </div>
          {!loading && <Link href={profile?.username ? `/creator/${encodeURIComponent(profile.username)}` : "/admin"} className="col-start-2 inline-flex min-h-11 items-center justify-self-start gap-2 rounded-xl border border-white/15 px-4 text-xs text-zinc-200 outline-none hover:border-white/30 hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-cyan-300 sm:col-start-auto">{profile?.username ? "View profile" : signedIn ? "Creator Studio" : "Sign in"}<ArrowUpRight className="size-3.5" aria-hidden="true" /></Link>}
        </section>

        <nav aria-label="Your destinations" className="mt-8 divide-y divide-white/10 border-y border-white/10">
          {destinations.map(({ icon: Icon, ...item }) => <Link key={item.href} href={item.href} className="group grid min-h-28 grid-cols-[28px_minmax(0,1fr)_24px] items-center gap-4 px-1 py-6 outline-none transition-colors hover:bg-white/[.025] focus-visible:ring-2 focus-visible:ring-cyan-300 sm:gap-6 sm:px-3"><Icon className="size-5 text-zinc-400" aria-hidden="true" /><div><div className="flex items-center gap-3"><h2 className="text-lg text-white">{item.title}</h2>{item.href === "/activity" && unreadCount > 0 && <span className="rounded-full bg-rose-300/10 px-2 py-1 font-mono text-[10px] text-rose-200">{formatActivityCount(unreadCount)} unread</span>}</div><p className="mt-1 text-sm text-zinc-400">{item.caption}</p><p className="mt-2 hidden text-xs text-zinc-500 sm:block">{item.detail}</p></div><ArrowUpRight className="size-4 text-zinc-600 group-hover:text-white" aria-hidden="true" /></Link>)}
        </nav>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm"><p className="text-zinc-500">Picking up an unfinished Thread?</p><Link href="/create" className="inline-flex min-h-11 items-center gap-2 text-zinc-300 underline decoration-white/20 underline-offset-4 hover:text-white">Open Your work <ArrowUpRight className="size-3.5" aria-hidden="true" /></Link></div>
      </div>
      <MobileAppNavigation />
    </main>
  );
}
