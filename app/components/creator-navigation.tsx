"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Archive,
  Bell,
  Bookmark,
  ChevronDown,
  ExternalLink,
  Layers3,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  UserRound,
  Waypoints,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase-browser";
import PolishedImage from "./polished-image";
import MobileAppNavigation from "./mobile-app-navigation";
import {
  formatActivityCount,
  useUnreadActivityCount,
} from "./use-activity-count";

type ViewerProfile = {
  username: string;
  display_name: string;
  avatar_url: string | null;
};

type CreatorNavigationProps = {
  hidden?: boolean;
  onBrowseWorlds: () => void;
  onGoHome: () => void;
};

export default function CreatorNavigation({
  hidden = false,
  onBrowseWorlds,
  onGoHome,
}: CreatorNavigationProps) {
  const [authReady, setAuthReady] = useState(!supabase);
  const [signedIn, setSignedIn] = useState(false);
  const [profile, setProfile] = useState<ViewerProfile | null>(null);
  const unreadActivityCount = useUnreadActivityCount();

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const database = client;

    let cancelled = false;

    async function syncViewer(userId: string | null) {
      if (!userId) {
        if (!cancelled) {
          setSignedIn(false);
          setProfile(null);
          setAuthReady(true);
        }
        return;
      }

      setSignedIn(true);

      const { data } = await database
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (!cancelled) {
        setProfile((data as ViewerProfile | null) ?? null);
        setAuthReady(true);
      }
    }

    database.auth.getUser().then(({ data }) => {
      syncViewer(data.user?.id ?? null);
    });

    const { data: authListener } = database.auth.onAuthStateChange(
      (_event, session) => {
        syncViewer(session?.user.id ?? null);
      }
    );

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (hidden) return null;

  const profileHref = profile ? `/creator/${profile.username}` : "/admin";
  const creatorName = profile?.display_name ?? "Creator profile";
  const creatorInitial = creatorName.charAt(0).toUpperCase() || "N";

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut({ scope: "local" });
  }

  const creatorAvatar = (
    <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-cyan-300/15 bg-cyan-300/8 text-xs font-semibold text-cyan-200">
      {profile?.avatar_url ? (
        <PolishedImage
          src={profile.avatar_url}
          alt=""
          wrapperClassName="size-full"
          className="size-full object-cover"
        />
      ) : signedIn ? (
        creatorInitial
      ) : (
        <UserRound className="size-4" />
      )}
    </span>
  );

  return (
    <>
      <nav
        aria-label="Creator controls"
        className="relative z-20 hidden w-full items-center justify-end gap-2 lg:flex"
      >
        <Button
          render={<Link href="/discover" />}
          nativeButton={false}
          variant="ghost"
          className="h-10 px-3 text-zinc-400 hover:text-white"
        >
          <Search data-icon="inline-start" />
          Discover
        </Button>

        <Button
          render={<Link href="/threads" />}
          nativeButton={false}
          variant="ghost"
          className="h-10 px-3 text-zinc-400 hover:text-white"
        >
          <Waypoints data-icon="inline-start" />
          Threads
        </Button>

        <Button
          render={<Link href="/messages" />}
          nativeButton={false}
          variant="ghost"
          className="h-10 px-3 text-zinc-400 hover:text-white"
        >
          <MessageCircle data-icon="inline-start" />
          Inbox
        </Button>

        <Button
          render={<Link href="/activity" />}
          nativeButton={false}
          variant="ghost"
          className="h-10 px-3 text-zinc-400 hover:text-white"
        >
          <span className="relative" data-icon="inline-start">
            <Bell className="size-4" />
            {unreadActivityCount > 0 && (
              <span className="absolute -right-3 -top-2 inline-flex min-w-4 items-center justify-center rounded-full bg-rose-400 px-1 font-mono text-[8px] leading-4 text-zinc-950">
                {formatActivityCount(unreadActivityCount)}
              </span>
            )}
          </span>
          Activity
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={onBrowseWorlds}
          className="h-10 px-3 text-zinc-400 hover:text-white"
        >
          <Layers3 data-icon="inline-start" />
          Worlds
        </Button>

        <Button
          render={<Link href="/admin" />}
          nativeButton={false}
          variant="outline"
          className="h-10 border-white/12 bg-black/30 px-3 text-zinc-200"
        >
          <Plus data-icon="inline-start" />
          {signedIn ? "Creator Studio" : "Creator access"}
        </Button>

        {authReady && signedIn ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  className="h-10 border-white/12 bg-black/30 pl-1 pr-2"
                  aria-label={`${creatorName} creator menu`}
                />
              }
            >
              {creatorAvatar}
              <ChevronDown className="size-3.5 text-zinc-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 border border-white/10 bg-zinc-950/95 p-2 shadow-2xl shadow-black/50"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-2 py-2">
                  <span className="block truncate text-sm font-medium text-zinc-100">
                    {creatorName}
                  </span>
                  <span className="mt-0.5 block truncate font-normal text-zinc-500">
                    @{profile?.username ?? "profile-pending"}
                  </span>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={<Link href="/admin" />}
                className="px-2 py-2"
              >
                <Sparkles />
                Open Creator Studio
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<Link href={profileHref} />}
                className="px-2 py-2"
              >
                <ExternalLink />
                View public profile
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<Link href="/discover" />}
                className="px-2 py-2"
              >
                <Search />
                Discover artwork
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<Link href="/threads" />}
                className="px-2 py-2"
              >
                <Waypoints />
                World Threads
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<Link href="/messages" />}
                className="px-2 py-2"
              >
                <MessageCircle />
                Open inbox
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<Link href="/activity" />}
                className="px-2 py-2"
              >
                <Bell />
                Activity center
                {unreadActivityCount > 0 && (
                  <span className="ml-auto rounded-full bg-rose-400 px-1.5 py-0.5 font-mono text-[9px] text-zinc-950">
                    {formatActivityCount(unreadActivityCount)}
                  </span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<Link href="/saved" />}
                className="px-2 py-2"
              >
                <Bookmark />
                Saved artwork
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onGoHome}
                className="px-2 py-2"
              >
                <Archive />
                Archive home
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={handleSignOut}
                className="px-2 py-2"
              >
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            render={<Link href="/admin" />}
            nativeButton={false}
            variant="ghost"
            size="icon-lg"
            aria-label="Open creator access"
            className="text-zinc-400"
          >
            {creatorAvatar}
          </Button>
        )}
      </nav>

      <MobileAppNavigation onHome={onGoHome} profileHref={profileHref} />
    </>
  );
}
