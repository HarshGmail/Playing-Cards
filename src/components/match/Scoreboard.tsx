'use client';

import {
  buildScoreboardRows,
  computeRoundWinners,
  computeBracketCounts,
} from '@/lib/domain/scoreboard';
import { getPositionColor, PositionColorToken } from '@/lib/domain/positionColor';
import PlayerNameLink from '@/components/common/PlayerNameLink';
import { showdownMarkFor, showdownOutcome, showdownTallies } from '@/lib/domain/showdownStats';
import type { PlayersById } from '@/types';
import { SHOWDOWN_MARKS, SHOWDOWN_TALLY_ROWS } from './showdownStyles';

interface LeaderboardEntry {
  playerId: string;
  position: number;
  isDnf: boolean;
  isLast: boolean;
}

interface ScoreboardProps {
  rounds: Array<{
    round: number;
    scores: Array<{
      playerId: string;
      value: number;
      wrongShow?: boolean;
    }>;
  }>;
  players: Array<{
    userId: string;
    userName: string;
  }>;
  /** Keyed by userId; scoreboard rows carry that as `playerId`. */
  playersById: PlayersById;
  leaderboard?: LeaderboardEntry[];
  rankPreference?: 'highest-first' | 'lowest-first';
  showdown?: boolean;
}

const TOTAL_CELL_CLASSES: Record<PositionColorToken, string> = {
  'pos-1': 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
  'pos-2': 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
  'pos-3': 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
  'pos-last': 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
  'pos-mid': 'bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-white',
  'pos-dnf': 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500',
};

export default function Scoreboard({
  rounds,
  players,
  playersById,
  leaderboard,
  rankPreference = 'lowest-first',
  showdown = false,
}: ScoreboardProps) {
  if (rounds.length === 0 || players.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 p-6 text-center dark:bg-gray-800">
        <p className="text-gray-600 dark:text-gray-400">No scores recorded yet</p>
      </div>
    );
  }

  // buildScoreboardRows still returns one entry per player (with cells
  // indexed by round) — the table below just renders that transposed, players
  // across the columns and rounds down the rows.
  const rows = buildScoreboardRows(rounds, players);
  const entryByPlayer = new Map((leaderboard ?? []).map((e) => [e.playerId, e]));
  const roundWinners = computeRoundWinners(rounds, rankPreference);
  const bracketCounts = computeBracketCounts(roundWinners, players);
  const outcomes = showdown ? rounds.map(showdownOutcome) : [];
  const tallies = showdown
    ? showdownTallies(
        rounds,
        players.map((player) => player.userId)
      )
    : null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900">
            <th className="p-3 text-left font-semibold text-gray-900 dark:text-white">Round</th>
            {rows.map((row) => (
              <th
                key={row.playerId}
                className="min-w-16 p-3 text-center font-semibold text-gray-900 dark:text-white"
              >
                <PlayerNameLink
                  userId={row.playerId}
                  userName={playersById[row.playerId]?.username ?? ''}
                  displayName={row.userName}
                  profilePicUrl={playersById[row.playerId]?.profilePicUrl}
                  avatarSize={28}
                  stacked
                  className="text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                />{' '}
                <span className="font-normal text-gray-500 dark:text-gray-400">
                  ({bracketCounts.get(row.playerId) ?? 0})
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rounds.map((round, i) => (
            <tr
              key={round.round}
              className="border-b border-gray-200 transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              <td className="p-3 font-medium text-gray-900 dark:text-white">R{round.round}</td>
              {rows.map((row) => {
                const isRoundWinner = roundWinners[i]?.has(row.playerId);
                const mark = showdown ? showdownMarkFor(outcomes[i], row.playerId) : null;
                return (
                  <td
                    key={row.playerId}
                    className={`p-3 text-center ${
                      mark
                        ? SHOWDOWN_MARKS[mark].cell
                        : isRoundWinner
                          ? 'font-semibold text-green-600 dark:text-green-400'
                          : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {row.cells[i] === null ? '-' : row.cells[i]}
                    {mark && (
                      <span
                        className={`ml-1 rounded px-1 text-[10px] font-bold ${SHOWDOWN_MARKS[mark].badge}`}
                        title={SHOWDOWN_MARKS[mark].title}
                      >
                        {SHOWDOWN_MARKS[mark].label}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="border-t-2 border-gray-300 dark:border-gray-600">
            <td className="bg-blue-100 p-3 font-bold text-gray-900 dark:bg-blue-900/30 dark:text-white">
              Total
            </td>
            {rows.map((row) => {
              const entry = entryByPlayer.get(row.playerId);
              const totalCellClass = entry
                ? TOTAL_CELL_CLASSES[getPositionColor(entry.position, entry.isLast, entry.isDnf)]
                : 'bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-white';

              return (
                <td key={row.playerId} className={`p-3 text-center font-bold ${totalCellClass}`}>
                  {row.total}
                </td>
              );
            })}
          </tr>
          {tallies &&
            SHOWDOWN_TALLY_ROWS.map((tallyRow) => (
              <tr key={tallyRow.key} className="border-t border-gray-200 dark:border-gray-700">
                <td className="p-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {tallyRow.label}
                </td>
                {rows.map((row) => (
                  <td
                    key={row.playerId}
                    className={`p-3 text-center text-sm font-semibold tabular-nums ${tallyRow.className}`}
                  >
                    {tallies.get(row.playerId)?.[tallyRow.key] ?? 0}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
