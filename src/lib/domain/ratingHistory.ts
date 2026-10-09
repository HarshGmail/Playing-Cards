import { START_RATING } from './rating';

export const RATING_RANGES = ['7d', '15d', '30d', 'all'] as const;
export type RatingRange = (typeof RATING_RANGES)[number];

export const RATING_RANGE_LABELS: Record<RatingRange, string> = {
  '7d': '7D',
  '15d': '15D',
  '30d': '30D',
  all: 'All',
};

const RATING_RANGE_DAYS: Record<Exclude<RatingRange, 'all'>, number> = {
  '7d': 7,
  '15d': 15,
  '30d': 30,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface TimedRating {
  time: number;
  rating: number;
  delta: number;
  matchName: string;
}

export interface ChartRating {
  time: number;
  rating: number;
  match: TimedRating | null;
}

export interface RatingWindow {
  points: ChartRating[];
  startRating: number;
  endRating: number;
  change: number;
  matchesInRange: number;
}

function rangeStart(range: RatingRange, now: number): number {
  return range === 'all' ? -Infinity : now - RATING_RANGE_DAYS[range] * MS_PER_DAY;
}

function lastBefore(history: TimedRating[], cutoff: number): TimedRating | undefined {
  let found: TimedRating | undefined;
  for (const point of history) {
    if (point.time < cutoff) found = point;
  }
  return found;
}

export function ratingWindow(
  history: TimedRating[],
  range: RatingRange,
  now: number
): RatingWindow {
  const sorted = [...history].sort((a, b) => a.time - b.time);
  const cutoff = rangeStart(range, now);
  const inRange = sorted.filter((point) => point.time >= cutoff);
  const startRating = lastBefore(sorted, cutoff)?.rating ?? START_RATING;
  const endRating = sorted.length > 0 ? sorted[sorted.length - 1].rating : START_RATING;

  const points: ChartRating[] = inRange.map((point) => ({
    time: point.time,
    rating: point.rating,
    match: point,
  }));
  const hasEarlierHistory = sorted.length > inRange.length;
  if (hasEarlierHistory) points.unshift({ time: cutoff, rating: startRating, match: null });
  if (points.length > 0) points.push({ time: now, rating: endRating, match: null });

  return {
    points,
    startRating,
    endRating,
    change: endRating - startRating,
    matchesInRange: inRange.length,
  };
}

export function formatRatingDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`;
}
