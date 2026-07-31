import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MatchSummary } from '@/types';
import { apiFetch } from '@/lib/api/fetcher';
import { matchKeys } from './keys';

interface MatchesResponse {
  matches: MatchSummary[];
}

interface CreateMatchRequest {
  name: string;
  creatorRole: 'score-only' | 'score-and-play';
  rankPreference: 'highest-first' | 'lowest-first';
  tiebreakers: string[];
  roster: Array<{
    userId?: string;
    username?: string;
    email?: string;
    phone?: string;
  }>;
}

interface CreateMatchResponse {
  matchId: string;
  code: string;
}

export function useMatchesQuery() {
  return useQuery({
    queryKey: matchKeys.list(),
    queryFn: () =>
      apiFetch<MatchesResponse>('/api/matches').then((data) => data.matches),
  });
}

export function useCreateMatchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMatchRequest) =>
      apiFetch<CreateMatchResponse>('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchKeys.list() });
    },
  });
}
