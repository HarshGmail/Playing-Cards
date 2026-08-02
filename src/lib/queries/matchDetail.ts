import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Match, MatchState, RosterEntry } from '@/types';
import { apiFetch } from '@/lib/api/fetcher';
import { matchKeys } from './keys';

interface MatchResponse {
  match: Match;
}

interface MatchStateResponse {
  state: MatchState;
}

interface RoundsResponse {
  rounds: Array<{
    round: number;
    scores: Array<{
      playerId: string;
      value: number;
      enteredBy: string;
      /** Serialized from a BSON Date, so it arrives as an ISO string. */
      enteredAt: string;
    }>;
  }>;
}

export function useMatchQuery(id: string) {
  return useQuery({
    queryKey: matchKeys.detail(id),
    queryFn: () =>
      apiFetch<MatchResponse>(`/api/matches/${id}`).then((data) => data.match),
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useMatchStateQuery(id: string) {
  return useQuery({
    queryKey: matchKeys.state(id),
    queryFn: () =>
      apiFetch<MatchStateResponse>(`/api/matches/${id}/state`).then(
        (data) => data.state
      ),
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useMatchRoundsQuery(id: string) {
  return useQuery({
    queryKey: matchKeys.rounds(id),
    queryFn: () =>
      apiFetch<RoundsResponse>(`/api/matches/${id}/rounds`).then(
        (data) => data.rounds
      ),
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

interface SubmitRoundRequest {
  scores: Array<{ playerId: string; value: number }>;
}

export function useSubmitRoundMutation(matchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SubmitRoundRequest) =>
      apiFetch<void>(`/api/matches/${matchId}/rounds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) });
      queryClient.invalidateQueries({ queryKey: matchKeys.state(matchId) });
      queryClient.invalidateQueries({ queryKey: matchKeys.rounds(matchId) });
    },
  });
}

export function useEditRoundMutation(matchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      round,
      scores,
    }: {
      round: number;
    } & SubmitRoundRequest) =>
      apiFetch<void>(`/api/matches/${matchId}/rounds/${round}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) });
      queryClient.invalidateQueries({ queryKey: matchKeys.state(matchId) });
      queryClient.invalidateQueries({ queryKey: matchKeys.rounds(matchId) });
    },
  });
}

export function useEndMatchMutation(matchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<void>(`/api/matches/${matchId}`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) });
      queryClient.invalidateQueries({ queryKey: matchKeys.state(matchId) });
      queryClient.invalidateQueries({ queryKey: matchKeys.list() });
    },
  });
}

interface RosterActionRequest {
  action: 'mark-dnf' | 'rejoin';
}

export function useRosterActionMutation(matchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, action }: { userId: string } & RosterActionRequest) =>
      apiFetch<void>(`/api/matches/${matchId}/roster/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) });
      queryClient.invalidateQueries({ queryKey: matchKeys.state(matchId) });
    },
  });
}

interface JoinRequestsResponse {
  requests: Array<{
    id: string;
    userId: string;
    userName: string;
    createdAt: string;
  }>;
}

export function useJoinRequestsQuery(matchId: string, enabled = false) {
  return useQuery({
    queryKey: matchKeys.joinRequests(matchId),
    queryFn: () =>
      apiFetch<JoinRequestsResponse>(`/api/matches/${matchId}/join-requests`).then(
        (data) => data.requests
      ),
    enabled,
  });
}

interface JoinRequestActionRequest {
  action: 'approve' | 'decline';
}

export function useJoinRequestActionMutation(matchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      requestId,
      action,
    }: { requestId: string } & JoinRequestActionRequest) =>
      apiFetch<void>(`/api/matches/${matchId}/join-requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchKeys.joinRequests(matchId) });
      queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) });
      queryClient.invalidateQueries({ queryKey: matchKeys.state(matchId) });
    },
  });
}

interface ShareMatchResponse {
  code: string;
  expiresAt: string;
}

export function useShareMatchMutation(matchId: string) {
  return useMutation({
    mutationFn: () =>
      apiFetch<ShareMatchResponse>(`/api/matches/${matchId}/share`, {
        method: 'POST',
      }),
  });
}
