import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Archive, Search, Waypoints } from "lucide-react";
import { getPublicFeedInventory } from "@/lib/content-read-model";
import MobileAppNavigation from "@/app/components/mobile-app-navigation";
import SectionHeader from "@/app/components/section-header";
import PolishedImage from "@/app/components/polished-image";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Explore — NODEINE", description: "Find artwork, enter visual Worlds, and follow connected stories." };

const destinations = [
  { href: "/discover", title: "Find artwork", label: "Search & filter", detail: "Search by World, mood, medium, or a spark of an idea.", icon: Search },
  { href: "/", title: "Enter the archive", label: "Worlds & collections", detail: "See the complete collections and the artists behind them.", icon: Archive },
  { href: "/threads", title: "Follow a Thread", label: "Connected stories", detail: "Discover why one piece leads to the next. Every maker stays credited.", icon: Waypoints },
];

export default async function ExplorePage() {
  let inventory: Awaited<ReturnType<typeof getPublicFeedInventory>> = [];
  try { inventory = await getPublicFeedInventory(); } catch { /* Destinations remain available when previews cannot load. */ }
  const seen = new Set<string>();
  const worlds = inventory.filter((item) => {
    if (item.mediaType !== "image" || seen.has(item.collection.id)) return false;
    seen.add(item.collection.id);
    return true;
  }).slice(0, 4);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <SectionHeader />
      <div className="mx-auto max-w-6xl px-5 pb-14 pt-10 sm:px-8 sm:pt-16">
        <p className="font-mono text-[10px] uppercase tracking-[.26em] text-cyan-200">Explore / The wider picture</p>
        <h1 className="mt-4 max-w-2xl text-5xl font-light leading-[1.05] tracking-[-.045em] sm:text-7xl">Find your next<br /><span className="text-zinc-500">obsession.</span></h1>
        <p className="mt-5 max-w-lg text-sm leading-7 text-zinc-400 sm:text-base">A piece catches your eye. A World pulls you in. Choose where to wander.</p>

        <nav aria-label="Explore destinations" className="mt-9 divide-y divide-white/10 border-y border-white/10 lg:grid lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {destinations.map(({ icon: Icon, ...item }) => (
            <Link key={item.href} href={item.href} className="group flex min-h-28 items-start gap-4 px-1 py-6 outline-none transition-colors hover:bg-white/[.025] focus-visible:ring-2 focus-visible:ring-cyan-300 lg:px-5">
              <Icon className="mt-1 size-5 shrink-0 text-cyan-200/80" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[9px] uppercase tracking-[.18em] text-zinc-500">{item.label}</p>
                <h2 className="mt-1.5 text-lg font-medium text-white">{item.title}</h2>
                <p className="mt-2 text-xs leading-6 text-zinc-400">{item.detail}</p>
              </div>
              <ArrowUpRight className="size-4 shrink-0 text-zinc-500 group-hover:text-cyan-200" aria-hidden="true" />
            </Link>
          ))}
        </nav>

        {worlds.length > 0 && (
          <section className="mt-12" aria-labelledby="worlds-heading">
            <div className="mb-5 flex items-baseline justify-between gap-4">
              <h2 id="worlds-heading" className="text-xl font-light tracking-tight">A few doors into the archive</h2>
              <span className="hidden font-mono text-[10px] uppercase tracking-widest text-zinc-600 sm:block">Worlds, not just posts</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
              {worlds.map((item) => (
                <Link key={item.collection.id} href={`/worlds/${item.collection.id}`} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[.015] outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                  <PolishedImage src={item.thumbSrc || item.src} alt={item.title} loading="lazy" wrapperClassName="aspect-[3/4] overflow-hidden" className="size-full object-cover transition duration-300 group-hover:scale-[1.02] motion-reduce:transform-none" />
                  <div className="px-3 py-4"><p className="text-sm text-white">{item.collection.title}</p><p className="mt-1 truncate text-[10px] text-zinc-500">{item.creator ? `By ${item.creator.displayName}` : "From the public archive"}</p></div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
      <MobileAppNavigation />
    </main>
  );
}
