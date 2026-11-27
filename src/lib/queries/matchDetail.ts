import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GameType, Match, MatchState, RosterEntry, WinForecast } from '@/types';
import { apiFetch } from '@/lib/api/fetcher';
import { applyOptimisticRound, type CachedRound, type SubmittedScore } from '@/lib/domain/optimisticRound';
import { isNetworkFailure, queuedFor, type QueuedRound } from '@/lib/domain/roundOutbox';
import { useRoundOutboxStore } from '@/lib/store/roundOutboxStore';
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
      wrongShow?: boolean;
      enteredBy: string;
      /** Serialized from a BSON Date, so it arrives as an ISO string. */
      enteredAt: string;
    }>;
  }>;
}

const LIVE_POLL_INTERVAL_MS = 5_000;

export function useQueuedRounds(matchId: string): QueuedRound[] {
  const entries = useRoundOutboxStore((state) => state.entries);
  const hydrate = useRoundOutboxStore((state) => state.hydrate);
  useEffect(() => hydrate(), [hydrate]);
  return useMemo(() => queuedFor(entries, matchId), [entries, matchId]);
}

function useLiveRefresh(matchId: string) {
  const submittingRound = useIsMutating({ mutationKey: matchKeys.submitRound(matchId) }) > 0;
  const hasQueuedRounds = useQueuedRounds(matchId).length > 0;
  const holdStill = submittingRound || hasQueuedRounds;
  return {
    refetchInterval: holdStill ? (false as const) : LIVE_POLL_INTERVAL_MS,
    refetchOnWindowFocus: !hasQueuedRounds,
    refetchOnReconnect: !hasQueuedRounds,
  };
}

export function useMatchQuery(id: string) {
  const liveRefresh = useLiveRefresh(id);
  return useQuery({
    queryKey: matchKeys.detail(id),
    queryFn: () =>
      apiFetch<MatchResponse>(`/api/matches/${id}`).then((data) => data.match),
    ...liveRefresh,
    refetchIntervalInBackground: false,
  });
}

export function useMatchStateQuery(id: string) {
  const liveRefresh = useLiveRefresh(id);
  return useQuery({
    queryKey: matchKeys.state(id),
    queryFn: () =>
      apiFetch<MatchStateResponse>(`/api/matches/${id}/state`).then(
        (data) => data.state
      ),
    ...liveRefresh,
    refetchIntervalInBackground: false,
  });
}

export function useMatchRoundsQuery(id: string) {
  const liveRefresh = useLiveRefresh(id);
  return useQuery({
    queryKey: matchKeys.rounds(id),
    queryFn: () =>
      apiFetch<RoundsResponse>(`/api/matches/${id}/rounds`).then(
        (data) => data.rounds
      ),
    ...liveRefresh,
    refetchIntervalInBackground: false,
  });
}

interface SubmitRoundRequest {
  scores: SubmittedScore[];
  clientRoundId: string;
}

export interface SubmitRoundResult {
  queued: boolean;
}

interface SubmitRoundContext {
  previousMatch: Match | undefined;
  previousState: MatchState | undefined;
  previousRounds: CachedRound[] | undefined;
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export function postRound(matchId: string, round: Pick<SubmitRoundRequest, 'scores' | 'clientRoundId'>) {
  return apiFetch<void>(`/api/matches/${matchId}/rounds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(round),
  });
}

export function useSubmitRoundMutation(matchId: string) {
  const queryClient = useQueryClient();
  const enqueue = useRoundOutboxStore((state) => state.enqueue);
  const matchKey = matchKeys.detail(matchId);
  const stateKey = matchKeys.state(matchId);
  const roundsKey = matchKeys.rounds(matchId);

  const queueForLater = ({ scores, clientRoundId }: SubmitRoundRequest): SubmitRoundResult => {
    enqueue({ clientRoundId, matchId, scores, queuedAt: new Date().toISOString() });
    return { queued: true };
  };

  return useMutation<SubmitRoundResult, Error, SubmitRoundRequest, SubmitRoundContext>({
    mutationKey: matchKeys.submitRound(matchId),
    mutationFn: async (round) => {
      if (isOffline()) return queueForLater(round);
      try {
        await postRound(matchId, round);
        return { queued: false };
      } catch (err) {
        if (isNetworkFailure(err)) return queueForLater(round);
        throw err;
      }
    },
    onMutate: async ({ scores }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: matchKey, exact: true }),
        queryClient.cancelQueries({ queryKey: stateKey }),
        queryClient.cancelQueries({ queryKey: roundsKey }),
      ]);

      const previousMatch = queryClient.getQueryData<Match>(matchKey);
      const previousState = queryClient.getQueryData<MatchState>(stateKey);
      const previousRounds = queryClient.getQueryData<CachedRound[]>(roundsKey);

      if (previousMatch) {
        const optimistic = applyOptimisticRound({
          match: previousMatch,
          rounds: previousRounds ?? [],
          state: previousState,
          scores,
          enteredAt: new Date().toISOString(),
        });
        queryClient.setQueryData(matchKey, optimistic.match);
        queryClient.setQueryData(roundsKey, optimistic.rounds);
        if (optimistic.state) queryClient.setQueryData(stateKey, optimistic.state);
      }

      return { previousMatch, previousState, previousRounds };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      queryClient.setQueryData(matchKey, context.previousMatch);
      queryClient.setQueryData(stateKey, context.previousState);
      queryClient.setQueryData(roundsKey, context.previousRounds);
    },
    onSettled: (result) => {
      if (result?.queued) return;
      queryClient.invalidateQueries({ queryKey: matchKey });
    },
  });
}

const OUTBOX_RETRY_INTERVAL_MS = 15_000;

export function useRoundOutboxSync(matchId: string, onRejected: (message: string) => void) {
  const queryClient = useQueryClient();
  const queued = useQueuedRounds(matchId);
  const remove = useRoundOutboxStore((state) => state.remove);
  const flushing = useRef(false);
  const [syncing, setSyncing] = useState(false);

  const flush = useCallback(async () => {
    if (flushing.current || queued.length === 0 || isOffline()) return;
    flushing.current = true;
    setSyncing(true);
    let sentAny = false;
    try {
      for (const round of queued) {
        try {
          await postRound(matchId, round);
          remove(round.clientRoundId);
          sentAny = true;
        } catch (err) {
          if (isNetworkFailure(err)) break;
          remove(round.clientRoundId);
          sentAny = true;
          onRejected(err instanceof Error ? err.message : 'A saved round could not be recorded.');
        }
      }
    } finally {
      flushing.current = false;
      setSyncing(false);
      if (sentAny) queryClient.invalidateQueries({ queryKey: matchKeys.detail(matchId) });
    }
  }, [matchId, queued, remove, onRejected, queryClient]);

  useEffect(() => {
    if (queued.length === 0) return;
    flush();
    window.addEventListener('online', flush);
    const timer = window.setInterval(flush, OUTBOX_RETRY_INTERVAL_MS);
    return () => {
      window.removeEventListener('online', flush);
      window.clearInterval(timer);
    };
  }, [queued.length, flush]);

  return { pendingCount: queued.length, syncing };
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
      scores: SubmittedScore[];
    }) =>
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
  force?: boolean;
}

const ADD_TO_MATCH_PATH = {
  player: 'roster',
  spectator: 'spectators',
} as const;

export function useAddToMatchMutation(matchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role, force = false }: AddToMatchRequest) =>
      apiFetch<void>(`/api/matches/${matchId}/${ADD_TO_MATCH_PATH[role]}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(force ? { userId, force } : { userId }),
      }),
    onSuccess: () => {
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
