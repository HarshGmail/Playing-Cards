import { describe, it, expect } from 'vitest';
import {
  runLengths,
  trailingRun,
  countRunsAtLeast,
  summarizeSequence,
  summarizeRuns,
  gameRunsByPlayer,
  dayKey,
  dayStreaks,
  liveDayStreak,
} from './streaks';

const W = true;
const L = false;

describe('runLengths / trailingRun', () => {
  it('splits a sequence into winning runs', () => {
    expect(runLengths([W, W, L, W, W, W, L, L, W])).toEqual([2, 3, 1]);
    expect(runLengths([])).toEqual([]);
  });

  it('measures the run still going at the end', () => {
    expect(trailingRun([W, L, W, W])).toBe(2);
    expect(trailingRun([W, W, L])).toBe(0);
  });
});

describe('countRunsAtLeast', () => {
  it('counts a long run once in every tier it reaches', () => {
    expect(countRunsAtLeast([3, 6, 2, 4])).toEqual({ 3: 3, 4: 2, 5: 1, 6: 1 });
  });
});

describe('summarizeSequence', () => {
  it('reports longest, current and tier counts', () => {
    expect(summarizeSequence([W, W, W, L, W, W])).toEqual({
      longest: 3,
      current: 2,
      atLeast: { 3: 1, 4: 0, 5: 0, 6: 0 },
    });
  });
});

describe('gameRunsByPlayer', () => {
  const rounds = [
    { round: 2, scores: [{ playerId: 'a', value: 5 }, { playerId: 'b', value: 9 }] },
    { round: 1, scores: [{ playerId: 'a', value: 3 }, { playerId: 'b', value: 7 }] },
    { round: 3, scores: [{ playerId: 'a', value: 4 }, { playerId: 'b', value: 4 }] },
    { round: 4, scores: [{ playerId: 'a', value: 8 }, { playerId: 'b', value: 1 }] },
  ];

  it('orders rounds and treats a shared best score as a win for both', () => {
    const runs = gameRunsByPlayer(rounds, 'lowest-first');
    expect(runs.get('a')).toEqual({ runs: [3], current: 0 });
    expect(runs.get('b')).toEqual({ runs: [2], current: 2 });
  });

  it('resets the current streak after a loss while keeping the longest run', () => {
    const roundsWonBy = (winners: string[]) =>
      winners.map((winner, i) => ({
        round: i + 1,
        scores: [
          { playerId: 'a', value: winner === 'a' ? 0 : 10 },
          { playerId: 'b', value: winner === 'b' ? 0 : 10 },
        ],
      }));
    const history = ['a', 'a', 'a', 'b', 'a', 'a'];

    const afterThree = gameRunsByPlayer(roundsWonBy(history.slice(0, 3)), 'lowest-first').get('a')!;
    const afterLoss = gameRunsByPlayer(roundsWonBy(history.slice(0, 4)), 'lowest-first').get('a')!;
    const afterTwoMore = gameRunsByPlayer(roundsWonBy(history), 'lowest-first').get('a')!;

    expect(afterThree.current).toBe(3);
    expect(afterLoss.current).toBe(0);
    expect(afterTwoMore.current).toBe(2);
    expect(summarizeRuns(afterTwoMore.runs, afterTwoMore.current)).toEqual({
      longest: 3,
      current: 2,
      atLeast: { 3: 1, 4: 0, 5: 0, 6: 0 },
    });
  });

  it('skips rounds a player sat out instead of breaking their run', () => {
    const withGap = [
      { round: 1, scores: [{ playerId: 'a', value: 1 }, { playerId: 'b', value: 5 }] },
      { round: 2, scores: [{ playerId: 'b', value: 5 }, { playerId: 'c', value: 9 }] },
      { round: 3, scores: [{ playerId: 'a', value: 1 }, { playerId: 'b', value: 5 }] },
    ];
    expect(gameRunsByPlayer(withGap, 'lowest-first').get('a')).toEqual({ runs: [2], current: 2 });
  });
});

describe('day streaks', () => {
  it('keys days in the app time zone', () => {
    expect(dayKey(new Date('2026-10-08T20:00:00Z'))).toBe('2026-10-09');
  });

  it('finds the longest and latest run of consecutive days', () => {
    const days = ['2026-10-01', '2026-10-02', '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-07'];
    expect(dayStreaks(days)).toEqual({ longest: 3, current: 3, lastActiveDay: '2026-10-07' });
    expect(dayStreaks([])).toEqual({ longest: 0, current: 0, lastActiveDay: null });
  });

  it('keeps the streak alive today and tomorrow, then resets it', () => {
    expect(liveDayStreak(3, '2026-10-07', '2026-10-07')).toBe(3);
    expect(liveDayStreak(3, '2026-10-07', '2026-10-08')).toBe(3);
    expect(liveDayStreak(3, '2026-10-07', '2026-10-09')).toBe(0);
  });
});
