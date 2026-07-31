import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Friend, FriendRequest } from '@/types';
import { apiFetch } from '@/lib/api/fetcher';
import { friendKeys } from './keys';

interface FriendsResponse {
  friends: Friend[];
}

interface RequestsResponse {
  requests: FriendRequest[];
}

export function useFriendsQuery() {
  return useQuery({
    queryKey: friendKeys.list(),
    queryFn: () =>
      apiFetch<FriendsResponse>('/api/friends').then((data) => data.friends),
  });
}

export function useIncomingRequestsQuery() {
  return useQuery({
    queryKey: friendKeys.requests(),
    queryFn: () =>
      apiFetch<RequestsResponse>('/api/friends/requests').then(
        (data) => data.requests
      ),
  });
}

export function useAddFriendMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<void>('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.requests() });
    },
  });
}

export function useRemoveFriendMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<void>(`/api/friends/${userId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.list() });
    },
  });
}

export function useAcceptRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) =>
      apiFetch<void>(`/api/friends/requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.list() });
      queryClient.invalidateQueries({ queryKey: friendKeys.requests() });
    },
  });
}

export function useDeclineRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: string) =>
      apiFetch<void>(`/api/friends/requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.requests() });
    },
  });
}
