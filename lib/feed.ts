export type FeedMode = "for-you" | "discover" | "following";

export type FeedThreadContext = {
  id: string;
  slug: string;
  title: string;
  relationType: string;
  position: number;
};

export type FeedInventoryItem = {
  id: string;
  title: string;
  src: string;
  thumbSrc: string | null;
  mediaType: string | null;
  mood: string | null;
  tags: string[];
  sortOrder: number | null;
  collection: {
    id: string;
    title: string;
    summary: string | null;
    worldCode: string | null;
    sortOrder: number | null;
  };
  creator: {
    id: string;
    username: string | null;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  threadContexts: FeedThreadContext[];
};

export type FeedSignals = {
  followedCreatorIds: string[];
  likedArtworkIds: string[];
  savedArtworkIds: string[];
  globalLikeCounts: Record<string, number>;
};

export type FeedEntry = FeedInventoryItem & {
  reason: string;
  score: number;
};

export const EMPTY_FEED_SIGNALS: FeedSignals = {
  followedCreatorIds: [],
  likedArtworkIds: [],
  savedArtworkIds: [],
  globalLikeCounts: {},
};

export function isFeedMode(value: string | undefined): value is FeedMode {
  return value === "for-you" || value === "discover" || value === "following";
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function addAffinity(
  affinity: Map<string, number>,
  value: string | null | undefined,
  weight: number
) {
  if (!value) return;
  const key = normalize(value);
  affinity.set(key, (affinity.get(key) ?? 0) + weight);
}

function diversify(entries: FeedEntry[]) {
  const remaining = [...entries];
  const ordered: FeedEntry[] = [];
  const collectionCounts = new Map<string, number>();
  let lastCreatorId: string | null = null;
  let lastCollectionId: string | null = null;

  while (remaining.length) {
    const variedIndex = remaining.findIndex(
      (entry) =>
        (collectionCounts.get(entry.collection.id) ?? 0) < 2 &&
        (entry.creator?.id !== lastCreatorId ||
          entry.collection.id !== lastCollectionId)
    );
    const underCapIndex = remaining.findIndex(
      (entry) => (collectionCounts.get(entry.collection.id) ?? 0) < 2
    );
    const [next] = remaining.splice(
      variedIndex >= 0 ? variedIndex : underCapIndex >= 0 ? underCapIndex : 0,
      1
    );
    ordered.push(next);
    collectionCounts.set(
      next.collection.id,
      (collectionCounts.get(next.collection.id) ?? 0) + 1
    );
    lastCreatorId = next.creator?.id ?? null;
    lastCollectionId = next.collection.id;
  }

  return ordered;
}

export function composeFeed(
  inventory: FeedInventoryItem[],
  mode: FeedMode,
  signals: FeedSignals
): FeedEntry[] {
  const followedCreators = new Set(signals.followedCreatorIds);
  const likedArtwork = new Set(signals.likedArtworkIds);
  const savedArtwork = new Set(signals.savedArtworkIds);
  const tagAffinity = new Map<string, number>();
  const moodAffinity = new Map<string, number>();
  const creatorAffinity = new Map<string, number>();

  for (const artwork of inventory) {
    const weight =
      (likedArtwork.has(artwork.id) ? 3 : 0) +
      (savedArtwork.has(artwork.id) ? 5 : 0);
    if (!weight) continue;
    for (const tag of artwork.tags) addAffinity(tagAffinity, tag, weight);
    addAffinity(moodAffinity, artwork.mood, weight);
    addAffinity(creatorAffinity, artwork.creator?.id, weight);
  }

  const eligible =
    mode === "following"
      ? inventory.filter(
          (artwork) =>
            !!artwork.creator?.id && followedCreators.has(artwork.creator.id)
        )
      : inventory;

  const ranked = eligible
    .map((artwork, originalIndex): FeedEntry => {
      const strongestTag = artwork.tags
        .map((tag) => ({
          tag,
          score: tagAffinity.get(normalize(tag)) ?? 0,
        }))
        .sort((left, right) => right.score - left.score)[0];
      const moodScore = artwork.mood
        ? moodAffinity.get(normalize(artwork.mood)) ?? 0
        : 0;
      const creatorScore = artwork.creator?.id
        ? creatorAffinity.get(normalize(artwork.creator.id)) ?? 0
        : 0;
      const followsCreator =
        !!artwork.creator?.id && followedCreators.has(artwork.creator.id);
      const popularity = signals.globalLikeCounts[artwork.id] ?? 0;
      const threadScore = Math.min(artwork.threadContexts.length, 2) * 2;

      const personalizedScore =
        popularity * 2 +
        (followsCreator ? 24 : 0) +
        (strongestTag?.score ?? 0) * 1.8 +
        moodScore * 1.25 +
        creatorScore * 1.5 +
        threadScore -
        (likedArtwork.has(artwork.id) ? 3 : 0) -
        (savedArtwork.has(artwork.id) ? 5 : 0);
      const discoverScore = popularity * 2 + threadScore - originalIndex / 1000;

      let reason = `Explore ${artwork.collection.title}`;
      if (mode === "following") {
        reason = "From a creator you follow";
      } else if (mode === "for-you") {
        if (followsCreator) reason = "From a creator you follow";
        else if (strongestTag?.score) reason = `Because you connect with ${strongestTag.tag}`;
        else if (artwork.threadContexts.length) reason = "Part of a living Chronicle";
        else if (popularity > 0) reason = "Moving across NODEINE";
        else reason = "A fresh signal from NODEINE";
      } else if (artwork.threadContexts.length) {
        reason = "Connected through a public Chronicle";
      } else if (popularity > 0) {
        reason = "Trending in the archive";
      }

      return {
        ...artwork,
        reason,
        score: mode === "discover" ? discoverScore : personalizedScore,
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        (left.collection.sortOrder ?? Number.MAX_SAFE_INTEGER) -
          (right.collection.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
        (left.sortOrder ?? Number.MAX_SAFE_INTEGER) -
          (right.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
        left.id.localeCompare(right.id)
    );

  return diversify(ranked);
}
