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
