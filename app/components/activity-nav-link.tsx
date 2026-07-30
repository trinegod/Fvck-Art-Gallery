"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import {
  formatActivityCount,
  useUnreadActivityCount,
} from "./use-activity-count";

type ActivityNavLinkProps = {
  className?: string;
  showIcon?: boolean;
};

export default function ActivityNavLink({
  className = "text-zinc-400 hover:text-white",
  showIcon = false,
}: ActivityNavLinkProps) {
  const unreadCount = useUnreadActivityCount();

  return (
    <Link href="/activity" className={`inline-flex items-center gap-1.5 ${className}`}>
      {showIcon && <Bell className="size-3.5" aria-hidden="true" />}
      <span>Activity</span>
      {unreadCount > 0 && (
        <span
          aria-label={`${unreadCount} unread notifications`}
          className="inline-flex min-w-4 items-center justify-center rounded-full bg-rose-400 px-1 py-0.5 font-mono text-[9px] leading-none tracking-normal text-zinc-950"
        >
          {formatActivityCount(unreadCount)}
        </span>
      )}
    </Link>
  );
}
