import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';
import { apiFetch } from '@/lib/api/fetcher';
import { authKeys } from './keys';

interface LoginRequest {
  identifier: string;
  password: string;
}

interface LoginResponse {
  user: User;
}

interface SignupRequest {
  username: string;
  name: string;
  email: string;
  password: string;
}

export function useMeQuery() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: () => apiFetch<{ user: User | null }>('/api/auth/me'),
    staleTime: 1_000_000,
    retry: false,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginRequest) =>
      apiFetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.me(), { user: data.user });
    },
  });
}

export function useSignupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SignupRequest) =>
      apiFetch<LoginResponse>('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.me(), { user: data.user });
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<void>('/api/auth/logout', {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.setQueryData(authKeys.me(), { user: null });
      queryClient.clear();
    },
  });
}

interface RecoverVerifyRequest {
  email: string;
}

export function useRecoverVerifyMutation() {
  return useMutation({
    mutationFn: (data: RecoverVerifyRequest) =>
      apiFetch<{ step: string }>('/api/auth/recover/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
  });
}

interface RecoverResetRequest {
  email: string;
  code: string;
  newPassword: string;
}

export function useRecoverResetMutation() {
  return useMutation({
    mutationFn: (data: RecoverResetRequest) =>
      apiFetch<void>('/api/auth/recover/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
  });
}
