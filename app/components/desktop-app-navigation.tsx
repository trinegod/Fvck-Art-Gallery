"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { appNavigationItems, appSectionForPath } from "@/lib/mobile-navigation";
import { cn } from "@/lib/utils";

export default function DesktopAppNavigation({ className }: { className?: string }) {
  const pathname = usePathname();
  const section = appSectionForPath(pathname);
  return (
    <nav aria-label="App sections" className={cn("hidden items-center gap-1 lg:flex", className)}>
      {appNavigationItems.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          aria-current={section === item.id ? (pathname === item.href ? "page" : "location") : undefined}
          className={cn("nodeine-action inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-medium outline-none hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-300", section === item.id ? "bg-white/[.06] text-cyan-200" : "text-zinc-400")}
        >{item.label}</Link>
      ))}
    </nav>
  );
}
