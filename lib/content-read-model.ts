import { createClient } from "@supabase/supabase-js";
import type { FeedInventoryItem, FeedThreadContext } from "@/lib/feed";
import {
  getPublicWorldThreadsForArtworkIds,
  type WorldThread,
} from "@/lib/world-threads";

type ArtworkRow = {
  id: string;
  collection_id: string;
  title: string;
  src: string;
  thumb_src: string | null;
  media_type: string | null;
  mood: string | null;
  tags: string[] | null;
  sort_order: number | null;
};

type CollectionRow = {
  id: string;
  owner_id: string;
  title: string;
  summary: string | null;
  world_code: string | null;
  sort_order: number | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type LightweightThreadRow = {
  id: string;
  slug: string;
  title: string;
};

type LightweightThreadItemRow = {
  thread_id: string;
  artwork_id: string;
  position: number;
  relation_type: string;
};

export type PublicWorld = FeedInventoryItem["collection"] & {
  creator: FeedInventoryItem["creator"];
  artworks: FeedInventoryItem[];
  threads: WorldThread[];
};

function publicDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? createClient(url, key) : null;
}

async function getPublicContent(): Promise<{
  inventory: FeedInventoryItem[];
  worlds: Array<
    FeedInventoryItem["collection"] & {
      creator: FeedInventoryItem["creator"];
    }
  >;
}> {
  const database = publicDatabase();
  if (!database) return { inventory: [], worlds: [] };

  const [
    artworksResult,
    collectionsResult,
    profilesResult,
    threadItemsResult,
    publicThreadsResult,
  ] =
    await Promise.all([
      database
        .from("artworks")
        .select(
          "id, collection_id, title, src, thumb_src, media_type, mood, tags, sort_order"
        )
        .order("sort_order", { ascending: true }),
      database
        .from("collections")
        .select("id, owner_id, title, summary, world_code, sort_order")
        .order("sort_order", { ascending: true }),
      database
        .from("profiles")
        .select("id, username, display_name, avatar_url"),
      database
        .from("world_thread_items")
        .select("thread_id, artwork_id, position, relation_type")
        .order("position", { ascending: true }),
      database
        .from("world_threads")
        .select("id, slug, title")
        .eq("visibility", "public"),
    ]);

  if (artworksResult.error) throw artworksResult.error;
  if (collectionsResult.error) throw collectionsResult.error;
  if (profilesResult.error) throw profilesResult.error;

  const collections = (collectionsResult.data ?? []) as CollectionRow[];
  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const collectionById = new Map(
    collections.map((collection) => [collection.id, collection])
  );
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const worlds = collections.map((collection) => {
    const profile = profileById.get(collection.owner_id);
    return {
      id: collection.id,
      title: collection.title,
      summary: collection.summary,
      worldCode: collection.world_code,
      sortOrder: collection.sort_order,
      creator: profile
        ? {
            id: profile.id,
            username: profile.username,
            displayName:
              profile.display_name?.trim() ||
              profile.username ||
              "NODEINE creator",
            avatarUrl: profile.avatar_url,
          }
        : null,
    };
  });
  const threadContextsByArtwork = new Map<string, FeedThreadContext[]>();
  const publicThreadById = new Map(
    ((publicThreadsResult.data ?? []) as LightweightThreadRow[]).map((thread) => [
      thread.id,
      thread,
    ])
  );

  if (!threadItemsResult.error && !publicThreadsResult.error) {
    for (const item of (threadItemsResult.data ?? []) as LightweightThreadItemRow[]) {
      const thread = publicThreadById.get(item.thread_id);
      if (!thread) continue;
      const contexts = threadContextsByArtwork.get(item.artwork_id) ?? [];
      contexts.push({
        id: thread.id,
        slug: thread.slug,
        title: thread.title,
        relationType: item.relation_type,
        position: item.position,
      });
      threadContextsByArtwork.set(item.artwork_id, contexts);
    }
  }

  const inventory = ((artworksResult.data ?? []) as ArtworkRow[])
    .flatMap((artwork): FeedInventoryItem[] => {
      const collection = collectionById.get(artwork.collection_id);
      if (!collection) return [];
      const profile = profileById.get(collection.owner_id);

      return [
        {
          id: artwork.id,
          title: artwork.title,
          src: artwork.src,
          thumbSrc: artwork.thumb_src,
          mediaType: artwork.media_type,
          mood: artwork.mood,
          tags: artwork.tags ?? [],
          sortOrder: artwork.sort_order,
          collection: {
            id: collection.id,
            title: collection.title,
            summary: collection.summary,
            worldCode: collection.world_code,
            sortOrder: collection.sort_order,
          },
          creator: profile
            ? {
                id: profile.id,
                username: profile.username,
                displayName:
                  profile.display_name?.trim() ||
                  profile.username ||
                  "NODEINE creator",
                avatarUrl: profile.avatar_url,
              }
            : null,
          threadContexts: threadContextsByArtwork.get(artwork.id) ?? [],
        },
      ];
    })
    .sort(
      (left, right) =>
        (left.collection.sortOrder ?? Number.MAX_SAFE_INTEGER) -
          (right.collection.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
        (left.sortOrder ?? Number.MAX_SAFE_INTEGER) -
          (right.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
        left.id.localeCompare(right.id)
    );

  return { inventory, worlds };
}

export async function getPublicFeedInventory(): Promise<FeedInventoryItem[]> {
  return (await getPublicContent()).inventory;
}

export async function getPublicWorld(
  collectionId: string
): Promise<{ world: PublicWorld; inventory: FeedInventoryItem[] } | null> {
  const { inventory, worlds } = await getPublicContent();
  const worldRecord = worlds.find((world) => world.id === collectionId);
  if (!worldRecord) return null;
  const artworks = inventory.filter(
    (artwork) => artwork.collection.id === collectionId
  );
  const allThreads = await getPublicWorldThreadsForArtworkIds(
    artworks.map((artwork) => artwork.id),
    24
  ).catch(() => []);
  return {
    inventory,
    world: {
      ...worldRecord,
      artworks,
      threads: allThreads,
    },
  };
}
