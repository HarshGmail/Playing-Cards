'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';

interface LeaderboardRow {
  userId: string;
  name: string;
  username: string;
  wins: number;
  gamesWon: number;
  totalRounds: number;
  isSelf: boolean;
}

interface FriendsLeaderboardProps {
  self: { id: string; name: string; username: string };
}

function ratio(gamesWon: number, totalRounds: number) {
  return totalRounds > 0 ? gamesWon / totalRounds : 0;
}

export default function FriendsLeaderboard({ self }: FriendsLeaderboardProps) {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);

  useEffect(() => {
    const load = async () => {
      const friendsRes = await fetch('/api/friends');
      const friendsData = friendsRes.ok ? await friendsRes.json() : { friends: [] };

      const people = [
        { id: self.id, name: self.name, username: self.username },
        ...friendsData.friends,
      ];

      const withStats = await Promise.all(
        people.map(async (p) => {
          const statsRes = await fetch(`/api/users/${p.username}/stats`);
          const stats = statsRes.ok ? (await statsRes.json()).stats : null;
          return {
            userId: p.id,
            name: p.name,
            username: p.username,
            wins: stats?.wins ?? 0,
            gamesWon: stats?.gamesWon ?? 0,
            totalRounds: stats?.totalRounds ?? 0,
            isSelf: p.id === self.id,
          };
        })
      );

      withStats.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
        const ratioDiff = ratio(b.gamesWon, b.totalRounds) - ratio(a.gamesWon, a.totalRounds);
        if (ratioDiff !== 0) return ratioDiff;
        return a.name.localeCompare(b.name);
      });

      setRows(withStats);
    };

    load();
  }, [self.id, self.name, self.username]);

  if (rows === null) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <p className="text-gray-600 dark:text-gray-400">Loading friends leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-600 dark:text-blue-500" />
        Friends Leaderboard
      </h3>

      {rows.length <= 1 ? (
        <p className="text-gray-600 dark:text-gray-400">
          Add friends to see how you stack up against them.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div
              key={row.userId}
              className={`flex items-center justify-between p-3 rounded-lg ${
                row.isSelf
                  ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                  : 'bg-gray-50 dark:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-gray-500 text-white">
                  {idx + 1}
                </div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {row.name}
                  {row.isSelf && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">(you)</span>
                  )}
                </p>
              </div>
              <div className="text-right text-sm text-gray-600 dark:text-gray-400">
                <span className="font-bold text-gray-900 dark:text-white">{row.wins}</span> wins ·{' '}
                <span className="font-bold text-gray-900 dark:text-white">{row.gamesWon}</span>{' '}
                games won
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
