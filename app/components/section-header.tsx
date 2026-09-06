import Link from "next/link";
import DesktopAppNavigation from "./desktop-app-navigation";

export default function SectionHeader() {
  return (
    <header className="border-b border-white/10 px-5 py-4 sm:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link href="/feed" className="inline-flex min-h-11 items-center text-base font-light tracking-[.24em] text-white outline-none hover:text-cyan-200 focus-visible:ring-2 focus-visible:ring-cyan-300">NODEINE</Link>
        <DesktopAppNavigation />
      </div>
    </header>
  );
}
