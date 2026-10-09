import { describe, it, expect } from 'vitest';
import type { MatchStanding } from '@/lib/db/collections';
import type { LeaderboardEntry } from './ranking';
import { START_RATING } from './rating';
import {
  buildPlayerStats,
  leaderOf,
  toStandings,
  rankAmongPlayed,
  MatchStandingsRecord,
  roundScoresWithinCutoff,
  withGameRuns,
  resolveMilestones,
  toMilestoneStats,
  emptyPlayerStats,
} from './playerStats';

function standing(
  playerId: string,
  position: number,
  overrides: Partial<MatchStanding> = {}
): MatchStanding {
  return {
    playerId,
    position,
    total: position * 10,
    gamesWon: 0,
    roundsPlayed: 4,
    isDnf: false,
    isSharedPosition: false,
    ...overrides,
  };
}

function record(
  matchId: string,
  standings: MatchStanding[],
  overrides: Partial<MatchStandingsRecord> = {}
): MatchStandingsRecord {
  return {
    matchId,
    status: 'ended',
    roundsPlayed: 4,
    createdAt: new Date('2026-01-01'),
    endedAt: new Date('2026-01-01'),
    standings,
    ...overrides,
  };
}

const roster = [
  { userId: 'a', userName: 'Alice' },
  { userId: 'b', userName: 'Bob' },
  { userId: 'c', userName: 'Cara' },
];

describe('toStandings', () => {
  it('keeps only the fields cached on the match', () => {
    const entry: LeaderboardEntry = {
      position: 1,
      playerId: 'a',
      name: 'Alice',
      total: 12,
      average: 3,
      stdDev: 1,
      roundsPlayed: 4,
      gapToLeader: 0,
      gapToAhead: null,
      isDnf: false,
      isSharedPosition: true,
      isLast: false,
      gamesWon: 2,
    };
    expect(toStandings([entry])).toEqual([
      {
        playerId: 'a',
        position: 1,
        total: 12,
        gamesWon: 2,
        roundsPlayed: 4,
        isDnf: false,
        isSharedPosition: true,
      },
    ]);
  });
});

describe('rankAmongPlayed', () => {
  it('ignores players with no rounds and puts DNF last', () => {
    const ranked = rankAmongPlayed([
      standing('late', 1, { roundsPlayed: 0, total: 0 }),
      standing('a', 2),
      standing('b', 3),
      standing('quit', 4, { isDnf: true }),
    ]);
    expect(ranked.map((s) => [s.playerId, s.rank])).toEqual([
      ['a', 1],
      ['b', 2],
      ['quit', 3],
    ]);
  });
});

describe('leaderOf', () => {
  it('returns null when nobody has played', () => {
    expect(leaderOf(undefined, roster)).toBeNull();
    expect(leaderOf([standing('a', 1, { roundsPlayed: 0 })], roster)).toBeNull();
  });

  it('names the leader and flags ties', () => {
    expect(leaderOf([standing('a', 1), standing('b', 2)], roster)).toEqual({
      playerId: 'a',
      name: 'Alice',
      total: 10,
      isTied: false,
    });
    const tied = leaderOf(
      [standing('b', 1, { isSharedPosition: true }), standing('c', 1, { isSharedPosition: true })],
      roster
    );
    expect(tied).toMatchObject({ playerId: 'b', name: 'Bob', isTied: true });
  });
});

