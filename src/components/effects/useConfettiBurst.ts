'use client';

import { useEffect } from 'react';
import { fireConfetti } from './Confetti';

export function useConfettiBurst(burstKey: string | undefined) {
  useEffect(() => {
    if (!burstKey) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    fireConfetti().then((cancel) => {
      if (cancelled) cancel();
      else stop = cancel;
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [burstKey]);
}
