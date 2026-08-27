import {
  rankSignalTrail,
  type SignalTrailArtwork,
} from "@/lib/signal-trails";

export type RankedWorldSignal = SignalTrailArtwork & {
  reason: string;
  score: number;
  matchCount: number;
  sourceArtworkId: string;
  sourceArtworkTitle: string;
};

type AggregateSignal = {
  artwork: SignalTrailArtwork;
  score: number;
  matches: Array<{
    reason: string;
    score: number;
    sourceArtworkId: string;
    sourceArtworkTitle: string;
  }>;
};

function uniqueArtwork(artworks: SignalTrailArtwork[]) {
  const unique = new Map<string, SignalTrailArtwork>();
  for (const artwork of artworks) {
    if (!unique.has(artwork.id)) unique.set(artwork.id, artwork);
  }
  return Array.from(unique.values());
}

function strongestMatch(signal: AggregateSignal) {
  return [...signal.matches].sort(
    (left, right) =>
      right.score - left.score ||
      left.sourceArtworkTitle.localeCompare(right.sourceArtworkTitle) ||
      left.sourceArtworkId.localeCompare(right.sourceArtworkId)
  )[0];
}

function diversify(signals: RankedWorldSignal[], limit: number) {
  const selected: RankedWorldSignal[] = [];
  const collectionCounts = new Map<string, number>();

  for (const signal of signals) {
    const count = collectionCounts.get(signal.collectionId) ?? 0;
    if (count >= 2) continue;
    selected.push(signal);
    collectionCounts.set(signal.collectionId, count + 1);
    if (selected.length === limit) return selected;
  }

  if (selected.length < limit) {
    const selectedIds = new Set(selected.map((signal) => signal.id));
    for (const signal of signals) {
      if (selectedIds.has(signal.id)) continue;
      selected.push(signal);
      if (selected.length === limit) break;
    }
  }

  return selected;
}

export function rankWorldSignals(
  sourceArtwork: SignalTrailArtwork[],
  candidates: SignalTrailArtwork[],
  limit = 8
): RankedWorldSignal[] {
  if (limit <= 0) return [];

  const sources = uniqueArtwork(sourceArtwork);
  if (!sources.length) return [];

  const sourceIds = new Set(sources.map((artwork) => artwork.id));
  const sourceWorldIds = new Set(
    sources.map((artwork) => artwork.collectionId)
  );
  const eligibleCandidates = uniqueArtwork(candidates).filter(
    (candidate) =>
      !sourceIds.has(candidate.id) &&
      !sourceWorldIds.has(candidate.collectionId)
  );
  if (!eligibleCandidates.length) return [];

  const aggregateById = new Map<string, AggregateSignal>();
  for (const source of sources) {
    const matches = rankSignalTrail(
      source,
      eligibleCandidates,
      eligibleCandidates.length
    );
    for (const match of matches) {
      const aggregate = aggregateById.get(match.id) ?? {
        artwork: match,
        score: 0,
        matches: [],
      };
      aggregate.score += match.score;
      aggregate.matches.push({
        reason: match.reason,
        score: match.score,
        sourceArtworkId: source.id,
        sourceArtworkTitle: source.title,
      });
      aggregateById.set(match.id, aggregate);
    }
  }

  const ranked = Array.from(aggregateById.values())
    .map((signal): RankedWorldSignal => {
      const strongest = strongestMatch(signal);
      const matchCount = signal.matches.length;
      return {
        ...signal.artwork,
        score: signal.score,
        matchCount,
        reason:
          matchCount > 1
            ? `${strongest.reason} · echoes ${matchCount} pieces`
            : strongest.reason,
        sourceArtworkId: strongest.sourceArtworkId,
        sourceArtworkTitle: strongest.sourceArtworkTitle,
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.matchCount - left.matchCount ||
        left.collectionId.localeCompare(right.collectionId) ||
        left.title.localeCompare(right.title) ||
        left.id.localeCompare(right.id)
    );

  return diversify(ranked, limit);
}
