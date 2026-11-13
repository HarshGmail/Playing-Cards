import { describe, it, expect } from 'vitest';
import { buildRaceFrame, finalRaceProgress } from './positionChartOptions';
import type { PositionRosterEntry, RoundPositions } from '@/lib/domain/positionHistory';

const roster: PositionRosterEntry[] = ['a', 'b'].map((userId) => ({
  userId,
  userName: userId,
  status: 'active',
  dnfAfterRound: null,
}));

function standings(...rounds: Array<Record<string, number>>): RoundPositions[] {
  return rounds.map((positions, index) => ({
    round: index + 1,
    positions: new Map(Object.entries(positions)),
    totals: new Map(),
  }));
}

const history = standings({ a: 1, b: 2 }, { a: 2, b: 1 }, { a: 2, b: 1 });

describe('buildRaceFrame', () => {
  it('draws only the first round at the start of the race', () => {
    const frame = buildRaceFrame(history, roster, 0);

    expect(frame.dataByPlayer.get('a')).toEqual([{ x: 0, y: 1, marker: { enabled: false } }]);
    expect(frame.heads.get('a')).toEqual({ x: 0, staggerPx: 0 });
  });

  it('puts each head partway between rounds while the race is moving', () => {
    const frame = buildRaceFrame(history, roster, 0.5);

    expect(frame.dataByPlayer.get('a')?.map(({ x, y }) => [x, y])).toEqual([
      [0, 1],
      [0.5, 1.5],
    ]);
    expect(frame.heads.get('b')?.x).toBe(0.5);
  });

  it('hides the marker under the head but keeps the markers behind it', () => {
    const points = buildRaceFrame(history, roster, 2).dataByPlayer.get('a') ?? [];

    expect(points.slice(0, -1).every((point) => point.marker === undefined)).toBe(true);
    expect(points[points.length - 1].marker).toEqual({ enabled: false });
  });

  it('stops at the final round even if asked to go further', () => {
    const frame = buildRaceFrame(history, roster, 99);

    expect(frame.heads.get('a')?.x).toBe(finalRaceProgress(history));
    expect(frame.dataByPlayer.get('a')).toHaveLength(3);
  });

  it('staggers heads that land on the same spot so both faces stay visible', () => {
    const tied = standings({ a: 1, b: 1 });

    const frame = buildRaceFrame(tied, roster, 0);

    expect(frame.heads.get('a')?.staggerPx).toBe(0);
    expect(frame.heads.get('b')?.staggerPx).toBeGreaterThan(0);
  });

  it('leaves a head at the last round a player was ranked', () => {
    const dropout = standings({ a: 1, b: 2 }, { a: 1 }, { a: 1 });

    const frame = buildRaceFrame(dropout, roster, 2);

    expect(frame.heads.get('b')?.x).toBe(0);
    expect(frame.heads.get('a')?.x).toBe(2);
  });

  it('returns an empty frame for a match with no rounds', () => {
    const frame = buildRaceFrame([], roster, 0);

    expect(frame.dataByPlayer.size).toBe(0);
    expect(frame.heads.size).toBe(0);
  });
});
