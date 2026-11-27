import type { SubmittedScore } from './optimisticRound';

export interface QueuedRound {
  clientRoundId: string;
  matchId: string;
  scores: SubmittedScore[];
  queuedAt: string;
}

export function queuedFor(entries: QueuedRound[], matchId: string): QueuedRound[] {
  return entries
    .filter((entry) => entry.matchId === matchId)
    .sort((a, b) => Date.parse(a.queuedAt) - Date.parse(b.queuedAt));
}

export function withQueued(entries: QueuedRound[], entry: QueuedRound): QueuedRound[] {
  return entries.some((existing) => existing.clientRoundId === entry.clientRoundId) ? entries : [...entries, entry];
}

export function withoutQueued(entries: QueuedRound[], clientRoundId: string): QueuedRound[] {
  return entries.filter((entry) => entry.clientRoundId !== clientRoundId);
}

export function isQueuedRound(value: unknown): value is QueuedRound {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<QueuedRound>;
  return (
    typeof entry.clientRoundId === 'string' &&
    typeof entry.matchId === 'string' &&
    typeof entry.queuedAt === 'string' &&
    Array.isArray(entry.scores)
  );
}

export function parseOutbox(raw: string | null): QueuedRound[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isQueuedRound) : [];
  } catch {
    return [];
  }
}

export function newClientRoundId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isNetworkFailure(error: unknown): boolean {
  return error instanceof TypeError;
}
