import { describe, it, expect } from 'vitest';
import {
  buildScoreRaceFrame,
  cumulativeTotals,
  leadersByRound,
  scoreRaceFinish,
} from './scoreRaceFrame';

const rows = [
  { playerId: 'a', cells: [5, null, 3] },
  { playerId: 'b', cells: [2, 4, null] },
];

describe('cumulativeTotals', () => {
  it('keeps the running total through rounds a player has no score in', () => {
    const totals = cumulativeTotals(rows);
    expect(totals.get('a')).toEqual([5, 5, 8]);
    expect(totals.get('b')).toEqual([2, 6, 6]);
  });
});

describe('buildScoreRaceFrame', () => {
  const totals = cumulativeTotals(rows);

  it('draws only the first round at the start of the race', () => {
    const frame = buildScoreRaceFrame(totals, 0);
    expect(frame.dataByPlayer.get('a')).toEqual([{ x: 0, y: 5, marker: { enabled: false } }]);
  });

  it('puts each head partway between rounds while the race is moving', () => {
    const frame = buildScoreRaceFrame(totals, 0.5);
    const headA = frame.dataByPlayer.get('a')!.at(-1)!;
    expect(headA.x).toBe(0.5);
    expect(headA.y).toBeCloseTo(5);
    expect(frame.heads.get('a')!.x).toBe(0.5);
  });

  it('stops at the final round even if asked to go further', () => {
    const frame = buildScoreRaceFrame(totals, 99);
    expect(frame.dataByPlayer.get('a')!.at(-1)).toMatchObject({ x: 2, y: 8 });
    expect(frame.heads.get('b')!.x).toBe(2);
  });

  it('staggers heads that share a running total so both faces stay visible', () => {
    const tied = new Map([
      ['a', [4]],
      ['b', [4]],
    ]);
    const frame = buildScoreRaceFrame(tied, 0);
    const staggers = [frame.heads.get('a')!.staggerPx, frame.heads.get('b')!.staggerPx];
    expect(staggers.sort()).toEqual([0, 16]);
  });

  it('returns an empty frame when there are no rounds', () => {
    const frame = buildScoreRaceFrame(new Map(), 0);
    expect(frame.dataByPlayer.size).toBe(0);
    expect(scoreRaceFinish(0)).toBe(0);
  });
});

describe('leadersByRound', () => {
  it('crowns the highest total as the leader for highest-first games', () => {
    const leaders = leadersByRound(cumulativeTotals(rows), 'highest-first');
    expect(leaders.get(0)).toEqual(new Set(['a']));
    expect(leaders.get(1)).toEqual(new Set(['b']));
    expect(leaders.get(2)).toEqual(new Set(['a']));
  });

  it('crowns the lowest total for lowest-first games', () => {
    const leaders = leadersByRound(cumulativeTotals(rows), 'lowest-first');
    expect(leaders.get(0)).toEqual(new Set(['b']));
    expect(leaders.get(1)).toEqual(new Set(['a']));
  });

  it('does not crown everyone when every player is tied', () => {
    const tied = cumulativeTotals([
      { playerId: 'a', cells: [3] },
      { playerId: 'b', cells: [3] },
    ]);
    expect(leadersByRound(tied, 'highest-first').size).toBe(0);
  });
});
