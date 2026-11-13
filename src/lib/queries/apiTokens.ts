import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiTokenSummary, CreatedApiToken } from '@/types';
import { apiFetch } from '@/lib/api/fetcher';
import { apiTokenKeys } from './keys';

interface ApiTokensResponse {
  tokens: ApiTokenSummary[];
}

export function useApiTokensQuery() {
  return useQuery({
    queryKey: apiTokenKeys.list(),
    queryFn: () => apiFetch<ApiTokensResponse>('/api/me/tokens').then((data) => data.tokens),
  });
}

export function useCreateApiTokenMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) =>
      apiFetch<CreatedApiToken>('/api/me/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiTokenKeys.list() });
    },
  });
}

export function useRevokeApiTokenMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tokenId: string) =>
      apiFetch<{ id: string; revoked: boolean }>(`/api/me/tokens/${tokenId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiTokenKeys.list() });
    },
  });
}
