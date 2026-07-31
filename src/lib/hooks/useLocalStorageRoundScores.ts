import { useEffect, useState } from 'react';

interface UseLocalStorageRoundScoresOptions {
  matchId: string;
  userId: string;
  round: number;
  isEdit?: boolean;
}

export function useLocalStorageRoundScores({
  matchId,
  userId,
  round,
  isEdit = false,
}: UseLocalStorageRoundScoresOptions) {
  const getStorageKey = () => {
    const prefix = isEdit ? 'edit' : 'add';
    return `round_scores_${prefix}_${matchId}_${userId}_round${round}`;
  };

  const loadSavedScores = (): Record<string, string> | null => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(getStorageKey());
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const saveScores = (scores: Record<string, string>) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(scores));
    } catch {
      // Silently fail if localStorage is full or unavailable
    }
  };

  const clearSavedScores = () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(getStorageKey());
    } catch {
      // Silently fail
    }
  };

  return {
    loadSavedScores,
    saveScores,
    clearSavedScores,
  };
}
