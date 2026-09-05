"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive, Bell, Bookmark, FlaskConical, Home,
  MessageCircle, Plus, Search, SquarePen, UserRound, Waypoints,
} from "lucide-react";
import { supabase } from "@/lib/supabase-browser";
import {
  mobileDestinationForPath, mobileGroupForPath, mobileNavigationGroups,
  type MobileDestinationId,
} from "@/lib/mobile-navigation";
import { formatActivityCount, useUnreadActivityCount } from "./use-activity-count";

type MobileAppNavigationProps = {
  hidden?: boolean;
  onHome?: () => void;
  profileHref?: string;
};

const icons = {
  archive: Archive, discover: Search, threads: Waypoints, forge: FlaskConical,
  publish: Plus, "new-thread": SquarePen, saved: Bookmark, messages: MessageCircle,
  activity: Bell, profile: UserRound,
} satisfies Record<MobileDestinationId, typeof Home>;

const destinationClassName =
  "nodeine-action relative flex min-h-14 min-w-11 flex-1 flex-col items-center justify-center gap-1.5 rounded-xl px-1 text-[10px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300";

function destinationState(active: boolean) {
  return active
    ? "bg-cyan-300/10 text-cyan-200"
    : "text-zinc-400 hover:bg-white/5 hover:text-white";
}

export default function MobileAppNavigation({
  hidden = false, onHome, profileHref: suppliedProfileHref,
}: MobileAppNavigationProps) {
  const pathname = usePathname();
  const unreadActivityCount = useUnreadActivityCount();
  const [resolvedProfileHref, setResolvedProfileHref] = useState("/admin");

  useEffect(() => {
    if (suppliedProfileHref || !supabase) return;
    const client = supabase;
    let cancelled = false;
    let requestVersion = 0;

    async function syncProfile(userId: string | null) {
      const version = ++requestVersion;
      if (!userId) {
        if (!cancelled) setResolvedProfileHref("/admin");
        return;
      }
      const { data } = await client.from("profiles").select("username").eq("id", userId).maybeSingle();
      if (!cancelled && version === requestVersion) {
        setResolvedProfileHref(data?.username ? "/creator/" + data.username : "/admin");
      }
    }

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      // Do not await database work inside the auth callback's lock.
      void syncProfile(session?.user.id ?? null);
    });
    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, [suppliedProfileHref]);

  if (hidden) return null;

  // A route change resets the dock to that destination's section, including Back/Forward.
  return (
    <MobileNavigationDock
      key={pathname}
      pathname={pathname}
      onHome={onHome}
      profileHref={suppliedProfileHref ?? resolvedProfileHref}
      unreadActivityCount={unreadActivityCount}
    />
  );
}

