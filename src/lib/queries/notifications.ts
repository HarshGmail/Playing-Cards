import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Notification } from '@/types';
import { apiFetch } from '@/lib/api/fetcher';
import { notificationKeys } from './keys';

interface NotificationsResponse {
  notifications: Notification[];
}

export function useNotificationsQuery(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: () =>
      apiFetch<NotificationsResponse>('/api/notifications').then(
        (data) => data.notifications
      ),
    enabled,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useMarkAsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      }),
    onMutate: (id) => {
      const previous = queryClient.getQueryData<Notification[]>(
        notificationKeys.list()
      );
      if (previous) {
        queryClient.setQueryData<Notification[]>(notificationKeys.list(), (old) =>
          old
            ? old.map((n) => (n.id === id ? { ...n, read: true } : n))
            : old
        );
      }
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationKeys.list(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
    },
  });
}

export function useMarkAllAsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<void>('/api/notifications', {
        method: 'POST',
      }),
    onMutate: () => {
      const previous = queryClient.getQueryData<Notification[]>(
        notificationKeys.list()
      );
      if (previous) {
        queryClient.setQueryData<Notification[]>(
          notificationKeys.list(),
          previous.map((n) => ({ ...n, read: true }))
        );
      }
      return { previous };
    },
    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationKeys.list(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list() });
    },
  });
}
