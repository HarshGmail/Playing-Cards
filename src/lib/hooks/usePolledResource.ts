import { useEffect, useRef, useState } from 'react';

export interface UsePolledResourceOptions {
  intervalMs?: number;
  backoffMs?: number;
  maxBackoffMs?: number;
  retries?: number;
  onError?: (error: Error) => void;
  enabled?: boolean;
  pauseWhenHidden?: boolean;
}

export function usePolledResource<T>(
  url: string,
  options: UsePolledResourceOptions = {}
): { data: T | null; isLoading: boolean; error: Error | null } {
  const {
    intervalMs = 5000,
    backoffMs = 1000,
    maxBackoffMs = 60000,
    retries = 3,
    onError,
    enabled = true,
    pauseWhenHidden = true,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentBackoffRef = useRef(backoffMs);
  const retriesLeftRef = useRef(retries);

  const fetchData = async () => {
    if (!enabled) return;

    if (pauseWhenHidden && document.hidden) return;

    try {
      abortControllerRef.current = new AbortController();
      const res = await fetch(url, {
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      setData(json);
      setError(null);
      setIsLoading(false);
      currentBackoffRef.current = backoffMs;
      retriesLeftRef.current = retries;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return; // Request was cancelled
      }

      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);

      if (retriesLeftRef.current > 0) {
        retriesLeftRef.current--;
        const nextBackoff = Math.min(
          currentBackoffRef.current * 2,
          maxBackoffMs
        );
        currentBackoffRef.current = nextBackoff;
        timeoutRef.current = setTimeout(fetchData, nextBackoff);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    fetchData();

    // Polling interval
    const pollInterval = setInterval(() => {
      fetchData();
    }, intervalMs);

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchData();
      }
    };

    if (pauseWhenHidden) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearInterval(pollInterval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (pauseWhenHidden) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [enabled, url, intervalMs, pauseWhenHidden]);

  return { data, isLoading, error };
}
