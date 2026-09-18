import type { SupabaseClient } from "@supabase/supabase-js";

type SavedRow = { artwork_id: string; created_at: string };
type ArtworkRow = {
  id: string;
  collection_id: string;
  title: string;
  src: string;
  thumb_src: string | null;
  media_type: string | null;
  mood: string | null;
  tags: string[] | null;
};
type CollectionRow = {
  id: string;
  owner_id: string;
  title: string;
  world_code: string | null;
};
export type SavedProfile = { id: string; username: string; display_name: string };
export type SavedArtwork = ArtworkRow & {
  saved_at: string;
  collection: CollectionRow | null;
  creator: SavedProfile | null;
};
export type SavedWorld = { id: string; title: string; count: number };

/** Search is local to the already-authorized collection; it never writes saves. */
export function filterSavedArtworks(
  artworks: readonly SavedArtwork[],
  worldId: string,
  search: string,
): SavedArtwork[] {
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return artworks.filter(artwork => {
    if (worldId !== "all" && artwork.collection_id !== worldId) return false;
    const text = [artwork.title, artwork.mood, ...(artwork.tags ?? []),
      artwork.collection?.title, artwork.collection?.world_code,
      artwork.creator?.display_name, artwork.creator ? `@${artwork.creator.username}` : "",
    ].filter(Boolean).join(" ").toLowerCase();
    return words.every(word => text.includes(word));
  });
}

export function savedWorlds(artworks: readonly SavedArtwork[]): SavedWorld[] {
  const worlds = new Map<string, SavedWorld>();
  for (const artwork of artworks) {
    const existing = worlds.get(artwork.collection_id);
    if (existing) existing.count += 1;
    else worlds.set(artwork.collection_id, {
      id: artwork.collection_id,
      title: artwork.collection?.title ?? "Unavailable World",
      count: 1,
    });
  }
  return [...worlds.values()].sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
}

/** Read the full collection in stable pages; never report a truncated search. */
export async function fetchSavedArtwork(
  database: SupabaseClient,
  userId: string,
  isCurrent: () => boolean = () => true,
): Promise<{ artworks: SavedArtwork[]; viewerProfile: SavedProfile | null } | null> {
  if (!userId || !isCurrent()) return null;
  const saves: SavedRow[] = [];
  const seen = new Set<string>();
  for (let from = 0; ; from += 500) {
    if (!isCurrent()) return null;
    const { data, error } = await database.from("artwork_saves")
      .select("artwork_id, created_at").eq("user_id", userId)
      .order("created_at", { ascending: false }).order("artwork_id", { ascending: true })
      .range(from, from + 499);
    if (!isCurrent()) return null;
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error("Saved artwork response was incomplete.");
    for (const save of data as SavedRow[]) {
      if (!seen.has(save.artwork_id)) { seen.add(save.artwork_id); saves.push(save); }
    }
    if (data.length < 500) break;
  }

  // Bound each IN query so large private collections do not exceed URL/row limits.
  async function readMetadata<T>(table: "artworks" | "collections" | "profiles", columns: string, ids: string[]) {
    const rows: T[] = [];
    const uniqueIds = [...new Set(ids)];
    for (let start = 0; start < uniqueIds.length; start += 100) {
      if (!isCurrent()) return null;
      const { data, error } = await database.from(table).select(columns).in("id", uniqueIds.slice(start, start + 100));
      if (!isCurrent()) return null;
      if (error) throw error;
      if (!Array.isArray(data)) throw new Error("Saved artwork details were incomplete.");
      rows.push(...data as T[]);
    }
    return rows;
  }

  const artworks = await readMetadata<ArtworkRow>("artworks", "id, collection_id, title, src, thumb_src, media_type, mood, tags", saves.map(save => save.artwork_id));
  if (!artworks) return null;
  const collections = await readMetadata<CollectionRow>("collections", "id, owner_id, title, world_code", artworks.map(artwork => artwork.collection_id));
  if (!collections) return null;
  const profiles = await readMetadata<SavedProfile>("profiles", "id, username, display_name", [userId, ...collections.map(collection => collection.owner_id)]);
  if (!profiles || !isCurrent()) return null;
  const artworkById = new Map(artworks.map(artwork => [artwork.id, artwork]));
  const collectionById = new Map(collections.map(collection => [collection.id, collection]));
  const profileById = new Map(profiles.map(profile => [profile.id, profile]));
  return {
    viewerProfile: profileById.get(userId) ?? null,
    artworks: saves.flatMap(save => {
      const artwork = artworkById.get(save.artwork_id);
      if (!artwork) return [];
      const collection = collectionById.get(artwork.collection_id) ?? null;
      return [{ ...artwork, saved_at: save.created_at, collection,
        creator: collection ? profileById.get(collection.owner_id) ?? null : null }];
    }),
  };
}
