import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { LeaderboardMetric, LeaderboardRow, LeaderboardScope, RatedGame } from '@/types';
import { apiFetch } from '@/lib/api/fetcher';
import { PRIMARY_RATING_GAME } from '@/lib/games/catalog';
import { leaderboardKeys } from './keys';

const LEADERBOARD_STALE_TIME_MS = 60_000;
const LEADERBOARD_LIMIT = 50;

export interface LeaderboardResponse {
  rows: LeaderboardRow[];
  self: LeaderboardRow | null;
  games: RatedGame[];
}

export function useLeaderboardQuery(
  scope: LeaderboardScope,
  metric: LeaderboardMetric,
  selectedGame: string
) {
  const game = metric === 'rating' ? selectedGame : PRIMARY_RATING_GAME.key;
  return useQuery({
    queryKey: leaderboardKeys.list(scope, metric, game),
    queryFn: () =>
      apiFetch<LeaderboardResponse>(
        `/api/leaderboard?scope=${scope}&metric=${metric}&game=${encodeURIComponent(game)}&limit=${LEADERBOARD_LIMIT}`
      ),
    staleTime: LEADERBOARD_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}
