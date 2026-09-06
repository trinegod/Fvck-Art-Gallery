"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Home, Plus, UserRound } from "lucide-react";
import { appNavigationItems, appSectionForPath } from "@/lib/mobile-navigation";
import { useUnreadActivityCount } from "./use-activity-count";

type MobileAppNavigationProps = {
  hidden?: boolean;
  // Retained for existing archive/profile callers; section links now have stable homes.
  onHome?: () => void;
  profileHref?: string;
};

const icons = { feed: Home, explore: Compass, create: Plus, you: UserRound };

export default function MobileAppNavigation({ hidden = false }: MobileAppNavigationProps) {
  const pathname = usePathname();
  const unreadCount = useUnreadActivityCount();
  if (hidden) return null;
  const section = appSectionForPath(pathname);

  return (
    <nav
      aria-label="Primary app navigation"
      data-section={section}
      className="nodeine-mobile-navigation fixed inset-x-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-40 mx-auto grid max-w-sm grid-cols-4 gap-1 rounded-[1.35rem] border border-white/12 bg-zinc-950/95 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,.55)] backdrop-blur-2xl lg:hidden"
    >
      {appNavigationItems.map((item) => {
        const Icon = icons[item.id];
        const active = item.id === section;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? (pathname === item.href ? "page" : "location") : undefined}
            className="nodeine-action nodeine-nav-primary relative flex min-h-14 min-w-11 flex-col items-center justify-center gap-1 rounded-[.95rem] px-1 text-[11px] font-medium text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300"
          >
            <span className="relative">
              <Icon className="size-5" strokeWidth={active ? 1.9 : 1.6} aria-hidden="true" />
              {item.id === "you" && unreadCount > 0 && (
                <span className="absolute -right-1 -top-0.5 size-1.5 rounded-full bg-rose-400 ring-2 ring-zinc-950" aria-hidden="true" />
              )}
            </span>
            {item.label}
            {item.id === "you" && unreadCount > 0 && <span className="sr-only">, {unreadCount} unread notifications</span>}
          </Link>
        );
      })}
    </nav>
  );
}
