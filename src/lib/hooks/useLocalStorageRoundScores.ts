interface RoundDraftTarget {
  matchId: string;
  userId: string;
  round: number;
  isEdit?: boolean;
}

type RoundDrafts = Record<string, string>;

export function roundDraftKey({ matchId, userId, round, isEdit = false }: RoundDraftTarget) {
  const prefix = isEdit ? 'edit' : 'add';
  return `round_scores_${prefix}_${matchId}_${userId}_round${round}`;
}

export function loadRoundDraft(target: RoundDraftTarget): RoundDrafts | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(roundDraftKey(target));
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function saveRoundDraft(target: RoundDraftTarget, drafts: RoundDrafts) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(roundDraftKey(target), JSON.stringify(drafts));
  } catch {
    return;
  }
}

export function clearRoundDraft(target: RoundDraftTarget) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(roundDraftKey(target));
  } catch {
    return;
  }
}

export function useLocalStorageRoundScores(target: RoundDraftTarget) {
  return {
    loadSavedScores: () => loadRoundDraft(target),
    saveScores: (scores: RoundDrafts) => saveRoundDraft(target, scores),
    clearSavedScores: () => clearRoundDraft(target),
  };
}
