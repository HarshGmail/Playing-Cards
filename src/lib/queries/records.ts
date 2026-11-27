import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/fetcher';
import type { FastestRecordsResponse, MatchCelebration, RecordChanceView } from '@/types';
import { recordKeys } from './keys';

const RECORDS_STALE_TIME_MS = 60_000;
const CELEBRATION_POLL_INTERVAL_MS = 5_000;

interface RecordChancesResponse {
  gameName: string;
  chances: RecordChanceView[];
}

interface CelebrationsResponse {
  celebrations: MatchCelebration[];
}

export function useFastestRecordsQuery(game: string) {
  return useQuery({
    queryKey: recordKeys.fastest(game),
    queryFn: () => apiFetch<FastestRecordsResponse>(`/api/records?game=${encodeURIComponent(game)}`),
    staleTime: RECORDS_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}

export function useRecordChancesQuery(matchId: string, roundsPlayed: number, enabled: boolean) {
  return useQuery({
    queryKey: recordKeys.onTheLine(matchId, roundsPlayed),
    queryFn: () => apiFetch<RecordChancesResponse>(`/api/matches/${matchId}/records`),
    enabled,
    staleTime: RECORDS_STALE_TIME_MS,
    placeholderData: keepPreviousData,
  });
}

export function useMatchCelebrationsQuery(matchId: string) {
  return useQuery({
    queryKey: recordKeys.celebrations(matchId),
    queryFn: () =>
      apiFetch<CelebrationsResponse>(`/api/matches/${matchId}/celebrations`).then((data) => data.celebrations),
    refetchInterval: CELEBRATION_POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });
}
