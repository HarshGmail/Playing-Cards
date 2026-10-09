import { describe, it, expect } from 'vitest';
import {
  ordinal,
  milestoneId,
  findMilestone,
  reachedMilestones,
  newlyReachedMilestones,
  mergeAchieved,
  milestoneProgress,
  MilestoneStats,
} from './milestones';

const ZERO: MilestoneStats = {
  gamesWon: 0,
  matchWins: 0,
  matchesPlayed: 0,
  gamesPlayed: 0,
  longestGameStreak: 0,
  longestMatchStreak: 0,
  longestDayStreak: 0,
};

describe('ordinal', () => {
  it('handles teens and regular suffixes', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 25, 50, 75, 100, 112].map(ordinal)).toEqual([
      '1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '25th', '50th', '75th', '100th', '112th',
    ]);
  });
});

describe('milestones', () => {
  it('includes the requested game and match win thresholds', () => {
    for (const n of [25, 50, 75, 100]) expect(findMilestone(milestoneId('gamesWon', n))).not.toBeNull();
    for (const n of [10, 25, 50, 100]) expect(findMilestone(milestoneId('matchWins', n))).not.toBeNull();
    expect(findMilestone(milestoneId('gamesWon', 50))!.title).toBe('50th game win');
  });

  it('reports only what the stats have reached', () => {
    const ids = reachedMilestones({ ...ZERO, gamesWon: 26, longestGameStreak: 3 }).map((m) => m.id);
    expect(ids).toEqual(['gamesWon:10', 'gamesWon:25', 'longestGameStreak:3']);
  });

  it('skips milestones already recorded', () => {
    const fresh = newlyReachedMilestones({ ...ZERO, gamesWon: 26 }, ['gamesWon:10']);
    expect(fresh.map((m) => m.id)).toEqual(['gamesWon:25']);
  });

  it('keeps the original achievedAt when merging', () => {
    const first = new Date('2026-01-01');
    const later = new Date('2026-02-01');
    const merged = mergeAchieved(
      [{ id: 'gamesWon:10', achievedAt: first }],
      reachedMilestones({ ...ZERO, gamesWon: 30 }),
      later
    );
    expect(merged).toEqual([
      { id: 'gamesWon:10', achievedAt: first },
      { id: 'gamesWon:25', achievedAt: later },
    ]);
  });

  it('measures progress from the last reached threshold to the next', () => {
    const games = milestoneProgress({ ...ZERO, gamesWon: 40 }, []).find(
      (p) => p.track.metric === 'gamesWon'
    )!;
    expect(games.next!.threshold).toBe(50);
    expect(games.progressToNext).toBeCloseTo((40 - 25) / (50 - 25));
  });

  it('keeps a recorded milestone even if the stat later drops', () => {
    const games = milestoneProgress({ ...ZERO, gamesWon: 9 }, ['gamesWon:10']).find(
      (p) => p.track.metric === 'gamesWon'
    )!;
    expect(games.achieved.map((m) => m.threshold)).toEqual([10]);
    expect(games.next!.threshold).toBe(25);
  });
});
