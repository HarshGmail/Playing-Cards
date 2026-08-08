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
  players: string[];
  spectatorIds?: string[];
}

interface CreateMatchResponse {
  id: string;
  name: string;
  creatorId: string;
  status: string;
  /** Players sent an invite. They are not on the roster until they accept. */
  invitedCount: number;
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