describe('buildPlayerStats', () => {
  it('aggregates wins, podiums, games and average rank from ended matches', () => {
    const { stats } = buildPlayerStats([
      record('m1', [
        standing('a', 1, { gamesWon: 3 }),
        standing('b', 2, { gamesWon: 1 }),
        standing('c', 3),
      ]),
      record(
        'm2',
        [standing('b', 1, { gamesWon: 2 }), standing('a', 2, { gamesWon: 2 })],
        { endedAt: new Date('2026-01-02') }
      ),
    ]);

    const a = stats.get('a')!;
    expect(a).toMatchObject({
      matchesPlayed: 2,
      matchWins: 1,
      podiums: { first: 1, second: 1, third: 0 },
      gamesWon: 5,
      gamesPlayed: 8,
      averageRank: 1.5,
      ratedMatches: 2,
    });
    expect(a.winPct).toBeCloseTo(5 / 8);
    expect(stats.get('c')!.podiums.third).toBe(1);
    expect(stats.get('c')!.rating).toBeLessThan(START_RATING);
  });

  it('counts shared first place as a win for everyone tied', () => {
    const { stats } = buildPlayerStats([
      record('m1', [
        standing('a', 1, { isSharedPosition: true }),
        standing('b', 1, { isSharedPosition: true }),
        standing('c', 3),
      ]),
    ]);
    expect(stats.get('a')!.matchWins).toBe(1);
    expect(stats.get('b')!.matchWins).toBe(1);
    expect(stats.get('c')!.podiums).toEqual({ first: 0, second: 0, third: 1 });
  });

  it('counts games from active matches but not wins, podiums or rating', () => {
    const { stats } = buildPlayerStats([
      record('live', [standing('a', 1, { gamesWon: 2 }), standing('b', 2)], {
        status: 'active',
        endedAt: null,
      }),
    ]);
    expect(stats.get('a')).toMatchObject({
      matchesPlayed: 1,
      matchWins: 0,
      gamesWon: 2,
      gamesPlayed: 4,
      rating: START_RATING,
      ratedMatches: 0,
      averageRank: 0,
    });
  });

  it('excludes DNF players from played counts but still rates them last', () => {
    const { stats, ratings } = buildPlayerStats([
      record('m1', [
        standing('a', 1),
        standing('b', 2),
        standing('quit', 3, { isDnf: true, gamesWon: 1 }),
      ]),
    ]);
    expect(stats.get('quit')).toMatchObject({ matchesPlayed: 0, gamesWon: 0, gamesPlayed: 0 });
    expect(ratings.get('quit')!.lastDelta).toBeLessThan(0);
    expect(stats.get('quit')!.rating).toBeLessThan(stats.get('b')!.rating);
  });

  it('skips matches with no rounds', () => {
    const { stats } = buildPlayerStats([
      record('empty', [standing('a', 1, { roundsPlayed: 0 })], { roundsPlayed: 0 }),
    ]);
    expect(stats.size).toBe(0);
  });
});

describe('roundScoresWithinCutoff', () => {
  it('groups scores by round and drops rounds after a DNF cutoff or for non-roster players', () => {
    const rounds = roundScoresWithinCutoff(
      [
        { userId: 'a', dnfAfterRound: null },
        { userId: 'quit', dnfAfterRound: 1 },
      ],
      [
        { playerId: 'a', round: 1, value: 3 },
        { playerId: 'quit', round: 1, value: 2 },
        { playerId: 'a', round: 2, value: 5 },
        { playerId: 'quit', round: 2, value: 0 },
        { playerId: 'ghost', round: 2, value: 0 },
      ]
    );
    expect(rounds).toEqual([
      { round: 1, scores: [{ playerId: 'a', value: 3 }, { playerId: 'quit', value: 2 }] },
      { round: 2, scores: [{ playerId: 'a', value: 5 }] },
    ]);
  });
});

describe('withGameRuns', () => {
  it('attaches runs and the trailing run, defaulting players without rounds to zero', () => {
    const rounds = [1, 2, 3].map((round) => ({
      round,
      scores: [
        { playerId: 'a', value: 1 },
        { playerId: 'b', value: 9 },
      ],
    }));
    const result = withGameRuns([standing('a', 1), standing('b', 2), standing('late', 3)], rounds, 'lowest-first');
    expect(result.map((s) => [s.playerId, s.gameRuns, s.currentGameRun])).toEqual([
      ['a', [3], 3],
      ['b', [], 0],
      ['late', [], 0],
    ]);
  });
});

