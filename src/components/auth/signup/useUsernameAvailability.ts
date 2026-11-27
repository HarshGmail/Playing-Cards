'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api/fetcher';
import type { UsernameAvailabilityState } from '@/lib/domain/signupForm';

export type UsernameAvailability = UsernameAvailabilityState;

const CHECK_DELAY_MS = 450;
const CHECK_TIMEOUT_MS = 5000;

interface AvailabilityResponse {
  available: boolean;
}

export function useUsernameAvailability(username: string, isValid: boolean): UsernameAvailability {
  const [result, setResult] = useState<{ username: string; status: UsernameAvailability }>({
    username: '',
    status: 'idle',
  });

  useEffect(() => {
    if (!isValid) return;
    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const giveUp = window.setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
      try {
        const response = await apiFetch<AvailabilityResponse>(
          `/api/auth/username-available?u=${encodeURIComponent(username)}`,
          { signal: controller.signal }
        );
        if (!cancelled) setResult({ username, status: response.available ? 'available' : 'taken' });
      } catch {
        if (!cancelled) setResult({ username, status: 'unknown' });
      } finally {
        window.clearTimeout(giveUp);
      }
    }, CHECK_DELAY_MS);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [username, isValid]);

  if (!isValid) return 'idle';
  return result.username === username ? result.status : 'checking';
}
