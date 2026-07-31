import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MatchSummary } from '@/types';
import { apiFetch } from '@/lib/api/fetcher';
import { matchKeys } from './keys';

interface JoinValidateResponse {
  match: MatchSummary;
}

export function useJoinValidateMutation() {
  return useMutation({
    mutationFn: (code: string) =>
      apiFetch<JoinValidateResponse>(`/api/join/${code.toUpperCase()}`).then(
        (data) => data.match
      ),
  });
}

export function useJoinConfirmMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) =>
      apiFetch<void>(`/api/join/${code.toUpperCase()}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchKeys.list() });
    },
  });
}
