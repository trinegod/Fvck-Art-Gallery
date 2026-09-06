import MobileAppNavigation from "@/app/components/mobile-app-navigation";
import SectionHeader from "@/app/components/section-header";

export default function Loading() {
  return <main className="min-h-screen bg-zinc-950 text-zinc-100"><SectionHeader /><div role="status" className="mx-auto max-w-6xl px-5 py-20 text-zinc-400">Opening Explore…</div><MobileAppNavigation /></main>;
}
