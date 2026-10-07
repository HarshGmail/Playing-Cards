import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { MatchSummary } from '@/types';
import { apiFetch } from '@/lib/api/fetcher';
import { matchKeys } from './keys';

interface MatchesResponse {
  matches: MatchSummary[];
}

function calendarMatchesUrl(from: string | null, to: string | null): string {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return query ? `/api/matches?${query}` : '/api/matches';
}

export function calendarMatchesKey(from: string | null, to: string | null) {
  if (!from && !to) return matchKeys.list();
  return [...matchKeys.list(), from, to] as const;
}

export function useCalendarMatchesQuery(
  from: string | null,
  to: string | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: calendarMatchesKey(from, to),
    queryFn: () =>
      apiFetch<MatchesResponse>(calendarMatchesUrl(from, to)).then((data) => data.matches),
    placeholderData: keepPreviousData,
    enabled,
  });
}
