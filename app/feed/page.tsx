import type { Metadata } from "next";
import { getPublicFeedInventory } from "@/lib/content-read-model";
import { isFeedMode } from "@/lib/feed";
import FeedView from "./feed-view";

type FeedPageProps = {
  searchParams: Promise<{
    mode?: string | string[];
    signal?: string | string[];
  }>;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Feed — NODEINE",
  description:
    "Follow visual signals across artwork, Worlds, and connected Chronicles on NODEINE.",
};

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const query = await searchParams;
  const requestedMode = Array.isArray(query.mode) ? query.mode[0] : query.mode;
  const requestedSignal = Array.isArray(query.signal)
    ? query.signal[0]
    : query.signal;
  const initialMode = isFeedMode(requestedMode) ? requestedMode : "for-you";
  const initialArtworkId =
    requestedSignal && uuidPattern.test(requestedSignal)
      ? requestedSignal.toLowerCase()
      : null;
  const inventory = await getPublicFeedInventory();

  return (
    <FeedView
      inventory={inventory}
      initialMode={initialMode}
      initialArtworkId={initialArtworkId}
    />
  );
}
