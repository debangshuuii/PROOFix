/**
 * Deterministic Interaction Matcher with Fuzzy & Semantic Fallbacks (Contribution 144)
 */

import type {
  RecordedRequest,
  CassetteInteraction,
  TrafficCassette,
  MatchStrategy,
} from '../types/mock-replay.ts';

export interface MatchResult {
  matched?: CassetteInteraction;
  confidence: number; // 0.0 to 1.0
  matchReason?: string;
}

/**
 * Calculates Jaccard similarity coefficient (0 to 1) between the keys of two JSON strings.
 */
export function calculateJsonSimilarity(bodyA?: string, bodyB?: string): number {
  if (!bodyA && !bodyB) return 1.0;
  if (!bodyA || !bodyB) return 0.0;

  try {
    const objA = JSON.parse(bodyA);
    const objB = JSON.parse(bodyB);

    if (typeof objA !== 'object' || typeof objB !== 'object') {
      return bodyA === bodyB ? 1.0 : 0.0;
    }

    const keysA = new Set(Object.keys(objA));
    const keysB = new Set(Object.keys(objB));

    const intersection = new Set([...keysA].filter((x) => keysB.has(x)));
    const union = new Set([...keysA, ...keysB]);

    if (union.size === 0) return 1.0;
    return intersection.size / union.size;
  } catch {
    return bodyA === bodyB ? 1.0 : 0.0;
  }
}

export class InteractionMatcher {
  private playedInteractions: Set<string> = new Set();

  /**
   * Clears replay execution state.
   */
  public reset(): void {
    this.playedInteractions.clear();
  }

  /**
   * Finds the best matching interaction in the cassette for an incoming request.
   */
  public match(
    incoming: RecordedRequest,
    cassette: TrafficCassette,
    strategy: MatchStrategy = 'exact'
  ): MatchResult {
    const method = incoming.method.toUpperCase();
    const candidateInteractions = cassette.interactions.filter(
      (int) => int.request.method.toUpperCase() === method
    );

    if (candidateInteractions.length === 0) {
      return { confidence: 0, matchReason: `No interactions found matching method "${method}"` };
    }

    // 1. Try Exact Match (Path + Query + Canonical Body Hash)
    for (const int of candidateInteractions) {
      const pathMatch = int.request.path === incoming.path;
      const hashMatch = int.request.bodyHash === incoming.bodyHash;

      if (pathMatch && hashMatch) {
        // Deterministic sequence: prefer unplayed interaction first
        const hasBeenPlayed = this.playedInteractions.has(int.id);
        if (!hasBeenPlayed) {
          this.playedInteractions.add(int.id);
          int.timesReplayed = (int.timesReplayed || 0) + 1;
          return {
            matched: int,
            confidence: 1.0,
            matchReason: 'Exact match on method, path, query, and canonical body hash',
          };
        }
      }
    }

    // If all exact matches were already played once, reuse the matching interaction
    const fallbackExact = candidateInteractions.find(
      (int) => int.request.path === incoming.path && int.request.bodyHash === incoming.bodyHash
    );
    if (fallbackExact) {
      fallbackExact.timesReplayed = (fallbackExact.timesReplayed || 0) + 1;
      return {
        matched: fallbackExact,
        confidence: 0.95,
        matchReason: 'Exact match (repeated interaction sequence)',
      };
    }

    // If strategy is strictly exact, stop here
    if (strategy === 'exact' || strategy === 'body_hash') {
      return { confidence: 0, matchReason: 'No exact body hash match found in cassette' };
    }

    // 2. Fuzzy JSON & Path Matching
    let bestCandidate: CassetteInteraction | undefined;
    let highestScore = 0;

    for (const int of candidateInteractions) {
      if (int.request.path !== incoming.path) continue;

      const similarity = calculateJsonSimilarity(int.request.body, incoming.body);
      if (similarity > highestScore && similarity >= 0.7) {
        highestScore = similarity;
        bestCandidate = int;
      }
    }

    if (bestCandidate) {
      this.playedInteractions.add(bestCandidate.id);
      bestCandidate.timesReplayed = (bestCandidate.timesReplayed || 0) + 1;
      return {
        matched: bestCandidate,
        confidence: Math.round(highestScore * 100) / 100,
        matchReason: `Fuzzy JSON schema match on path "${incoming.path}" (${Math.round(highestScore * 100)}% key similarity)`,
      };
    }

    // 3. Fallback: Path and Method only (if strategy allows)
    if (strategy === 'path_and_method') {
      const pathOnlyMatch = candidateInteractions.find((int) => int.request.path === incoming.path);
      if (pathOnlyMatch) {
        this.playedInteractions.add(pathOnlyMatch.id);
        pathOnlyMatch.timesReplayed = (pathOnlyMatch.timesReplayed || 0) + 1;
        return {
          matched: pathOnlyMatch,
          confidence: 0.75,
          matchReason: `Fallback path and method match on "${incoming.path}"`,
        };
      }
    }

    return {
      confidence: 0,
      matchReason: `No matching interaction found for ${incoming.method} ${incoming.path}`,
    };
  }
}
