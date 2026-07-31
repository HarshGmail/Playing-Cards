'use client';

import { buildScoreboardRows, computeRoundWinners, computeZeroCounts } from '@/lib/domain/scoreboard';
import { getPositionColor, PositionColorToken } from '@/lib/domain/positionColor';

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
    }>;
  }>;
  players: Array<{
    userId: string;
    userName: string;
  }>;
  leaderboard?: LeaderboardEntry[];
  rankPreference?: 'highest-first' | 'lowest-first';
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
  leaderboard,
  rankPreference = 'lowest-first',
}: ScoreboardProps) {
  if (rounds.length === 0 || players.length === 0) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
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
  const zeroCounts = computeZeroCounts(rows);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <th className="p-3 text-left font-semibold text-gray-900 dark:text-white">Round</th>
            {rows.map((row) => (
              <th
                key={row.playerId}
                className="p-3 text-center font-semibold text-gray-900 dark:text-white min-w-16"
              >
                {row.userName}{' '}
                <span className="font-normal text-gray-500 dark:text-gray-400">
                  ({zeroCounts.get(row.playerId) ?? 0})
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rounds.map((round, i) => (
            <tr
              key={round.round}
              className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              <td className="p-3 font-medium text-gray-900 dark:text-white">R{round.round}</td>
              {rows.map((row) => {
                const isRoundWinner = roundWinners[i]?.has(row.playerId);
                return (
                  <td
                    key={row.playerId}
                    className={`p-3 text-center ${
                      isRoundWinner
                        ? 'text-green-600 dark:text-green-400 font-semibold'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {row.cells[i] === null ? '-' : row.cells[i]}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="border-t-2 border-gray-300 dark:border-gray-600">
            <td className="p-3 font-bold text-gray-900 dark:text-white bg-blue-100 dark:bg-blue-900/30">
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
        </tbody>
      </table>
    </div>
  );
}
