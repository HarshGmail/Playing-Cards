'use client';

import { Trophy, Star } from 'lucide-react';

interface MedalsTableProps {
  stats?: {
    wins: number;
    totalMatches: number;
    averageRank: number;
    timesLeading: number;
  };
}

export default function MedalsTable({ stats = { wins: 0, totalMatches: 0, averageRank: 0, timesLeading: 0 } }: MedalsTableProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
        Stats & Achievements
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/40 rounded-lg text-center">
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">
            {stats.wins}
          </div>
          <p className="text-xs text-gray-700 dark:text-gray-400 mt-1">Wins</p>
        </div>

        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/40 rounded-lg text-center">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-500">
            {stats.totalMatches}
          </div>
          <p className="text-xs text-gray-700 dark:text-gray-400 mt-1">Matches</p>
        </div>

        <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/40 rounded-lg text-center">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-500">
            {stats.averageRank.toFixed(1)}
          </div>
          <p className="text-xs text-gray-700 dark:text-gray-400 mt-1">Avg Rank</p>
        </div>

        <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/40 rounded-lg text-center">
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-500 flex items-center justify-center gap-1">
            {stats.timesLeading}
            <Star className="w-5 h-5" />
          </div>
          <p className="text-xs text-gray-700 dark:text-gray-400 mt-1">Leading</p>
        </div>
      </div>
    </div>
  );
}
