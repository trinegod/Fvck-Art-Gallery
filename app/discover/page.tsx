import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import DiscoverView, { type DiscoverArtwork } from "./discover-view";

type ArtworkRow = {
  id: string;
  collection_id: string;
  title: string;
  src: string;
  thumb_src: string | null;
  mood: string | null;
  tags: string[] | null;
  sort_order: number | null;
};

type CollectionRow = {
  id: string;
  owner_id: string;
  title: string;
  world_code: string | null;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discover Artwork — NODEINE",
  description: "Search across NODEINE's visual worlds, creators, and artwork.",
};

export default async function DiscoverPage() {
  if (!supabaseUrl || !supabaseKey) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 px-5 text-zinc-400">
        Supabase environment variables are missing.
      </main>
    );
  }

  const database = createClient(supabaseUrl, supabaseKey);
  const [artworksResult, collectionsResult, profilesResult] = await Promise.all([
    database
      .from("artworks")
      .select(
        "id, collection_id, title, src, thumb_src, mood, tags, sort_order"
      )
      .order("sort_order"),
    database
      .from("collections")
      .select("id, owner_id, title, world_code"),
    database.from("profiles").select("id, username, display_name"),
  ]);

  if (artworksResult.error) throw artworksResult.error;
  if (collectionsResult.error) throw collectionsResult.error;
  if (profilesResult.error) throw profilesResult.error;

  const collections = (collectionsResult.data ?? []) as CollectionRow[];
  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const collectionById = new Map(
    collections.map((collection) => [collection.id, collection])
  );
  const profileById = new Map(
    profiles.map((profile) => [profile.id, profile])
  );

  const artworks = ((artworksResult.data ?? []) as ArtworkRow[]).flatMap(
    (artwork): DiscoverArtwork[] => {
      const collection = collectionById.get(artwork.collection_id);
      if (!collection) return [];
      const creator = profileById.get(collection.owner_id) ?? null;

      return [
        {
          id: artwork.id,
          title: artwork.title,
          src: artwork.src,
          thumbSrc: artwork.thumb_src,
          mood: artwork.mood,
          tags: artwork.tags,
          collectionTitle: collection.title,
          worldCode: collection.world_code,
          creatorId: creator?.id ?? null,
          creatorName: creator?.display_name ?? "NODEINE",
          creatorUsername: creator?.username ?? null,
        },
      ];
    }
  );

  return <DiscoverView artworks={artworks} />;
}
