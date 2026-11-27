'use client';

import { motion } from 'framer-motion';
import type { RankChanges } from '@/lib/domain/rankChanges';
import { getPositionColor } from '@/lib/domain/positionColor';
import { POSITION_CLASSES } from '@/components/match/positionClasses';
import PlayerNameLink from '@/components/common/PlayerNameLink';
import StreakBadge from '@/components/streaks/StreakBadge';
import {
  MovedRowFlash,
  RANK_SPRING,
  RankDeltaChip,
  type GameStreaksByPlayer,
} from '@/components/match/rankEffects';
import { formatWinChance } from '@/components/match/WinChancePanel';
import type { PlayersById } from '@/types';

interface StandingsEntry {
  position: number;
  playerId: string;
  name: string;
  total: number;
  gapToLeader: number;
  gapToAhead: number | null;
  isDnf: boolean;
  isSharedPosition: boolean;
  isLast: boolean;
  gamesWon: number;
}

interface StandingsTableProps {
  entries: StandingsEntry[];
  playersById: PlayersById;
  changes: RankChanges;
  gameStreaks?: GameStreaksByPlayer;
  winChanceById?: Map<string, number>;
  large?: boolean;
}

const ROW_GRID =
  'grid grid-cols-[1.75rem_minmax(0,1fr)_2.5rem_3.25rem_2.75rem] sm:grid-cols-[1.75rem_minmax(0,1fr)_2.5rem_3.25rem_3rem_3rem] items-center gap-x-2 sm:gap-x-3';

const NO_GAP = '—';

function formatGap(entry: StandingsEntry): string {
  return entry.position === 1 || entry.gapToLeader === 0 ? NO_GAP : `+${entry.gapToLeader}`;
}

function formatInterval(entry: StandingsEntry): string {
  return entry.gapToAhead === null || entry.gapToAhead === 0 ? NO_GAP : `+${entry.gapToAhead}`;
}

export default function StandingsTable({
  entries,
  playersById,
  changes,
  gameStreaks,
  winChanceById,
  large = false,
}: StandingsTableProps) {
  if (entries.length === 0) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
        <p className="text-gray-600 dark:text-gray-400">No leaderboard data yet</p>
      </div>
    );
  }

  const nameSize = large ? 'text-base xl:text-lg' : 'text-sm sm:text-base';
  const totalSize = large ? 'text-xl xl:text-2xl' : 'text-base sm:text-lg';
  const rowPadding = large ? 'py-3' : 'py-2.5';

  return (
    <section
      aria-label="Standings"
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
    >
      <div
        className={`${ROW_GRID} px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700`}
      >
        <span className="text-center">#</span>
        <span>Player</span>
        <span className="text-center" title="Rounds won">
          Won
        </span>
        <span className="text-right">Total</span>
        <span className="hidden sm:block text-right" title="Gap to the leader">
          Gap
        </span>
        <span className="text-right" title="Interval: gap to the player just above">
          Int.
        </span>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
        {entries.map((entry) => {
          const colors = POSITION_CLASSES[getPositionColor(entry.position, entry.isLast, entry.isDnf)];
          const change = changes.get(entry.playerId);
          const winChance = winChanceById?.get(entry.playerId);
          const identity = playersById[entry.playerId];

          return (
            <motion.div
              key={entry.playerId}
              layout="position"
              transition={RANK_SPRING}
              className={`relative ${ROW_GRID} px-3 ${rowPadding}`}
            >
              <MovedRowFlash change={change} />
              <div
                className={`relative h-6 w-6 justify-self-center rounded-full flex items-center justify-center text-xs font-bold ${colors.badge}`}
              >
                {entry.position}
              </div>
              <div className="relative min-w-0">
                <p className={`font-medium text-gray-900 dark:text-white ${nameSize}`}>
                  <PlayerNameLink
                    userId={entry.playerId}
                    userName={identity?.username ?? ''}
                    displayName={entry.name}
                    profilePicUrl={identity?.profilePicUrl}
                    className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                  />
                  {entry.isSharedPosition && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">(tied)</span>
                  )}
                  <StreakBadge
                    kind="game"
                    count={gameStreaks?.get(entry.playerId) ?? 0}
                    className="ml-1.5 align-middle"
                  />
                  <RankDeltaChip change={change} className="ml-1.5 align-middle" />
                </p>
                {entry.isDnf && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Did Not Finish</p>
                )}
                {winChance !== undefined && !entry.isDnf && (
                  <p className="text-xs text-blue-700 dark:text-blue-300 tabular-nums">
                    {formatWinChance(winChance)} to win
                  </p>
                )}
              </div>
              <p className="relative text-center font-semibold tabular-nums text-gray-700 dark:text-gray-200">
                {entry.gamesWon}
              </p>
              <p className={`relative text-right font-bold tabular-nums text-gray-900 dark:text-white ${totalSize}`}>
                {entry.total}
              </p>
              <p className="relative hidden sm:block text-right text-xs tabular-nums text-gray-500 dark:text-gray-400">
                {formatGap(entry)}
              </p>
              <p className="relative text-right text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-300">
                {formatInterval(entry)}
              </p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
