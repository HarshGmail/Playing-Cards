import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MatchInvite } from '@/types';
import { apiFetch } from '@/lib/api/fetcher';
import { matchInviteKeys, matchKeys, notificationKeys } from './keys';

interface MatchInvitesResponse {
  invites: MatchInvite[];
}

export function useMatchInvitesQuery(enabled = true) {
  return useQuery({
    queryKey: matchInviteKeys.list(),
    queryFn: () =>
      apiFetch<MatchInvitesResponse>('/api/match-invites').then((data) => data.invites),
    enabled,
    // Matched to the notification poll: the two are shown together, and an
    // invite the user can see but not yet act on would be confusing.
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

interface RespondResponse {
  inviteId: string;
  matchId: string;
  status: 'accepted' | 'declined';
}

export function useRespondToInviteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ inviteId, action }: { inviteId: string; action: 'accept' | 'decline' }) =>
      apiFetch<RespondResponse>(`/api/match-invites/${inviteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchInviteKeys.list() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
      // Accepting puts the user on a roster, so their match list has changed.
      queryClient.invalidateQueries({ queryKey: matchKeys.list() });
    },
  });
}
