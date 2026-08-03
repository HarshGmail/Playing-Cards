import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '@/types';
import { apiFetch } from '@/lib/api/fetcher';
import { userKeys, friendKeys, authKeys } from './keys';

interface UserResponse {
  user: User;
}

/**
 * Mirrors what GET /api/users/[username]/stats actually returns. The previous
 * declaration listed avgScore/bestScore/worstScore/totalScore/matchesWon, none
 * of which that endpoint sends — consumers reading them silently got undefined.
 */
interface UserStatsResponse {
  stats: {
    wins: number;
    totalMatches: number;
    averageRank: number;
    timesLeading: number;
    gamesWon: number;
    totalRounds: number;
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

/**
 * Uploads a new profile picture, or clears it when passed null.
 *
 * Not folded into useUpdateMeMutation: the avatar has its own endpoint (it is
 * multipart, not JSON) and applies immediately rather than on Save.
 */
export function useAvatarMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File | null) => {
      if (!file) {
        return apiFetch<UserResponse>('/api/users/me/avatar', {
          method: 'DELETE',
        }).then((res) => res.user);
      }

      const body = new FormData();
      body.append('file', file);

      // No Content-Type header — the browser must set the multipart boundary.
      return apiFetch<UserResponse>('/api/users/me/avatar', {
        method: 'POST',
        body,
      }).then((res) => res.user);
    },
    onSuccess: (user) => {
      queryClient.setQueryData(userKeys.me(), user);
      // The picture is denormalised into the friends list and any profile page
      // keyed by username, so those caches are now stale.
      queryClient.invalidateQueries({ queryKey: userKeys.detail(user.username) });
      queryClient.invalidateQueries({ queryKey: friendKeys.list() });
      // The header and dashboard card read the session user from authKeys.me,
      // a separate query with a ~16 minute staleTime — without this the new
      // picture would not appear there until a full reload.
      queryClient.invalidateQueries({ queryKey: authKeys.me() });
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

