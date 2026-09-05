export const mobileNavigationGroups = [
  { id: "explore", label: "Explore", destinations: [
    { id: "discover", label: "Discover", href: "/discover" },
    { id: "archive", label: "Archive", href: "/" },
    { id: "threads", label: "Threads", href: "/threads" },
  ] },
  { id: "create", label: "Create", destinations: [
    { id: "forge", label: "Forge", href: "/forge" },
    { id: "publish", label: "Publish", href: "/admin" },
    { id: "new-thread", label: "New Thread", href: "/threads/new" },
  ] },
  { id: "you", label: "You", destinations: [
    { id: "saved", label: "Saved", href: "/saved" },
    { id: "messages", label: "Inbox", href: "/messages" },
    { id: "activity", label: "Activity", href: "/activity" },
    { id: "profile", label: "Profile", href: "/admin" },
  ] },
] as const;

export type MobileDestinationId =
  (typeof mobileNavigationGroups)[number]["destinations"][number]["id"];

function within(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

// Match route segments, not prefixes. Profile's fallback must not activate Publish twice.
export function mobileDestinationForPath(pathname: string): MobileDestinationId | "feed" | null {
  if (within(pathname, "/feed")) return "feed";
  if (within(pathname, "/threads/new")) return "new-thread";
  if (within(pathname, "/creator")) return "profile";
  if (pathname === "/" || within(pathname, "/worlds")) return "archive";
  for (const group of mobileNavigationGroups) {
    for (const destination of group.destinations) {
      if (destination.id === "profile" || destination.href === "/") continue;
      if (within(pathname, destination.href)) return destination.id;
    }
  }
  return null;
}

export function mobileGroupForPath(pathname: string): number {
  const destination = mobileDestinationForPath(pathname);
  return Math.max(0, mobileNavigationGroups.findIndex((group) =>
    group.destinations.some((item) => item.id === destination)
  ));
}
