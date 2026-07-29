"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, Plus, Search, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase-browser";

type MobileAppNavigationProps = {
  hidden?: boolean;
  onHome?: () => void;
  profileHref?: string;
};

const itemClassName =
  "nodeine-action flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

export default function MobileAppNavigation({
  hidden = false,
  onHome,
  profileHref: suppliedProfileHref,
}: MobileAppNavigationProps) {
  const pathname = usePathname();
  const [resolvedProfileHref, setResolvedProfileHref] = useState(
    suppliedProfileHref ?? "/admin"
  );

  useEffect(() => {
    if (suppliedProfileHref || !supabase) return;
    const client = supabase;
    let cancelled = false;

    async function syncProfile(userId: string | null) {
      if (!userId) {
        if (!cancelled) setResolvedProfileHref("/admin");
        return;
      }

      const { data } = await client
        .from("profiles")
        .select("username")
        .eq("id", userId)
        .maybeSingle();

      if (!cancelled) {
        setResolvedProfileHref(
          data?.username ? `/creator/${data.username}` : "/admin"
        );
      }
    }

    client.auth.getUser().then(({ data }) => {
      syncProfile(data.user?.id ?? null);
    });

    const { data: authListener } = client.auth.onAuthStateChange(
      (_event, session) => syncProfile(session?.user.id ?? null)
    );

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, [suppliedProfileHref]);

  if (hidden) return null;

  function itemState(active: boolean) {
    return active
      ? "bg-cyan-300/10 text-cyan-200"
      : "text-zinc-400 hover:bg-white/5 hover:text-white";
  }

  const homeActive = pathname === "/";
  const discoverActive = pathname.startsWith("/discover");
  const publishActive = pathname.startsWith("/admin");
  const messagesActive = pathname.startsWith("/messages");
  const profileActive = pathname.startsWith("/creator");
  const profileHref = suppliedProfileHref ?? resolvedProfileHref;

  return (
    <nav
      aria-label="Primary app navigation"
      className="fixed inset-x-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-40 grid grid-cols-5 rounded-[1.35rem] border border-white/12 bg-zinc-950/88 p-1.5 shadow-[0_18px_60px_rgba(0,0,0,.75)] backdrop-blur-2xl lg:hidden"
      style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}
    >
      {onHome ? (
        <button
          type="button"
          onClick={onHome}
          aria-current={homeActive ? "page" : undefined}
          className={`${itemClassName} ${itemState(homeActive)}`}
        >
          <Home className="size-4" aria-hidden="true" />
          Home
        </button>
      ) : (
        <Link
          href="/"
          aria-current={homeActive ? "page" : undefined}
          className={`${itemClassName} ${itemState(homeActive)}`}
        >
          <Home className="size-4" aria-hidden="true" />
          Home
        </Link>
      )}

      <Link
        href="/discover"
        aria-current={discoverActive ? "page" : undefined}
        className={`${itemClassName} ${itemState(discoverActive)}`}
      >
        <Search className="size-4" aria-hidden="true" />
        Discover
      </Link>

      <Link
        href="/admin"
        aria-current={publishActive ? "page" : undefined}
        className={`${itemClassName} font-semibold ${
          publishActive ? "bg-cyan-300/10 text-cyan-200" : "text-cyan-200"
        }`}
      >
        <span className="grid size-8 place-items-center rounded-xl bg-cyan-300 text-zinc-950 shadow-[0_0_18px_rgba(103,232,249,.25)]">
          <Plus className="size-4" aria-hidden="true" />
        </span>
        Publish
      </Link>

      <Link
        href="/messages"
        aria-current={messagesActive ? "page" : undefined}
        className={`${itemClassName} ${itemState(messagesActive)}`}
      >
        <MessageCircle
          className="size-4"
          fill={messagesActive ? "currentColor" : "none"}
          aria-hidden="true"
        />
        Inbox
      </Link>

      <Link
        href={profileHref}
        aria-current={profileActive ? "page" : undefined}
        className={`${itemClassName} ${itemState(profileActive)}`}
      >
        <UserRound className="size-4" aria-hidden="true" />
        Profile
      </Link>
    </nav>
  );
}
