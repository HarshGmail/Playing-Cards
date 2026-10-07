import { describe, it, expect } from 'vitest';
import {
  START_RATING,
  roundsWeight,
  expectedScore,
  computeMatchDeltas,
  replayRatings,
  RatedMatch,
  RatedParticipant,
} from './rating';

const freshRatings = new Map<string, number>();

function participant(playerId: string, position: number, isDnf = false): RatedParticipant {
  return { playerId, position, isDnf };
}

function sumOf(values: Iterable<number>): number {
  return Array.from(values).reduce((total, value) => total + value, 0);
}

describe('roundsWeight', () => {
  it('grows with rounds and is capped', () => {
    expect(roundsWeight(0)).toBe(0);
    expect(roundsWeight(3)).toBeCloseTo(0.6);
    expect(roundsWeight(10)).toBeCloseTo(1.3);
    expect(roundsWeight(100)).toBe(2);
    expect(roundsWeight(10)).toBeGreaterThan(roundsWeight(3));
  });
});

describe('expectedScore', () => {
  it('is 0.5 for equal ratings and complements across a pair', () => {
    expect(expectedScore(1200, 1200)).toBe(0.5);
    expect(expectedScore(1400, 1200) + expectedScore(1200, 1400)).toBeCloseTo(1);
    expect(expectedScore(1400, 1200)).toBeGreaterThan(0.5);
  });
});

describe('computeMatchDeltas', () => {
  it('moves ratings more in a longer match with the same result', () => {
    const result = [participant('a', 1), participant('b', 2)];
    const short = computeMatchDeltas(freshRatings, result, 3);
    const long = computeMatchDeltas(freshRatings, result, 12);
    expect(long.get('a')!).toBeGreaterThan(short.get('a')!);
    expect(long.get('b')!).toBeLessThan(short.get('b')!);
  });

  it('leaves equally rated tied players unchanged', () => {
    const deltas = computeMatchDeltas(freshRatings, [participant('a', 1), participant('b', 1)], 5);
    expect(deltas.get('a')).toBeCloseTo(0);
    expect(deltas.get('b')).toBeCloseTo(0);
  });

  it('splits a shared first place evenly', () => {
    const deltas = computeMatchDeltas(
      freshRatings,
      [participant('a', 1), participant('b', 1), participant('c', 3)],
      5
    );
    expect(deltas.get('a')).toBeCloseTo(deltas.get('b')!);
    expect(deltas.get('a')!).toBeGreaterThan(0);
    expect(deltas.get('c')!).toBeLessThan(0);
  });

  it('is zero-sum across all participants', () => {
    const ratings = new Map([
      ['a', 1350],
      ['b', 1180],
      ['c', 1240],
      ['d', 1100],
    ]);
    const deltas = computeMatchDeltas(
      ratings,
      [participant('a', 2), participant('b', 1), participant('c', 3), participant('d', 4)],
      8
    );
    expect(sumOf(deltas.values())).toBeCloseTo(0);
  });

  it('treats a DNF player as finishing last', () => {
    const deltas = computeMatchDeltas(
      freshRatings,
      [participant('a', 1), participant('b', 2), participant('quitter', 1, true)],
      6
    );
    const lowest = Math.min(...Array.from(deltas.values()));
    expect(deltas.get('quitter')).toBe(lowest);
    expect(deltas.get('b')!).toBeGreaterThan(deltas.get('quitter')!);
  });
});

describe('replayRatings', () => {
  const match = (
    matchId: string,
    endedAt: string,
    roundsPlayed: number,
    participants: RatedParticipant[]
  ): RatedMatch => ({ matchId, endedAt: new Date(endedAt), roundsPlayed, participants });

  it('replays matches in endedAt order and tracks peak and last delta', () => {
    const states = replayRatings([
      match('m2', '2026-01-02', 6, [participant('a', 2), participant('b', 1)]),
      match('m1', '2026-01-01', 6, [participant('a', 1), participant('b', 2)]),
    ]);
    const a = states.get('a')!;
    expect(a.ratedMatches).toBe(2);
    expect(a.lastMatchId).toBe('m2');
    expect(a.lastDelta).toBeLessThan(0);
    expect(a.peakRating).toBeGreaterThan(START_RATING);
    expect(a.peakRating).toBeGreaterThan(a.rating);
  });

  it('skips matches with fewer than two players or no rounds', () => {
    const states = replayRatings([
      match('solo', '2026-01-01', 4, [participant('a', 1)]),
      match('empty', '2026-01-02', 0, [participant('a', 1), participant('b', 2)]),
    ]);
    expect(states.size).toBe(0);
  });

  it('keeps the total rating pool close to the starting pool', () => {
    const states = replayRatings([
      match('m1', '2026-01-01', 5, [participant('a', 1), participant('b', 2), participant('c', 3)]),
      match('m2', '2026-01-02', 9, [participant('c', 1), participant('a', 2), participant('b', 2)]),
      match('m3', '2026-01-03', 3, [participant('b', 1), participant('c', 2)]),
    ]);
    const pool = sumOf(Array.from(states.values()).map((s) => s.rating));
    expect(Math.abs(pool - START_RATING * states.size)).toBeLessThanOrEqual(states.size);
  });
});
