import { useQuery } from '@tanstack/react-query';
import type { PlayedGame } from '@/types';
import { apiFetch } from '@/lib/api/fetcher';
import { gameKeys } from './keys';

const PLAYED_GAMES_STALE_TIME_MS = 5 * 60_000;

interface PlayedGamesResponse {
  games: PlayedGame[];
}

export function usePlayedGamesQuery() {
  return useQuery({
    queryKey: gameKeys.played(),
    queryFn: () => apiFetch<PlayedGamesResponse>('/api/games').then((data) => data.games),
    staleTime: PLAYED_GAMES_STALE_TIME_MS,
  });
}
