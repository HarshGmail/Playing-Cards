'use client';

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  computeRankChanges,
  rankOrderSignature,
  type RankChanges,
  type RankedPlayer,
} from '@/lib/domain/rankChanges';

const REVEAL_DELAY_MS = 350;
const HIGHLIGHT_DURATION_MS = 3500;
const STORAGE_KEY_PREFIX = 'rank-order:';
const NO_CHANGES: RankChanges = new Map();

const lastSeenOrderByMatch = new Map<string, readonly RankedPlayer[]>();


function storageKeyFor(matchId: string): string {
  return `${STORAGE_KEY_PREFIX}${matchId}`;
}

function readLastSeen<T extends RankedPlayer>(matchId: string): T[] | null {
  if (typeof window === 'undefined') return null;
  const inMemory = lastSeenOrderByMatch.get(matchId);
  if (inMemory) return inMemory as T[];
  try {
    const stored = window.sessionStorage.getItem(storageKeyFor(matchId));
    return stored ? (JSON.parse(stored) as T[]) : null;
  } catch {
    return null;
  }
}

function writeLastSeen<T extends RankedPlayer>(matchId: string, entries: readonly T[]): void {
  lastSeenOrderByMatch.set(matchId, entries);
  try {
    window.sessionStorage.setItem(storageKeyFor(matchId), JSON.stringify(entries));
  } catch {
    return;
  }
}

export function useRankTransition<T extends RankedPlayer>(matchId: string, entries: T[]) {
  const prefersReducedMotion = useReducedMotion();
  const [displayed, setDisplayed] = useState<T[]>(() => readLastSeen<T>(matchId) ?? entries);
  const [changes, setChanges] = useState<RankChanges>(NO_CHANGES);
  const displayedRef = useRef(displayed);
  const mountedAtRef = useRef<number | null>(null);

  useEffect(() => {
    mountedAtRef.current ??= Date.now();
    const shown = displayedRef.current;

    const show = (next: T[]) => {
      displayedRef.current = next;
      setDisplayed(next);
      writeLastSeen(matchId, next);
    };

    if (rankOrderSignature(shown) === rankOrderSignature(entries)) {
      if (shown !== entries) show(entries);
      else writeLastSeen(matchId, entries);
      return;
    }

    const reveal = () => {
      setChanges(computeRankChanges(shown, entries));
      show(entries);
    };

    const remainingBeat = mountedAtRef.current + REVEAL_DELAY_MS - Date.now();
    if (prefersReducedMotion || remainingBeat <= 0) {
      reveal();
      return;
    }
    const timer = setTimeout(reveal, remainingBeat);
    return () => clearTimeout(timer);
  }, [matchId, entries, prefersReducedMotion]);

  useEffect(() => {
    if (changes === NO_CHANGES) return;
    const timer = setTimeout(() => setChanges(NO_CHANGES), HIGHLIGHT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [changes]);

  return { entries: displayed, changes };
}
