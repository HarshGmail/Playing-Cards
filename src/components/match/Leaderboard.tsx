'use client';

import { useEffect, useState } from 'react';
import { getPositionColor, PositionColorToken } from '@/lib/domain/positionColor';
import Podium from '@/components/match/Podium';
import PlayerNameLink from '@/components/common/PlayerNameLink';
import type { PlayersById } from '@/types';

interface LeaderboardEntry {
  position: number;
  playerId: string;
  name: string;
  total: number;
  average: number;
  stdDev: number;
  roundsPlayed: number;
  gapToLeader: number;
  gapToAhead: number | null;
  isDnf: boolean;
  isSharedPosition: boolean;
  isLast: boolean;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  /** Keyed by userId; `entry.playerId` is a userId. */
  playersById: PlayersById;
  compact?: boolean;
  ended?: boolean;
}

const COLOR_CLASSES: Record<PositionColorToken, { badge: string; text: string; ring: string }> = {
  'pos-1': {
    badge: 'bg-purple-600 text-white',
    text: 'text-purple-600 dark:text-purple-400',
    ring: 'border-purple-200 dark:border-purple-800 from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/40',
  },
  'pos-2': {
    badge: 'bg-green-600 text-white',
    text: 'text-green-600 dark:text-green-400',
    ring: 'border-green-200 dark:border-green-800 from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/40',
  },
  'pos-3': {
    badge: 'bg-yellow-500 text-white',
    text: 'text-yellow-600 dark:text-yellow-400',
    ring: 'border-yellow-200 dark:border-yellow-800 from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/40',
  },
  'pos-last': {
    badge: 'bg-red-600 text-white',
    text: 'text-red-600 dark:text-red-400',
    ring: 'border-red-200 dark:border-red-800 from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/40',
  },
  'pos-mid': {
    badge: 'bg-gray-500 text-white',
    text: 'text-gray-600 dark:text-gray-400',
    ring: 'border-gray-200 dark:border-gray-700 from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800',
  },
  'pos-dnf': {
    badge: 'bg-gray-400 text-white',
    text: 'text-gray-400 dark:text-gray-500',
    ring: 'border-gray-200 dark:border-gray-700 from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800',
  },
};

export default function Leaderboard({
  entries,
  playersById,
  compact = false,
  ended = false,
}: LeaderboardProps) {
  const [gapMode, setGapMode] = useState<'interval' | 'leader'>('interval');

  useEffect(() => {
    const interval = setInterval(() => {
      setGapMode((prev) => (prev === 'interval' ? 'leader' : 'interval'));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (entries.length === 0) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
        <p className="text-gray-600 dark:text-gray-400">No leaderboard data yet</p>
      </div>
    );
  }

  // Active players keep their sorted order; DNF players are always rendered
  // last, though their position number/frozen total reflect where they'd
  // rank if they'd kept playing.
  const active = entries.filter((e) => !e.isDnf);
  const dnf = entries.filter((e) => e.isDnf);
  const displayOrder = [...active, ...dnf];
  const podium = active.slice(0, 3);

  const gapLabel = gapMode === 'interval' ? 'INTERVAL' : 'LEADER';

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {ended ? (
        <Podium entries={podium} playersById={playersById} />
      ) : (
        <div className={`grid grid-cols-3 gap-2 ${compact ? 'mb-4' : 'md:gap-4 mb-6'}`}>
          {podium.map((entry) => {
            const colors = COLOR_CLASSES[getPositionColor(entry.position, entry.isLast, entry.isDnf)];
            return (
              <div
                key={entry.playerId}
                className={`bg-gradient-to-br rounded-lg border ${colors.ring} ${compact ? 'p-2' : 'p-4'}`}
              >
                <div className={`font-bold ${colors.text} ${compact ? 'text-lg' : 'text-2xl'}`}>
                  #{entry.position}
                  {entry.isSharedPosition && <span className="text-sm ml-1">(tied)</span>}
                </div>
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                  <PlayerNameLink
                    userId={entry.playerId}
                    userName={playersById[entry.playerId]?.username ?? ''}
                    displayName={entry.name}
                    profilePicUrl={playersById[entry.playerId]?.profilePicUrl}
                    className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                  />
                </p>
                <p className={`font-bold ${colors.text} ${compact ? 'text-sm' : 'text-lg'}`}>
                  {entry.total}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-center gap-2 text-xs font-semibold tracking-wide text-gray-500 dark:text-gray-400">
        <span
          key={gapLabel}
          className="transition-opacity duration-200 [animation:fadein_200ms_ease-in]"
        >
          {gapLabel}
        </span>
      </div>

      <div className="space-y-2">
        {displayOrder.map((entry) => {
          const colors = COLOR_CLASSES[getPositionColor(entry.position, entry.isLast, entry.isDnf)];
          const gapValue = gapMode === 'interval' ? entry.gapToAhead : entry.gapToLeader;

          return (
            <div
              key={entry.playerId}
              className={`flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg ${compact ? 'p-2' : 'p-3'}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-full flex items-center justify-center font-bold ${colors.badge} ${
                    compact ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'
                  }`}
                >
                  {entry.position}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    <PlayerNameLink
                      userId={entry.playerId}
                      userName={entry.name}
                      displayName={entry.name}
                      className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                    />
                    {entry.isSharedPosition && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(tied)</span>
                    )}
                  </p>
                  {entry.isDnf && (
                    <p className="text-xs text-gray-500 dark:text-gray-500">Did Not Finish</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 dark:text-white">{entry.total}</p>
                <p
                  key={`${entry.playerId}-${gapMode}`}
                  className="text-xs text-gray-500 dark:text-gray-400 transition-opacity duration-200 [animation:fadein_200ms_ease-in]"
                >
                  {gapValue === null || gapValue === 0
                    ? gapMode === 'interval' && entry.position === 1
                      ? 'Leader'
                      : '—'
                    : `+${gapValue}`}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes fadein {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
