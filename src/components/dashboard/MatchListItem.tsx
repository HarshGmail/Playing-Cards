import Link from 'next/link';
import type { MatchSummary } from '@/types';

interface MatchListItemProps {
  // The API shape (id), not the DB document (_id) — this component renders
  // data that came over the wire from GET /api/matches.
  match: MatchSummary;
  leaderboardPosition?: number;
  isCreator?: boolean;
}

export default function MatchListItem({
  match,
  leaderboardPosition,
  isCreator,
}: MatchListItemProps) {
  const activePlayers = match.roster.filter((r) => r.status === 'active').length;
  const totalPlayers = match.roster.length;

  return (
    <Link
      href={`/matches/${match.id}`}
      className="block p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white">
            {match.name}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Round {match.roundsPlayed}
            {match.status === 'ended' && ' • Ended'}
          </p>
        </div>
        {isCreator && (
          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
            Creator
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {activePlayers} active / {totalPlayers} total
        </p>
        {leaderboardPosition && (
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
            #{leaderboardPosition}
          </p>
        )}
      </div>
    </Link>
  );
}
