import { describe, it, expect } from 'vitest';
import { isNetworkFailure, parseOutbox, queuedFor, withoutQueued, withQueued, type QueuedRound } from './roundOutbox';

function queued(clientRoundId: string, matchId: string, queuedAt: string): QueuedRound {
  return { clientRoundId, matchId, queuedAt, scores: [{ playerId: 'a', value: 5 }] };
}

describe('round outbox', () => {
  it('keeps each round once and sends a match in the order it was played', () => {
    let entries = withQueued([], queued('r2', 'm1', '2026-11-27T10:05:00Z'));
    entries = withQueued(entries, queued('r1', 'm1', '2026-11-27T10:00:00Z'));
    entries = withQueued(entries, queued('r1', 'm1', '2026-11-27T10:00:00Z'));
    entries = withQueued(entries, queued('x', 'other', '2026-11-27T09:00:00Z'));
    expect(queuedFor(entries, 'm1').map((e) => e.clientRoundId)).toEqual(['r1', 'r2']);
  });

  it('drops a round once it has been sent', () => {
    const entries = [queued('r1', 'm1', '2026-11-27T10:00:00Z'), queued('r2', 'm1', '2026-11-27T10:05:00Z')];
    expect(withoutQueued(entries, 'r1').map((e) => e.clientRoundId)).toEqual(['r2']);
  });

  it('reads saved rounds and ignores anything malformed', () => {
    const raw = JSON.stringify([queued('r1', 'm1', '2026-11-27T10:00:00Z'), { nope: true }, 'junk']);
    expect(parseOutbox(raw).map((e) => e.clientRoundId)).toEqual(['r1']);
    expect(parseOutbox('{not json')).toEqual([]);
    expect(parseOutbox(null)).toEqual([]);
  });

  it('treats a failed fetch as a network problem but not a server rejection', () => {
    expect(isNetworkFailure(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkFailure(new Error('Missing scores'))).toBe(false);
  });
});
