'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Hash, TrendingUp } from 'lucide-react';
import RatingHelpLink from '@/components/rating/RatingHelpLink';
import SegmentedToggle from '@/components/profile/SegmentedToggle';
import { getRatingTier, TIER_BADGE_CLASSES } from '@/lib/domain/ratingTier';
import {
  formatRatingDelta,
  RATING_RANGE_LABELS,
  RATING_RANGES,
  RatingRange,
  ratingWindow,
  TimedRating,
} from '@/lib/domain/ratingHistory';
import { useRatingHistoryQuery, UserStats } from '@/lib/queries/users';
import { PRIMARY_RATING_GAME } from '@/lib/games/catalog';
import type { GameRatingSummary, RatingHistoryEntry } from '@/types';

const RatingHistoryChart = dynamic(() => import('@/components/profile/RatingHistoryChart'), {
  ssr: false,
});

interface RatingPanelProps {
  stats: UserStats;
  username?: string;
}

const DEFAULT_RANGE: RatingRange = '30d';

const RANGE_OPTIONS = RATING_RANGES.map((range) => ({
  value: range,
  label: RATING_RANGE_LABELS[range],
}));

function toTimedRatings(history: RatingHistoryEntry[]): TimedRating[] {
  return history.map((entry) => ({
    time: new Date(entry.endedAt).getTime(),
    rating: entry.rating,
    delta: entry.delta,
    matchName: entry.matchName,
  }));
}

function gameRatingsOf(stats: UserStats): GameRatingSummary[] {
  if (stats.ratingsByGame?.length) return stats.ratingsByGame;
  return [
    {
      key: PRIMARY_RATING_GAME.key,
      name: PRIMARY_RATING_GAME.name,
      rating: stats.rating,
      peakRating: stats.peakRating,
      ratedMatches: stats.ratedMatches,
      globalRank: stats.globalRank,
    },
  ];
}

function changeClasses(change: number): string {
  if (change > 0) return 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/40';
  if (change < 0) return 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/40';
  return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700/60';
}

export default function RatingPanel({ stats, username = '' }: RatingPanelProps) {
  const [range, setRange] = useState<RatingRange>(DEFAULT_RANGE);
  const gameRatings = gameRatingsOf(stats);
  const [gameKey, setGameKey] = useState(gameRatings[0].key);
  const selected = gameRatings.find((game) => game.key === gameKey) ?? gameRatings[0];
  const { data: history, isLoading } = useRatingHistoryQuery(username, selected.key);
  const tier = getRatingTier(selected.rating);
  const rangeWindow = ratingWindow(toTimedRatings(history ?? []), range, Date.now());

  return (
    <div className="rounded-xl p-4 sm:p-5 mb-4 border border-yellow-200 dark:border-yellow-800/60 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-900/20 dark:via-amber-900/10 dark:to-orange-900/20">
      {gameRatings.length > 1 && (
        <div className="mb-4 max-w-full overflow-x-auto">
          <SegmentedToggle
            options={gameRatings.map((game) => ({ value: game.key, label: game.name }))}
            value={selected.key}
            onChange={setGameKey}
            ariaLabel="Rating game"
          />
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            {selected.name} rating
            <RatingHelpLink className="normal-case tracking-normal" />
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-4xl font-extrabold text-gray-900 dark:text-white tabular-nums">
              {Math.round(selected.rating)}
            </span>
            {history && (
              <span
                className={`text-sm font-bold tabular-nums px-2 py-0.5 rounded ${changeClasses(rangeWindow.change)}`}
                title={`Change over ${RATING_RANGE_LABELS[range]}`}
              >
                {formatRatingDelta(rangeWindow.change)}
                <span className="ml-1 text-xs font-medium opacity-75">
                  {RATING_RANGE_LABELS[range]}
                </span>
              </span>
            )}
            <span
              className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${TIER_BADGE_CLASSES[tier]}`}
            >
              {tier}
            </span>
          </div>
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Peak
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
              {Math.round(selected.peakRating)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5" />
              Global rank
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
              {selected.globalRank == null ? '-' : `#${selected.globalRank}`}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {rangeWindow.matchesInRange === 1 ? '1 rated match' : `${rangeWindow.matchesInRange} rated matches`}
        </p>
        <SegmentedToggle
          options={RANGE_OPTIONS}
          value={range}
          onChange={setRange}
          ariaLabel="Rating history range"
        />
      </div>

      <div className="mt-2">
        {isLoading && (
          <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading rating history...
          </p>
        )}
        {!isLoading && rangeWindow.points.length === 0 && (
          <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
            No rated matches yet. Finish a match to start the chart.
          </p>
        )}
        {!isLoading && rangeWindow.points.length > 0 && (
          <RatingHistoryChart points={rangeWindow.points} trendingUp={rangeWindow.change >= 0} />
        )}
      </div>
    </div>
  );
}
