'use client';

import { User } from '@/types';
import { useUserStatsQuery } from '@/lib/queries/users';
import { StreakBadges } from '@/components/streaks/StreakBadge';
import Avatar from '@/components/common/Avatar';
import { formatWinPct } from '@/lib/domain/ratingTier';

interface SelfStatsCardProps {
  user: User;
}

export default function SelfStatsCard({ user }: SelfStatsCardProps) {
  const { data: stats } = useUserStatsQuery(user.username);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-6 border border-blue-200 dark:border-blue-700">
      <div className="flex items-center gap-4 mb-4">
        <Avatar
          name={user.name}
          profilePicUrl={user.profilePicUrl}
          size={64}
          fallbackClassName="bg-blue-500 text-white"
        />
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex flex-wrap items-center gap-x-2 gap-y-1">
            {user.name}
            {stats && (
              <StreakBadges
                gameStreak={stats.streaks.currentGameStreak}
                matchStreak={stats.streaks.currentMatchStreak}
              />
            )}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            @{user.username}
          </p>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-blue-200 dark:border-blue-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {Math.round(stats.rating)}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Rating</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.matchWins}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Match wins</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatWinPct(stats.winPct)}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Win %</p>
          </div>
        </div>
      )}
    </div>
  );
}