function MobileNavigationDock({
  pathname, onHome, profileHref, unreadActivityCount,
}: {
  pathname: string;
  onHome?: () => void;
  profileHref: string;
  unreadActivityCount: number;
}) {
  const id = useId();
  const [selectedGroup, setSelectedGroup] = useState(() => mobileGroupForPath(pathname));
  const selectedGroupRef = useRef(selectedGroup);
  const railRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeDestination = mobileDestinationForPath(pathname);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    // Align on entry and rotation without moving the surrounding document.
    const align = () => {
      if (rail.clientWidth) {
        rail.scrollTo({ left: selectedGroupRef.current * rail.clientWidth, behavior: "instant" });
      }
    };
    align();
    const observer = new ResizeObserver(align);
    observer.observe(rail);
    return () => observer.disconnect();
  }, []);

  function selectGroup(index: number, focus = false) {
    selectedGroupRef.current = index;
    setSelectedGroup(index);
    const rail = railRef.current;
    rail?.scrollTo({ left: index * rail.clientWidth, behavior: "instant" });
    if (focus) sectionRefs.current[index]?.focus({ preventScroll: true });
  }

  function syncScrolledGroup() {
    const rail = railRef.current;
    if (!rail?.clientWidth) return;
    const index = Math.max(0, Math.min(
      mobileNavigationGroups.length - 1,
      Math.round(rail.scrollLeft / rail.clientWidth)
    ));
    if (index === selectedGroupRef.current) return;
    // Never strand keyboard focus in a panel about to become inert.
    const focusedInRail = rail.contains(document.activeElement);
    selectedGroupRef.current = index;
    setSelectedGroup(index);
    if (focusedInRail) sectionRefs.current[index]?.focus({ preventScroll: true });
  }

  return (
    <nav
      aria-label="Primary app navigation"
      data-section={mobileNavigationGroups[selectedGroup].id}
      className="nodeine-mobile-navigation fixed inset-x-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-xl items-stretch gap-2 rounded-[1.35rem] border border-white/12 bg-zinc-950/95 p-1.5 shadow-[0_18px_60px_rgba(0,0,0,.75)] backdrop-blur-2xl lg:hidden"
    >
      <Link
        href="/feed"
        aria-current={activeDestination === "feed" ? "page" : undefined}
        className={[destinationClassName, "nodeine-nav-feed !min-w-14 !flex-none", destinationState(activeDestination === "feed")].join(" ")}
      >
        <Home className="size-5" aria-hidden="true" />
        Feed
      </Link>

      <div className="min-w-0 flex-1 border-l border-white/10 pl-2">
        <div className="flex items-center">
          <div role="tablist" aria-label="Navigation sections" aria-describedby={id + "-hint"} className="grid min-w-0 flex-1 grid-cols-3">
            {mobileNavigationGroups.map((group, index) => (
              <button
                key={group.id}
                ref={(element) => { sectionRefs.current[index] = element; }}
                type="button"
                role="tab"
                id={id + "-" + group.id + "-tab"}
                aria-controls={id + "-" + group.id + "-panel"}
                aria-selected={selectedGroup === index}
                tabIndex={selectedGroup === index ? 0 : -1}
                onClick={() => selectGroup(index)}
                onKeyDown={(event) => {
                  let target: number;
                  switch (event.key) {
                    case "ArrowRight": target = (index + 1) % mobileNavigationGroups.length; break;
                    case "ArrowLeft": target = (index + mobileNavigationGroups.length - 1) % mobileNavigationGroups.length; break;
                    case "Home": target = 0; break;
                    case "End": target = mobileNavigationGroups.length - 1; break;
                    default: return;
                  }
                  event.preventDefault();
                  selectGroup(target, true);
                }}
                className="nodeine-action nodeine-nav-section relative min-h-11 min-w-11 flex-1 rounded-lg px-1 text-xs font-medium text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300"
              >
                {group.label}
                {group.id === "you" && unreadActivityCount > 0 && (
                  <>
                    <span aria-hidden="true" className="absolute right-1 top-2 size-1.5 rounded-full bg-rose-400" />
                    <span className="sr-only">, {unreadActivityCount} unread notifications</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
        <p id={id + "-hint"} className="sr-only">Swipe sideways or choose a section to see its destinations. Feed stays available.</p>
        <div ref={railRef} onScroll={syncScrolledGroup} className="nodeine-nav-rail flex overflow-x-auto overscroll-x-contain">
          {mobileNavigationGroups.map((group, index) => (
            <div
              key={group.id}
              role="tabpanel"
              id={id + "-" + group.id + "-panel"}
              aria-labelledby={id + "-" + group.id + "-tab"}
              aria-hidden={selectedGroup !== index}
              inert={selectedGroup !== index}
              className="flex w-full shrink-0 snap-start snap-always gap-0.5 py-1"
            >
              {group.destinations.map((destination) => {
                const Icon = icons[destination.id];
                const active = activeDestination === destination.id;
                const href = destination.id === "profile" ? profileHref : destination.href;
                const current = active ? (pathname === href ? "page" : "location") : undefined;
                const className = [destinationClassName, "nodeine-nav-destination", destinationState(active)].join(" ");
                const content = (
                  <>
                    <span className="nodeine-nav-icon relative grid size-7 place-items-center rounded-lg">
                      <Icon className="size-[18px]" aria-hidden="true" />
                      {destination.id === "activity" && unreadActivityCount > 0 && (
                        <span className="absolute -right-3 -top-2 inline-flex min-w-4 items-center justify-center rounded-full bg-rose-400 px-1 font-mono text-[8px] leading-4 text-zinc-950">
                          <span className="sr-only">Unread notifications: </span>
                          {formatActivityCount(unreadActivityCount)}
                        </span>
                      )}
                    </span>
                    <span className="whitespace-nowrap">{destination.label}</span>
                  </>
                );
                return destination.id === "archive" && onHome ? (
                  <button key={destination.id} type="button" onClick={onHome} aria-current={current} className={className} data-active={active}>{content}</button>
                ) : (
                  <Link key={destination.id} href={href} aria-current={current} prefetch={selectedGroup === index ? undefined : false} className={className} data-active={active}>{content}</Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
