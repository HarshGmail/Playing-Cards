import { User } from '@/types';

interface SelfStatsCardProps {
  user: User;
  stats?: {
    matchesCreated: number;
    matchesJoined: number;
    matchesWon: number;
  };
}

export default function SelfStatsCard({ user, stats }: SelfStatsCardProps) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-6 border border-blue-200 dark:border-blue-700">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-bold">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {user.name}
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
              {stats.matchesCreated}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Created</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.matchesJoined}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Joined</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.matchesWon}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Won</p>
          </div>
        </div>
      )}
    </div>
  );
}
