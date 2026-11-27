import { describe, it, expect } from 'vitest';
import { ALL_GAMES_KEY } from '@/lib/games/catalog';
import {
  buildLeaderboard,
  rankableStatsFor,
  rankByMetric,
  type LeaderboardSource,
  type RankableStats,
} from './leaderboard';

function stats(userId: string, overrides: Partial<RankableStats>): RankableStats {
  return {
    userId,
    rating: 1200,
    matchWinRate: 0,
    matchWins: 0,
    podiums: { first: 0, second: 0, third: 0 },
    gamesWon: 0,
    gamesPlayed: 0,
    matchesPlayed: 0,
    ...overrides,
  };
}

const identity = (name: string) => ({ name, username: name.toLowerCase(), profilePicUrl: null });

describe('rankByMetric', () => {
  const entries = [
    { stats: stats('z', { rating: 1250, matchWins: 1, matchWinRate: 0.5, matchesPlayed: 10 }), identity: identity('Zed') },
    { stats: stats('a', { rating: 1250, matchWins: 1, matchWinRate: 0.5, matchesPlayed: 4 }), identity: identity('Amy') },
    { stats: stats('b', { rating: 1250, matchWins: 3, matchWinRate: 0.2, matchesPlayed: 20 }), identity: identity('Ben') },
    { stats: stats('c', { rating: 1100, matchWinRate: 0.6, matchesPlayed: 5 }), identity: identity('Cat') },
  ];

  it('orders by rating, then match wins, then name, sharing ranks on exact ties', () => {
    const rows = rankByMetric('rating', entries, 'a');
    expect(rows.map((r) => [r.name, r.rank])).toEqual([
      ['Ben', 1],
      ['Amy', 2],
      ['Zed', 2],
      ['Cat', 4],
    ]);
    expect(rows.find((r) => r.isSelf)?.userId).toBe('a');
  });

  it('orders by match win rate, then matches played', () => {
    const rows = rankByMetric('winPct', entries, 'a');
    expect(rows.map((r) => [r.name, r.rank])).toEqual([
      ['Cat', 1],
      ['Zed', 2],
      ['Amy', 3],
      ['Ben', 4],
    ]);
  });
});

describe('rankByMetric win counts', () => {
  const entries = [
    { stats: stats('a', { matchWins: 2, rating: 1300, gamesWon: 10 }), identity: identity('Amy') },
    { stats: stats('b', { matchWins: 2, rating: 1250, gamesWon: 10 }), identity: identity('Ben') },
    { stats: stats('c', { matchWins: 5, rating: 1100, gamesWon: 4 }), identity: identity('Cat') },
  ];

  it('orders by match wins, then rating', () => {
    const rows = rankByMetric('matchWins', entries, 'a');
    expect(rows.map((r) => [r.name, r.rank])).toEqual([
      ['Cat', 1],
      ['Amy', 2],
      ['Ben', 3],
    ]);
  });

  it('orders by game wins, then match wins, sharing a rank on a full tie', () => {
    const rows = rankByMetric('gamesWon', entries, 'a');
    expect(rows.map((r) => [r.name, r.rank])).toEqual([
      ['Amy', 1],
      ['Ben', 1],
      ['Cat', 3],
    ]);
  });
});

describe('rankByMetric current streaks', () => {
  it('copies current streaks onto rows and defaults missing ones to zero', () => {
    const rows = rankByMetric(
      'rating',
      [
        {
          stats: stats('a', { rating: 1300, streaks: { currentGameStreak: 3, currentMatchStreak: 2 } }),
          identity: identity('Amy'),
        },
        { stats: stats('b', {}), identity: identity('Ben') },
      ],
      'a'
    );
    expect(rows.map((r) => [r.name, r.currentGameStreak, r.currentMatchStreak])).toEqual([
      ['Amy', 3, 2],
      ['Ben', 0, 0],
    ]);
  });
});

describe('rankableStatsFor', () => {
  const source: LeaderboardSource = {
    userId: 'u',
    rating: 1211,
    matchesPlayed: 56,
    matchWins: 19,
    gamesWon: 201,
    gamesPlayed: 628,
    podiums: { first: 19, second: 13, third: 19 },
    ratingsByGame: {
      'least-count': {
        rating: 1211,
        ratedMatches: 30,
        record: { matchesPlayed: 36, matchWins: 13, gamesWon: 101, gamesPlayed: 289 },
      },
      'exploding-kittens': { rating: 1180, ratedMatches: 0 },
    },
  };

  it('uses every game combined for the all-included view', () => {
    expect(rankableStatsFor(source, ALL_GAMES_KEY)).toMatchObject({
      matchesPlayed: 56,
      matchWins: 19,
      gamesWon: 201,
      matchWinRate: 19 / 56,
    });
  });

  it('uses the format record and format rating for a single game', () => {
    expect(rankableStatsFor(source, 'least-count')).toMatchObject({
      rating: 1211,
      matchesPlayed: 36,
      matchWins: 13,
      gamesWon: 101,
      gamesPlayed: 289,
      matchWinRate: 13 / 36,
    });
  });

  it('leaves out players with no rated match in that format', () => {
    expect(rankableStatsFor(source, 'exploding-kittens')).toBeNull();
    expect(rankableStatsFor(source, 'never-played')).toBeNull();
  });
});

describe('buildLeaderboard', () => {
  const entries = ['a', 'b', 'c', 'd'].map((id, index) => ({
    stats: stats(id, { matchWins: 10 - index }),
    identity: identity(id.toUpperCase()),
  }));

  it('keeps the top rows and still reports the viewer rank when they fall outside them', () => {
    const { rows, self } = buildLeaderboard('matchWins', entries, 'd', 2);
    expect(rows.map((row) => row.userId)).toEqual(['a', 'b']);
    expect(self).toMatchObject({ userId: 'd', rank: 4 });
  });
});
