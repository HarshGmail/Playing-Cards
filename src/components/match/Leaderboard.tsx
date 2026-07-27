'use client';

import { useState, useEffect } from 'react';

interface LeaderboardEntry {
  userId: string;
  userName: string;
  totalScore: number;
  rank: number;
  status: 'active' | 'dnf';
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export default function Leaderboard({ entries }: LeaderboardProps) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setFlipped((prev) => !prev), 5000);
    return () => clearInterval(interval);
  }, []);

  if (entries.length === 0) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
        <p className="text-gray-600 dark:text-gray-400">No leaderboard data yet</p>
      </div>
    );
  }

  const leader = entries[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {entries.slice(0, 3).map((entry) => (
          <div
            key={entry.userId}
            className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/40 rounded-lg border border-blue-200 dark:border-blue-800"
          >
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              #{entry.rank}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {entry.status === 'dnf' ? '(DNF)' : 'Active'}
            </p>
            <p className="font-semibold text-gray-900 dark:text-white truncate">
              {entry.userName}
            </p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {entry.totalScore}
            </p>
          </div>
        ))}
      </div>

      <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-lg h-32 flex items-center justify-center overflow-hidden">
        <div className="text-center transition-all duration-500">
          {flipped ? (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Leader</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {leader.userName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">+{leader.totalScore}</p>
            </div>
          ) : (
            <div>
              <p className="text-5xl font-bold text-blue-600 dark:text-blue-400">#{leader.rank}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Current Lead</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.userId}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                {entry.rank}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{entry.userName}</p>
                {entry.status === 'dnf' && (
                  <p className="text-xs text-red-600 dark:text-red-400">Did Not Finish</p>
                )}
              </div>
            </div>
            <p className="font-bold text-gray-900 dark:text-white">{entry.totalScore}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
