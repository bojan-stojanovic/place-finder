export interface RatedPlace {
  id: string;
  rating?: number | null;
  userRatingCount?: number | null;
}

export interface RankedPlace<T extends RatedPlace> {
  place: T;
  weightedRating: number;
}

export interface RankingOptions {
  /** Reviews a place needs before its own average carries full weight */
  minReviews?: number;
}

const DEFAULT_MIN_REVIEWS = 25;

/**
 * Bayesian average: pulls places with few reviews toward the mean rating
 * of the whole result set, so a 5.0 from 2 reviews doesn't beat a 4.7
 * from 2,000.
 *
 * weightedRating = (v / (v + m)) * R + (m / (v + m)) * C
 *
 * R = place's average rating
 * v = place's review count
 * m = minReviews threshold
 * C = mean rating across places that have ratings
 */
export function rankPlaces<T extends RatedPlace>(
  places: T[],
  options: RankingOptions = {},
): RankedPlace<T>[] {
  const m = options.minReviews ?? DEFAULT_MIN_REVIEWS;

  const rated = places.filter(
    (p): p is T & { rating: number; userRatingCount: number } =>
      typeof p.rating === "number" &&
      typeof p.userRatingCount === "number" &&
      p.userRatingCount >= 0,
  );

  const C = mean(rated.map((p) => p.rating));

  const ranked = places.map((place) => {
    const R = place.rating;
    const v = place.userRatingCount ?? 0;

    // Places without a rating sort to the bottom with a score of 0
    if (typeof R !== "number" || v === 0) {
      return { place, weightedRating: 0 };
    }

    return { place, weightedRating: bayesianScore(R, v, m, C) };
  });

  return ranked.sort((a, b) => b.weightedRating - a.weightedRating);
}

/** Exported for direct testing and reuse */
export function bayesianScore(R: number, v: number, m: number, C: number): number {
  return (v / (v + m)) * R + (m / (v + m)) * C;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, x) => sum + x, 0) / values.length;
}