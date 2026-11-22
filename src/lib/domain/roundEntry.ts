export const MAX_ROUND_SCORE = 99999;

export type ScoreDrafts = Record<string, string>;

export type EnterKeyAction = 'focus-next' | 'submit' | 'none';

export function emptyScoreDrafts(playerIds: string[]): ScoreDrafts {
  return Object.fromEntries(playerIds.map((playerId) => [playerId, '']));
}

export function sanitizeScoreInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits === '') return '';
  return Math.min(MAX_ROUND_SCORE, parseInt(digits, 10)).toString();
}

export function allScoresEntered(playerIds: string[], drafts: ScoreDrafts): boolean {
  return playerIds.every((playerId) => (drafts[playerId] ?? '') !== '');
}

export function enterKeyAction(
  fieldIndex: number,
  fieldCount: number,
  canSubmit: boolean
): EnterKeyAction {
  const isLastField = fieldIndex >= fieldCount - 1;
  if (!isLastField) return 'focus-next';
  return canSubmit ? 'submit' : 'none';
}

export function enterKeyHintFor(fieldIndex: number, fieldCount: number): 'next' | 'done' {
  return fieldIndex >= fieldCount - 1 ? 'done' : 'next';
}

export function toSubmittedScores(playerIds: string[], drafts: ScoreDrafts) {
  return playerIds.map((playerId) => ({ playerId, value: parseInt(drafts[playerId], 10) }));
}
