"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  Bell,
  Bookmark,
  Ellipsis,
  FlaskConical,
  Home,
  MessageCircle,
  Plus,
  Search,
  UserRound,
  Waypoints,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase-browser";
import {
  formatActivityCount,
  useUnreadActivityCount,
} from "./use-activity-count";

type MobileAppNavigationProps = {
  hidden?: boolean;
  onHome?: () => void;
  profileHref?: string;
};

const itemClassName =
  "nodeine-action flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[9px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

export default function MobileAppNavigation({
  hidden = false,
  onHome,
  profileHref: suppliedProfileHref,
}: MobileAppNavigationProps) {
  const pathname = usePathname();
  const unreadActivityCount = useUnreadActivityCount();
  const [moreOpen, setMoreOpen] = useState(false);
  const [resolvedProfileHref, setResolvedProfileHref] = useState(
    suppliedProfileHref ?? "/admin"
  );
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreSheetRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!moreOpen) return;

    const sheet = moreSheetRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusableElements = sheet
      ? Array.from(
          sheet.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        )
      : [];
    window.requestAnimationFrame(() => focusableElements[0]?.focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMoreOpen(false);
        window.requestAnimationFrame(() => moreButtonRef.current?.focus());
        return;
      }

      if (event.key !== "Tab" || !focusableElements.length) return;
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [moreOpen]);

  if (hidden) return null;

  function itemState(active: boolean) {
    return active
      ? "bg-cyan-300/10 text-cyan-200"
      : "text-zinc-400 hover:bg-white/5 hover:text-white";
  }

  const homeActive = pathname.startsWith("/feed");
  const archiveActive = pathname === "/";
  const discoverActive = pathname.startsWith("/discover");
  const threadsActive = pathname.startsWith("/threads");
  const publishActive = pathname.startsWith("/admin");
  const savedActive = pathname.startsWith("/saved");
  const forgeActive = pathname.startsWith("/forge");
  const messagesActive = pathname.startsWith("/messages");
  const activityActive = pathname.startsWith("/activity");
  const profileActive = pathname.startsWith("/creator");
  const moreActive =
    archiveActive ||
    savedActive ||
    forgeActive ||
    messagesActive ||
    activityActive ||
    profileActive;
  const profileHref = suppliedProfileHref ?? resolvedProfileHref;

  function closeMore(restoreFocus = true) {
    setMoreOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => moreButtonRef.current?.focus());
    }
  }

  const moreItemClassName =
    "nodeine-action flex min-h-14 items-center gap-3 rounded-2xl border px-4 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close More menu"
            onClick={() => closeMore()}
            className="absolute inset-0 size-full bg-black/70 backdrop-blur-sm"
          />
          <div
            ref={moreSheetRef}
            id="mobile-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-more-title"
            className="absolute inset-x-0 bottom-0 max-h-[82svh] overflow-y-auto rounded-t-[2rem] border border-b-0 border-white/12 bg-zinc-950 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-24px_80px_rgba(0,0,0,.72)]"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" aria-hidden="true" />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-cyan-300">
                  NODEINE navigation
                </p>
                <h2 id="mobile-more-title" className="mt-1 text-xl font-medium text-white">
                  More
                </h2>
              </div>
              <button
                type="button"
                onClick={() => closeMore()}
                aria-label="Close More menu"
                className="grid size-11 place-items-center rounded-xl border border-white/10 text-zinc-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="More destinations" className="mt-5 grid gap-2 sm:grid-cols-2">
              {onHome ? (
                <button
                  type="button"
                  onClick={() => {
                    closeMore(false);
                    onHome();
                  }}
                  aria-current={archiveActive ? "page" : undefined}
                  className={`${moreItemClassName} ${
                    archiveActive
                      ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                      : "border-white/10 bg-white/[0.025] text-zinc-300 hover:border-white/25 hover:text-white"
                  }`}
                >
                  <Archive className="size-4" aria-hidden="true" />
                  Archive
                </button>
              ) : (
                <MoreLink
                  href="/"
                  label="Archive"
                  active={archiveActive}
                  icon={<Archive />}
                  onNavigate={() => closeMore(false)}
                />
              )}
              <MoreLink
                href="/saved"
                label="Saved"
                active={savedActive}
                icon={<Bookmark />}
                onNavigate={() => closeMore(false)}
              />
              <MoreLink
                href="/forge"
                label="Forge"
                active={forgeActive}
                icon={<FlaskConical />}
                onNavigate={() => closeMore(false)}
              />
              <MoreLink
                href="/messages"
                label="Inbox"
                active={messagesActive}
                icon={<MessageCircle />}
                onNavigate={() => closeMore(false)}
              />
              <MoreLink
                href="/activity"
                label="Activity"
                active={activityActive}
                icon={<Bell fill={activityActive ? "currentColor" : "none"} />}
                badge={unreadActivityCount}
                onNavigate={() => closeMore(false)}
              />
              <MoreLink
                href={profileHref}
                label="Profile"
                active={profileActive}
                icon={<UserRound />}
                onNavigate={() => closeMore(false)}
              />
            </nav>
          </div>
        </div>
      )}

      <nav
        aria-label="Primary app navigation"
        className="fixed inset-x-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-40 grid grid-cols-5 rounded-[1.35rem] border border-white/12 bg-zinc-950/88 p-1.5 shadow-[0_18px_60px_rgba(0,0,0,.75)] backdrop-blur-2xl lg:hidden"
      >
        <Link
          href="/feed"
          aria-current={homeActive ? "page" : undefined}
          className={`${itemClassName} ${itemState(homeActive)}`}
        >
          <Home className="size-4" aria-hidden="true" />
          Feed
        </Link>

        <Link
          href="/discover"
          aria-current={discoverActive ? "page" : undefined}
          className={`${itemClassName} ${itemState(discoverActive)}`}
        >
          <Search className="size-4" aria-hidden="true" />
          Discover
        </Link>

        <Link
          href="/threads"
          aria-current={threadsActive ? "page" : undefined}
          className={`${itemClassName} ${itemState(threadsActive)}`}
        >
          <Waypoints className="size-4" aria-hidden="true" />
          Threads
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

        <button
          ref={moreButtonRef}
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-current={moreActive ? "page" : undefined}
          aria-expanded={moreOpen}
          aria-controls="mobile-more-sheet"
          aria-haspopup="dialog"
          className={`${itemClassName} ${itemState(moreActive || moreOpen)}`}
        >
          <span className="relative">
            <Ellipsis className="size-4" aria-hidden="true" />
            {unreadActivityCount > 0 && (
              <span
                aria-label={`${unreadActivityCount} unread notifications`}
                className="absolute -right-3 -top-2 inline-flex min-w-4 items-center justify-center rounded-full bg-rose-400 px-1 font-mono text-[8px] leading-4 text-zinc-950"
              >
                {formatActivityCount(unreadActivityCount)}
              </span>
            )}
          </span>
          More
        </button>
      </nav>
    </>
  );
}

function MoreLink({
  href,
  label,
  active,
  icon,
  badge = 0,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
  badge?: number;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`nodeine-action flex min-h-14 items-center gap-3 rounded-2xl border px-4 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
        active
          ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
          : "border-white/10 bg-white/[0.025] text-zinc-300 hover:border-white/25 hover:text-white"
      }`}
    >
      <span className="[&>svg]:size-4" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
      {badge > 0 && (
        <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-rose-400 px-1.5 font-mono text-[9px] leading-5 text-zinc-950">
          <span className="sr-only">Unread notifications: </span>
          {formatActivityCount(badge)}
        </span>
      )}
    </Link>
  );
}
