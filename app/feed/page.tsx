import type { Metadata } from "next";
import { getPublicFeedInventory } from "@/lib/content-read-model";
import FeedView from "./feed-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Feed — NODEINE",
  description:
    "Follow visual signals across artwork, Worlds, and connected Chronicles on NODEINE.",
};

export default async function FeedPage() {
  const inventory = await getPublicFeedInventory();

  return <FeedView inventory={inventory} />;
}
