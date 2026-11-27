'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { latestRoundNumber, momentFromRounds, type RoundMoment } from '@/lib/domain/roundMoments';

interface RoundMomentInput {
  rounds: Array<{ round: number; scores: Array<{ playerId: string; value: number; wrongShow?: boolean }> }>;
  roster: Array<{ userId: string; userName: string; status: 'active' | 'dnf'; dnfAfterRound: number | null }>;
  rankPreference: 'highest-first' | 'lowest-first';
  tiebreakers: string[];
  enabled: boolean;
}

export interface ShownMoment {
  moment: RoundMoment;
  round: number;
}

export function useRoundMoment({ rounds, roster, rankPreference, tiebreakers, enabled }: RoundMomentInput) {
  const [shown, setShown] = useState<ShownMoment | null>(null);
  const lastSeenRound = useRef<number | null>(null);

  useEffect(() => {
    const latest = latestRoundNumber(rounds);
    const previous = lastSeenRound.current;
    lastSeenRound.current = latest;
    if (!enabled || previous === null || latest !== previous + 1) return;
    const moment = momentFromRounds(rounds, roster, rankPreference, tiebreakers);
    if (moment) setShown({ moment, round: latest });
  }, [rounds, roster, rankPreference, tiebreakers, enabled]);

  const dismiss = useCallback(() => setShown(null), []);
  return { shown, dismiss };
}
