'use client';

import { useEffect, useRef, useState } from 'react';

const CELEBRATE_PARAM = 'celebrate';
const CELEBRATE_PARAM_ON = '1';
const CELEBRATED_KEY_PREFIX = 'celebrated:';

interface MatchCelebrationInput {
  matchId: string;
  ready: boolean;
  viewerWon: boolean;
}

function celebratedKeyFor(matchId: string): string {
  return `${CELEBRATED_KEY_PREFIX}${matchId}`;
}

function hasCelebrated(matchId: string): boolean {
  try {
    return window.localStorage.getItem(celebratedKeyFor(matchId)) !== null;
  } catch {
    return true;
  }
}

function markCelebrated(matchId: string): void {
  try {
    window.localStorage.setItem(celebratedKeyFor(matchId), new Date().toISOString());
  } catch {
    return;
  }
}

function hasCelebrateParam(): boolean {
  return new URL(window.location.href).searchParams.get(CELEBRATE_PARAM) === CELEBRATE_PARAM_ON;
}

function removeCelebrateParam(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(CELEBRATE_PARAM);
  window.history.replaceState(window.history.state, '', url.toString());
}

export function useMatchCelebration({ matchId, ready, viewerWon }: MatchCelebrationInput): boolean {
  const [celebrating, setCelebrating] = useState(false);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!ready || handledRef.current) return;
    const requestedByLink = hasCelebrateParam();
    const owedForWin = viewerWon && !hasCelebrated(matchId);
    if (!requestedByLink && !owedForWin) return;

    handledRef.current = true;
    if (viewerWon) markCelebrated(matchId);
    if (requestedByLink) removeCelebrateParam();
    setCelebrating(true);
  }, [matchId, ready, viewerWon]);

  return celebrating;
}
