export type SignalTrailArtwork = {
  id: string;
  collectionId: string;
  title: string;
  src: string;
  thumbSrc: string | null;
  mediaType: string | null;
  mood: string | null;
  tags: string[] | null;
};

export type RankedSignalTrailArtwork = SignalTrailArtwork & {
  reason: string;
  score: number;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function sharedTags(
  currentTags: string[] | null,
  candidateTags: string[] | null
) {
  const current = new Set((currentTags ?? []).map(normalize));
  return (candidateTags ?? []).filter((tag) => current.has(normalize(tag)));
}

function signalReason(
  current: SignalTrailArtwork,
  candidate: SignalTrailArtwork,
  overlappingTags: string[]
) {
  const sameWorld = current.collectionId === candidate.collectionId;
  const sameMood =
    !!current.mood &&
    !!candidate.mood &&
    normalize(current.mood) === normalize(candidate.mood);

  if (sameWorld && sameMood) return "Same world · shared mood";
  if (sameWorld && overlappingTags.length) {
    return `Same world · ${overlappingTags[0]}`;
  }
  if (sameWorld) return "Same visual world";
  if (sameMood) return "Shared mood";
  if (overlappingTags.length > 1) {
    return `Shared ${overlappingTags.slice(0, 2).join(" + ")}`;
  }
  if (overlappingTags.length === 1) return `Shared ${overlappingTags[0]}`;
  return "A contrasting signal";
}

export function rankSignalTrail(
  current: SignalTrailArtwork,
  candidates: SignalTrailArtwork[],
  limit = 6
): RankedSignalTrailArtwork[] {
  if (limit <= 0) return [];

  const uniqueCandidates = new Map<string, SignalTrailArtwork>();
  for (const candidate of candidates) {
    if (candidate.id !== current.id && !uniqueCandidates.has(candidate.id)) {
      uniqueCandidates.set(candidate.id, candidate);
    }
  }

  const ranked = Array.from(uniqueCandidates.values())
    .map((candidate) => {
      const overlappingTags = sharedTags(current.tags, candidate.tags);
      const sameWorld = current.collectionId === candidate.collectionId;
      const sameMood =
        !!current.mood &&
        !!candidate.mood &&
        normalize(current.mood) === normalize(candidate.mood);
      const score =
        (sameWorld ? 8 : 0) +
        (sameMood ? 5 : 0) +
        Math.min(overlappingTags.length, 4) * 3;

      return {
        ...candidate,
        score,
        reason: signalReason(current, candidate, overlappingTags),
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.collectionId.localeCompare(right.collectionId) ||
        left.title.localeCompare(right.title) ||
        left.id.localeCompare(right.id)
    );

  const selected: RankedSignalTrailArtwork[] = [];
  const collectionCounts = new Map<string, number>();

  for (const candidate of ranked) {
    const collectionCount = collectionCounts.get(candidate.collectionId) ?? 0;
    if (collectionCount >= 2) continue;
    selected.push(candidate);
    collectionCounts.set(candidate.collectionId, collectionCount + 1);
    if (selected.length === limit) return selected;
  }

  if (selected.length < limit) {
    const selectedIds = new Set(selected.map((candidate) => candidate.id));
    for (const candidate of ranked) {
      if (selectedIds.has(candidate.id)) continue;
      selected.push(candidate);
      if (selected.length === limit) break;
    }
  }

  return selected;
}
