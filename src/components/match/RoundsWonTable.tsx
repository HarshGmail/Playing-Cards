'use client';

import PlayerNameLink from '@/components/common/PlayerNameLink';
import type { PlayersById } from '@/types';

interface RoundsWonEntry {
  playerId: string;
  name: string;
  gamesWon: number;
  isDnf: boolean;
}

interface RoundsWonTableProps {
  entries: RoundsWonEntry[];
  playersById: PlayersById;
}

export default function RoundsWonTable({ entries, playersById }: RoundsWonTableProps) {
  if (entries.length === 0) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
        <p className="text-gray-600 dark:text-gray-400">No rounds played yet</p>
      </div>
    );
  }

  const sorted = [...entries].sort((a, b) => b.gamesWon - a.gamesWon);

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-gray-900 dark:text-white text-sm px-1">Rounds Won</h3>
      {sorted.map((entry, idx) => (
        <div
          key={entry.playerId}
          className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-gray-500 text-white">
              {idx + 1}
            </div>
            <p className="font-medium text-gray-900 dark:text-white">
              <PlayerNameLink
                userId={entry.playerId}
                userName={playersById[entry.playerId]?.username ?? ''}
                displayName={entry.name}
                profilePicUrl={playersById[entry.playerId]?.profilePicUrl}
                className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
              />
              {entry.isDnf && (
                <span className="text-xs text-gray-500 dark:text-gray-500 ml-1">(DNF)</span>
              )}
            </p>
          </div>
          <p className="font-bold text-gray-900 dark:text-white">{entry.gamesWon}</p>
        </div>
      ))}
    </div>
  );
}