describe('buildPlayerStats streaks', () => {
  it('collects game runs across matches without joining them and takes the current run from the latest active match', () => {
    const { stats } = buildPlayerStats([
      record('m1', [standing('a', 1, { gameRuns: [3, 2], currentGameRun: 2 })]),
      record('m2', [standing('a', 1, { gameRuns: [6], currentGameRun: 0 })], {
        endedAt: new Date('2026-01-02'),
      }),
      record('old-live', [standing('a', 1, { gameRuns: [1], currentGameRun: 1 })], {
        status: 'active',
        endedAt: null,
        createdAt: new Date('2026-01-03'),
      }),
      record('new-live', [standing('a', 1, { gameRuns: [4], currentGameRun: 4 })], {
        status: 'active',
        endedAt: null,
        createdAt: new Date('2026-01-04'),
      }),
    ]);
    expect(stats.get('a')!.streaks).toMatchObject({
      longestGameStreak: 6,
      currentGameStreak: 4,
      gameStreakCounts: { 3: 3, 4: 2, 5: 1, 6: 1 },
    });
  });

  it('has no current game streak when no match is active', () => {
    const { stats } = buildPlayerStats([
      record('m1', [standing('a', 1, { gameRuns: [3], currentGameRun: 3 })]),
    ]);
    expect(stats.get('a')!.streaks.currentGameStreak).toBe(0);
  });

  it('orders match streaks by end time and breaks them on DNF or a non-first finish', () => {
    const day = (d: number) => new Date(`2026-01-${String(d).padStart(2, '0')}`);
    const { stats } = buildPlayerStats([
      record('m3', [standing('a', 1), standing('b', 2)], { endedAt: day(3) }),
      record('m1', [standing('a', 1), standing('b', 2)], { endedAt: day(1) }),
      record('m2', [standing('a', 1), standing('b', 2)], { endedAt: day(2) }),
      record('m4', [standing('b', 1), standing('a', 2, { isDnf: true })], { endedAt: day(4) }),
      record('m5', [standing('a', 1, { isSharedPosition: true }), standing('b', 1, { isSharedPosition: true })], {
        endedAt: day(5),
      }),
      record('live', [standing('b', 1)], { status: 'active', endedAt: null }),
    ]);
    expect(stats.get('a')!.streaks).toMatchObject({ longestMatchStreak: 3, currentMatchStreak: 1 });
    expect(stats.get('b')!.streaks).toMatchObject({ longestMatchStreak: 2, currentMatchStreak: 2 });
  });

  it('derives day streaks from the active days passed in', () => {
    const { stats } = buildPlayerStats(
      [record('m1', [standing('a', 1), standing('b', 2)])],
      new Map([['a', ['2026-01-03', '2026-01-01', '2026-01-02', '2026-01-05']]])
    );
    expect(stats.get('a')!.streaks).toMatchObject({
      longestDayStreak: 3,
      currentDayStreak: 1,
      lastActiveDay: '2026-01-05',
    });
    expect(stats.get('b')!.streaks).toMatchObject({ longestDayStreak: 0, lastActiveDay: null });
  });
});

describe('resolveMilestones', () => {
  const achievedAt = new Date('2026-02-01');
  const stats = toMilestoneStats({
    ...emptyPlayerStats('a'),
    matchWins: 1,
    matchesPlayed: 1,
  });

  it('records everything silently on the first run', () => {
    const result = resolveMilestones(null, stats, achievedAt);
    expect(result.milestones.map((m) => m.id)).toEqual(['matchWins:1', 'matchesPlayed:1']);
    expect(result.toNotify).toEqual([]);
  });

  it('notifies only milestones that were not already achieved and keeps old dates', () => {
    const earlier = new Date('2026-01-01');
    const result = resolveMilestones([{ id: 'matchesPlayed:1', achievedAt: earlier }], stats, achievedAt);
    expect(result.toNotify.map((m) => m.id)).toEqual(['matchWins:1']);
    expect(result.milestones).toEqual([
      { id: 'matchesPlayed:1', achievedAt: earlier },
      { id: 'matchWins:1', achievedAt },
    ]);
  });

  it('never revokes a milestone when stats drop', () => {
    const result = resolveMilestones(
      [{ id: 'gamesWon:10', achievedAt }],
      toMilestoneStats(emptyPlayerStats('a')),
      achievedAt
    );
    expect(result.milestones.map((m) => m.id)).toEqual(['gamesWon:10']);
    expect(result.toNotify).toEqual([]);
  });
});
