'use client';

import { useEffect, useState } from 'react';
import { getPositionColor } from '@/lib/domain/positionColor';
import { POSITION_CLASSES } from '@/components/match/positionClasses';
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
}


export default function Leaderboard({
  entries,
  playersById,
  compact = false,
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

  const gapLabel = gapMode === 'interval' ? 'INTERVAL' : 'LEADER';

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
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
          const colors = POSITION_CLASSES[getPositionColor(entry.position, entry.isLast, entry.isDnf)];
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
                      userName={playersById[entry.playerId]?.username ?? ''}
                      displayName={entry.name}
                      profilePicUrl={playersById[entry.playerId]?.profilePicUrl}
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
