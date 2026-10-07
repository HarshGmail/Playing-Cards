import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { LeaderboardMetric, LeaderboardRow, LeaderboardScope } from '@/types';
import { apiFetch } from '@/lib/api/fetcher';
import { leaderboardKeys } from './keys';

const LEADERBOARD_STALE_TIME_MS = 60_000;
const LEADERBOARD_LIMIT = 50;

export interface LeaderboardResponse {
  rows: LeaderboardRow[];
  self: LeaderboardRow | null;
}

export function useLeaderboardQuery(scope: LeaderboardScope, metric: LeaderboardMetric) {
  return useQuery({
    queryKey: leaderboardKeys.list(scope, metric),
    queryFn: () =>
      apiFetch<LeaderboardResponse>(
        `/api/leaderboard?scope=${scope}&metric=${metric}&limit=${LEADERBOARD_LIMIT}`
      ),
    staleTime: LEADERBOARD_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}
