import { describe, it, expect } from 'vitest';
import {
  ALL_MILESTONES,
  ordinal,
  tierFor,
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
  podiumFinishes: 0,
  peakRating: 0,
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

  it('measures progress as the share of the next threshold already reached', () => {
    const games = milestoneProgress({ ...ZERO, gamesWon: 40 }, []).find(
      (p) => p.track.metric === 'gamesWon'
    )!;
    expect(games.next!.threshold).toBe(50);
    expect(games.progressToNext).toBeCloseTo(40 / 50);
  });

  it('shows a half-full bar when sitting on a threshold halfway to the next', () => {
    const played = milestoneProgress({ ...ZERO, gamesPlayed: 250 }, []).find(
      (p) => p.track.metric === 'gamesPlayed'
    )!;
    expect(played.next!.threshold).toBe(500);
    expect(played.progressToNext).toBeCloseTo(0.5);
  });

  it('keeps a recorded milestone even if the stat later drops', () => {
    const games = milestoneProgress({ ...ZERO, gamesWon: 9 }, ['gamesWon:10']).find(
      (p) => p.track.metric === 'gamesWon'
    )!;
    expect(games.achieved.map((m) => m.threshold)).toEqual([10]);
    expect(games.next!.threshold).toBe(25);
  });

  it('unlocks peak rating and podium milestones from their own stats', () => {
    const ids = reachedMilestones({ ...ZERO, peakRating: 1420, podiumFinishes: 5 }).map((m) => m.id);
    expect(ids).toEqual(['podiumFinishes:1', 'podiumFinishes:5', 'peakRating:1300', 'peakRating:1400']);
  });

  it('gives every milestone a hero emoji and a unique id', () => {
    expect(ALL_MILESTONES.every((m) => m.emoji.length > 0)).toBe(true);
    expect(new Set(ALL_MILESTONES.map((m) => m.id)).size).toBe(ALL_MILESTONES.length);
  });

  it('spreads levels across four tiers from bronze to legend', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => tierFor(i, 9))).toEqual([
      'Bronze', 'Bronze', 'Bronze', 'Silver', 'Silver', 'Gold', 'Gold', 'Legend', 'Legend',
    ]);
  });

  it('reports the tier and position of a milestone', () => {
    const top = findMilestone(milestoneId('gamesWon', 2000))!;
    expect(top.tier).toBe('Legend');
    expect(top.levelIndex).toBe(12);
    expect(top.levelCount).toBe(13);
  });

  it('keeps headroom above active players on the busiest tracks', () => {
    const tops = Object.fromEntries(
      ['gamesWon', 'gamesPlayed', 'podiumFinishes'].map((metric) => [
        metric,
        Math.max(...ALL_MILESTONES.filter((m) => m.metric === metric).map((m) => m.threshold)),
      ])
    );
    expect(tops).toEqual({ gamesWon: 2000, gamesPlayed: 5000, podiumFinishes: 250 });
  });

  it('never reuses an existing milestone id when levels are added', () => {
    for (const id of ['gamesWon:500', 'gamesPlayed:1000', 'podiumFinishes:50', 'peakRating:1600']) {
      expect(findMilestone(id)).not.toBeNull();
    }
  });
});
