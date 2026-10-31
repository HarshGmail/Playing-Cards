import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GameType, Match, MatchState, RosterEntry, WinForecast } from '@/types';
import { apiFetch } from '@/lib/api/fetcher';
import { gameKeys, matchKeys } from './keys';

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
      dnfPlayerIds,
    }: {
      round: number;
      dnfPlayerIds: string[];
    } & SubmitRoundRequest) =>
      apiFetch<void>(`/api/matches/${matchId}/rounds/${round}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores, dnfPlayerIds }),
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

export function useResumeMatchMutation(matchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<void>(`/api/matches/${matchId}/resume`, {
        method: 'POST',
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

export interface MatchSettings {
  name: string;
  rankPreference: 'highest-first' | 'lowest-first';
  gameType: GameType;
  gameLabel?: string;
  targetRounds: number | null;
}

export function useUpdateMatchSettingsMutation(matchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: MatchSettings) =>
      apiFetch<void>(`/api/matches/${matchId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) });
      queryClient.invalidateQueries({ queryKey: matchKeys.list() });
      queryClient.invalidateQueries({ queryKey: gameKeys.played() });
    },
  });
}

export function useDeleteMatchMutation(matchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<void>(`/api/matches/${matchId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: matchKeys.detail(matchId) });
      queryClient.invalidateQueries({ queryKey: matchKeys.list() });
      queryClient.invalidateQueries({ queryKey: gameKeys.played() });
    },
  });
}

interface AddToMatchRequest {
  userId: string;
  role: 'player' | 'spectator';
}

const ADD_TO_MATCH_PATH = {
  player: 'roster',
  spectator: 'spectators',
} as const;

export function useAddToMatchMutation(matchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: AddToMatchRequest) =>
      apiFetch<void>(`/api/matches/${matchId}/${ADD_TO_MATCH_PATH[role]}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) });
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

interface ForecastResponse {
  forecast: WinForecast | null;
}

export function useWinForecastQuery(matchId: string, version: number, enabled: boolean) {
  return useQuery({
    queryKey: matchKeys.forecast(matchId, version),
    queryFn: () =>
      apiFetch<ForecastResponse>(`/api/matches/${matchId}/forecast`).then((data) => data.forecast),
    enabled,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  });
}
