import { describe, it, expect } from 'vitest';
import { buildPositionHistory, type PositionRosterEntry } from './positionHistory';

const active = (userId: string): PositionRosterEntry => ({
  userId,
  userName: userId,
  status: 'active',
  dnfAfterRound: null,
});

describe('buildPositionHistory', () => {
  it('ranks every player after round 1 by that round alone', () => {
    const roster = ['a', 'b', 'c', 'd', 'e'].map(active);
    const rounds = [
      {
        round: 1,
        scores: [
          { playerId: 'a', value: 30 },
          { playerId: 'b', value: 0 },
          { playerId: 'c', value: 25 },
          { playerId: 'd', value: 10 },
          { playerId: 'e', value: 40 },
        ],
      },
    ];

    const [round1] = buildPositionHistory(rounds, roster, 'lowest-first', []);

    expect(round1.round).toBe(1);
    expect(Object.fromEntries(round1.positions)).toEqual({ b: 1, d: 2, c: 3, a: 4, e: 5 });
  });

  it('follows running totals as rounds accumulate', () => {
    const roster = [active('a'), active('b')];
    const rounds = [
      {
        round: 1,
        scores: [
          { playerId: 'a', value: 0 },
          { playerId: 'b', value: 20 },
        ],
      },
      {
        round: 2,
        scores: [
          { playerId: 'a', value: 30 },
          { playerId: 'b', value: 5 },
        ],
      },
    ];

    const history = buildPositionHistory(rounds, roster, 'lowest-first', []);

    expect(history.map((h) => h.positions.get('a'))).toEqual([1, 2]);
    expect(history.map((h) => h.positions.get('b'))).toEqual([2, 1]);
  });

  it('leaves a player unranked until they have a score', () => {
    const roster = [active('a'), active('late')];
    const rounds = [
      { round: 1, scores: [{ playerId: 'a', value: 5 }] },
      {
        round: 2,
        scores: [
          { playerId: 'a', value: 5 },
          { playerId: 'late', value: 3 },
        ],
      },
    ];

    const history = buildPositionHistory(rounds, roster, 'lowest-first', []);

    expect(history[0].positions.has('late')).toBe(false);
    expect(history[0].positions.get('a')).toBe(1);
    expect(history[1].positions.get('late')).toBe(1);
    expect(history[1].positions.get('a')).toBe(2);
  });

  it('shares a position when totals are level', () => {
    const roster = [active('a'), active('b')];
    const rounds = [
      {
        round: 1,
        scores: [
          { playerId: 'a', value: 10 },
          { playerId: 'b', value: 10 },
        ],
      },
    ];

    const [round1] = buildPositionHistory(rounds, roster, 'lowest-first', []);

    expect(round1.positions.get('a')).toBe(1);
    expect(round1.positions.get('b')).toBe(1);
  });

  it('ranks a DNF player last from the round they dropped out', () => {
    const roster: PositionRosterEntry[] = [
      { userId: 'a', userName: 'a', status: 'active', dnfAfterRound: null },
      { userId: 'quitter', userName: 'quitter', status: 'dnf', dnfAfterRound: 1 },
      { userId: 'b', userName: 'b', status: 'active', dnfAfterRound: null },
    ];
    const rounds = [
      {
        round: 1,
        scores: [
          { playerId: 'a', value: 20 },
          { playerId: 'quitter', value: 0 },
          { playerId: 'b', value: 15 },
        ],
      },
      {
        round: 2,
        scores: [
          { playerId: 'a', value: 1 },
          { playerId: 'b', value: 1 },
        ],
      },
    ];

    const [, round2] = buildPositionHistory(rounds, roster, 'lowest-first', []);

    expect(round2.positions.get('quitter')).toBe(3);
  });

  it('orders highest-first matches with the highest total on top', () => {
    const roster = [active('a'), active('b')];
    const rounds = [
      {
        round: 1,
        scores: [
          { playerId: 'a', value: 12 },
          { playerId: 'b', value: 30 },
        ],
      },
    ];

    const [round1] = buildPositionHistory(rounds, roster, 'highest-first', []);

    expect(round1.positions.get('b')).toBe(1);
    expect(round1.positions.get('a')).toBe(2);
  });

  it('returns nothing for a match with no rounds', () => {
    expect(buildPositionHistory([], [active('a')], 'lowest-first', [])).toEqual([]);
  });
});
