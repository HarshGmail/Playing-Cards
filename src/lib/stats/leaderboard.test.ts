import { describe, it, expect } from 'vitest';
import { rankByMetric, RankableStats } from './leaderboard';

function stats(userId: string, overrides: Partial<RankableStats>): RankableStats {
  return {
    userId,
    rating: 1200,
    winPct: 0,
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
    { stats: stats('z', { rating: 1250, matchWins: 1, winPct: 0.5, gamesPlayed: 10 }), identity: identity('Zed') },
    { stats: stats('a', { rating: 1250, matchWins: 1, winPct: 0.5, gamesPlayed: 4 }), identity: identity('Amy') },
    { stats: stats('b', { rating: 1250, matchWins: 3, winPct: 0.2, gamesPlayed: 20 }), identity: identity('Ben') },
    { stats: stats('c', { rating: 1100, winPct: 0.6, gamesPlayed: 5 }), identity: identity('Cat') },
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

  it('orders by win percentage, then games played', () => {
    const rows = rankByMetric('winPct', entries, 'a');
    expect(rows.map((r) => [r.name, r.rank])).toEqual([
      ['Cat', 1],
      ['Zed', 2],
      ['Amy', 3],
      ['Ben', 4],
    ]);
  });
});
