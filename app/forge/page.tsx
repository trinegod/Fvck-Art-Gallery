import type { Metadata } from "next";
import ForgeLab from "./forge-lab";

type ForgePageProps = {
  searchParams: Promise<{ artwork?: string | string[] }>;
};

export const metadata: Metadata = {
  title: "Forge Lab — NODEINE",
  description:
    "Measure the visual DNA of your NODEINE artwork and translate it into an explainable creation recipe.",
};

export default async function ForgePage({ searchParams }: ForgePageProps) {
  const query = await searchParams;
  const requestedArtwork = Array.isArray(query.artwork)
    ? query.artwork[0]
    : query.artwork;
  return <ForgeLab initialArtworkId={requestedArtwork} />;
}
