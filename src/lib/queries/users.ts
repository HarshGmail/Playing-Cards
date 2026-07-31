import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User, UserStats, Friend } from '@/types';
import { apiFetch } from '@/lib/api/fetcher';
import { userKeys } from './keys';

interface UserResponse {
  user: User;
}

interface UserStatsResponse {
  stats: {
    totalMatches?: number;
    wins?: number;
    avgScore?: number;
    bestScore?: number;
    worstScore?: number;
    totalScore?: number;
    matchesWon?: number;
  };
}

interface UpdateUserRequest {
  name?: string;
  email?: string;
  phone?: string;
  dob?: string;
}

export function useMeUserQuery() {
  return useQuery({
    queryKey: userKeys.me(),
    queryFn: () =>
      apiFetch<UserResponse>('/api/users/me').then((data) => data.user),
  });
}

export function useUpdateMeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserRequest) =>
      apiFetch<UserResponse>('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((res) => res.user),
    onSuccess: (user) => {
      queryClient.setQueryData(userKeys.me(), user);
    },
  });
}

export function useUserQuery(username: string) {
  return useQuery({
    queryKey: userKeys.detail(username),
    queryFn: () =>
      apiFetch<UserResponse>(`/api/users/${username}`).then((data) => data.user),
  });
}

export function useUserStatsQuery(username: string) {
  return useQuery({
    queryKey: userKeys.stats(username),
    queryFn: () =>
      apiFetch<UserStatsResponse>(`/api/users/${username}/stats`).then(
        (data) => data.stats
      ),
  });
}

interface UserSearchResponse {
  results: User[];
}

export function useUserSearchQuery(term: string) {
  return useQuery({
    queryKey: userKeys.search(term),
    queryFn: () =>
      apiFetch<UserSearchResponse>(
        `/api/users/search?q=${encodeURIComponent(term)}&limit=5`
      ).then((data) => data.results),
    enabled: term.length > 0,
  });
}

interface ResolveUserRequest {
  identifier: string;
}

interface ResolveUserResponse {
  user: User;
}

export function useResolveUserMutation() {
  return useMutation({
    mutationFn: (data: ResolveUserRequest) =>
      apiFetch<ResolveUserResponse>('/api/users/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((res) => res.user),
  });
}

interface FriendsLeaderboardEntry {
  username: string;
  name: string;
  stats: {
    totalMatches?: number;
    wins?: number;
    avgScore?: number;
    bestScore?: number;
    worstScore?: number;
  };
}

export function useFriendsLeaderboardQuery(username: string) {
  return useQuery({
    queryKey: userKeys.leaderboard(username),
    queryFn: async () => {
      const friendsRes = await apiFetch<{ friends: Friend[] }>('/api/friends');
      const friends = friendsRes.friends;

      const statsPromises = friends.map((f) =>
        apiFetch<UserStatsResponse>(`/api/users/${f.username}/stats`)
          .then((res) => ({
            username: f.username,
            name: f.name,
            stats: res.stats,
          }))
          .catch(() => ({
            username: f.username,
            name: f.name,
            stats: {},
          }))
      );

      return Promise.all(statsPromises);
    },
  });
}
