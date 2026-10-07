'use client';

import { useState } from 'react';
import { Crown } from 'lucide-react';
import PlayerNameLink from '@/components/common/PlayerNameLink';
import SegmentedToggle from '@/components/profile/SegmentedToggle';
import RatingHelpLink from '@/components/rating/RatingHelpLink';
import { useLeaderboardQuery } from '@/lib/queries/leaderboard';
import { formatWinPct, getRatingTier, TIER_BADGE_CLASSES } from '@/lib/domain/ratingTier';
import type { LeaderboardMetric, LeaderboardRow, LeaderboardScope } from '@/types';

const SCOPE_OPTIONS: { value: LeaderboardScope; label: string }[] = [
  { value: 'friends', label: 'Friends' },
  { value: 'global', label: 'Global' },
];

const METRIC_OPTIONS: { value: LeaderboardMetric; label: string }[] = [
  { value: 'rating', label: 'Rating' },
  { value: 'winPct', label: 'Win %' },
];

const SKELETON_ROW_COUNT = 5;

const PODIUM_RANK_CLASSES: Record<number, string> = {
  1: 'bg-gradient-to-br from-yellow-300 to-amber-500 text-amber-950 shadow-sm shadow-amber-500/40',
  2: 'bg-gradient-to-br from-gray-200 to-gray-400 text-gray-800 shadow-sm shadow-gray-400/40',
  3: 'bg-gradient-to-br from-orange-300 to-orange-600 text-orange-950 shadow-sm shadow-orange-500/40',
};

const PODIUM_ROW_CLASSES: Record<number, string> = {
  1: 'bg-gradient-to-r from-yellow-50 to-transparent dark:from-yellow-900/20 dark:to-transparent',
  2: 'bg-gradient-to-r from-gray-100 to-transparent dark:from-gray-700/40 dark:to-transparent',
  3: 'bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-900/20 dark:to-transparent',
};

const DEFAULT_RANK_CLASSES = 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
const DEFAULT_ROW_CLASSES = 'bg-gray-50 dark:bg-gray-800/60';
const SELF_ROW_CLASSES =
  'ring-2 ring-blue-500/60 bg-blue-50 dark:bg-blue-900/30';

interface LeaderboardRowItemProps {
  row: LeaderboardRow;
  metric: LeaderboardMetric;
}

function LeaderboardRowItem({ row, metric }: LeaderboardRowItemProps) {
  const tier = getRatingTier(row.rating);
  const rowClasses = row.isSelf
    ? SELF_ROW_CLASSES
    : PODIUM_ROW_CLASSES[row.rank] ?? DEFAULT_ROW_CLASSES;
  const rankClasses = PODIUM_RANK_CLASSES[row.rank] ?? DEFAULT_RANK_CLASSES;
  const isChampion = row.rank === 1;

  return (
    <li className={`flex items-center justify-between gap-3 p-3 rounded-lg ${rowClasses}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${rankClasses}`}
        >
          {isChampion ? <Crown className="w-4 h-4" aria-label="Rank 1" /> : row.rank}
        </div>
        <div className="min-w-0 font-medium text-gray-900 dark:text-white truncate">
          <PlayerNameLink
            userId={row.userId}
            userName={row.username}
            displayName={row.name}
            profilePicUrl={row.profilePicUrl}
            className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
          />
          {row.isSelf && (
            <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">(you)</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 text-right">
        {metric === 'rating' ? (
          <>
            <span className="text-base font-bold text-gray-900 dark:text-white tabular-nums">
              {Math.round(row.rating)}
            </span>
            <span
              className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${TIER_BADGE_CLASSES[tier]}`}
            >
              {tier}
            </span>
          </>
        ) : (
          <>
            <span className="text-base font-bold text-gray-900 dark:text-white tabular-nums">
              {formatWinPct(row.winPct)}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
              {row.gamesWon}/{row.gamesPlayed}
            </span>
          </>
        )}
      </div>
    </li>
  );
}

function LeaderboardSkeleton() {
  return (
    <ul className="space-y-2" aria-busy="true" aria-label="Loading leaderboard">
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
        <li
          key={index}
          className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="h-4 w-14 rounded bg-gray-200 dark:bg-gray-700" />
        </li>
      ))}
    </ul>
  );
}

function pinnedSelfRow(
  scope: LeaderboardScope,
  rows: LeaderboardRow[],
  self: LeaderboardRow | null
): LeaderboardRow | null {
  if (scope !== 'global' || !self) return null;
  const isAlreadyListed = rows.some((row) => row.userId === self.userId);
  return isAlreadyListed ? null : self;
}

export default function Leaderboard() {
  const [scope, setScope] = useState<LeaderboardScope>('friends');
  const [metric, setMetric] = useState<LeaderboardMetric>('rating');

  const { data, isPending, isError, isPlaceholderData } = useLeaderboardQuery(scope, metric);

  const rows = data?.rows ?? [];
  const pinnedRow = data ? pinnedSelfRow(scope, rows, data.self) : null;
  const hasNoFriends = scope === 'friends' && rows.length <= 1;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
          Leaderboard
          <RatingHelpLink className="ml-1" />
        </h3>
        <div className="flex items-center gap-2">
          <SegmentedToggle
            ariaLabel="Leaderboard scope"
            options={SCOPE_OPTIONS}
            value={scope}
            onChange={setScope}
          />
          <SegmentedToggle
            ariaLabel="Leaderboard metric"
            options={METRIC_OPTIONS}
            value={metric}
            onChange={setMetric}
          />
        </div>
      </div>

      {isPending ? (
        <LeaderboardSkeleton />
      ) : isError ? (
        <p className="text-red-600 dark:text-red-400">Could not load the leaderboard.</p>
      ) : (
        <div className={isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <ul className="space-y-2">
            {rows.map((row) => (
              <LeaderboardRowItem key={row.userId} row={row} metric={metric} />
            ))}
          </ul>

          {pinnedRow && (
            <div className="mt-3 pt-3 border-t border-dashed border-gray-300 dark:border-gray-600">
              <ul>
                <LeaderboardRowItem row={pinnedRow} metric={metric} />
              </ul>
            </div>
          )}

          {hasNoFriends && (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              Add friends to see how you stack up against them.
            </p>
          )}
          {scope === 'global' && rows.length === 0 && (
            <p className="text-gray-600 dark:text-gray-400">No ranked players yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
