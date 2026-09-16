import type { SharedArtwork } from "../app/messages/messages-types";

export type ArtworkWorld = {
  id: string;
  title: string;
  world_code: string | null;
  sort_order: number | null;
};

type ArtworkPage = {
  data: SharedArtwork[] | null;
  error: { message: string } | null;
};

/** The caller must apply stable ordering and inclusive ranges to every page. */
export async function loadPickerArtworks(
  fetchPage: (from: number, to: number) => PromiseLike<ArtworkPage>,
  pageSize = 500,
): Promise<SharedArtwork[]> {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) {
    throw new RangeError("Artwork page size must be a positive safe integer.");
  }

  const artworks: SharedArtwork[] = [];
  const seen = new Set<string>();

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!Array.isArray(data)) {
      throw new Error("Artwork response was incomplete. Please try again.");
    }

    for (const artwork of data) {
      if (seen.has(artwork.id)) continue;
      seen.add(artwork.id);
      artworks.push(artwork);
    }

    // Use the actual page length, not its deduplicated count: overlapping rows
    // must not hide later pages, and a failed page must never look complete.
    if (data.length < pageSize) return artworks;
  }
}

export function filterPickerArtworks(
  artworks: readonly SharedArtwork[],
  worldId: string,
  search: string,
): SharedArtwork[] {
  const query = search.trim().toLowerCase();
  return artworks.filter((artwork) => {
    const matchesWorld = worldId === "all" || artwork.collection_id === worldId;
    const matchesSearch = !query || `${artwork.title} ${artwork.mood ?? ""}`.toLowerCase().includes(query);
    return matchesWorld && matchesSearch;
  });
}
