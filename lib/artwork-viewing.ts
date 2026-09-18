import type { WorldThread } from "./world-threads";

export type ViewingArtwork = {
  id: string;
  title: string;
  src: string;
  thumb_src: string | null;
  media_type: string | null;
};

/** Complete one public World's sequence; a partial page must not look complete. */
export async function loadWorldViewingSequence(
  fetchPage: (from: number, to: number) => PromiseLike<{
    data: ViewingArtwork[] | null;
    error: { message: string } | null;
  }>,
): Promise<ViewingArtwork[]> {
  const pieces: ViewingArtwork[] = [];
  const seen = new Set<string>();
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!Array.isArray(data)) throw new Error("Incomplete World response");
    for (const piece of data) {
      if (!seen.has(piece.id)) { pieces.push(piece); seen.add(piece.id); }
    }
    if (data.length < pageSize) return pieces;
  }
}

/** Curated connection, not inferred similarity or a claim of canonical identity. */
export function selectCreatorThread(
  threads: readonly WorldThread[],
  artworkId: string,
  collectionId: string,
  creatorId: string,
): WorldThread | null {
  return threads.filter(thread =>
    thread.visibility === "public" && thread.ownerId === creatorId &&
    thread.items.length >= 2 && thread.items.length === thread.itemCount &&
    new Set(thread.items.map(item => item.artwork.id)).size === thread.items.length &&
    thread.items.some(item => item.artwork.id === artworkId) &&
    thread.items.every(item => item.artwork.collection?.id === collectionId)
  ).sort((a, b) => a.items.length - b.items.length || a.id.localeCompare(b.id))[0] ?? null;
}

export function moveViewingIndex(index: number, direction: -1 | 1, length: number) {
  if (length < 1) return 0;
  return ((index + direction) % length + length) % length;
}
