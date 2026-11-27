import { describe, it, expect } from 'vitest';
import { isFeedWorthy, orderFeed, toFriendMatchCard, type FeedMatch } from './friendsFeed';

const NOW = new Date('2026-11-27T12:00:00Z');

function feedMatch(overrides: Partial<FeedMatch> & Pick<FeedMatch, 'id'>): FeedMatch {
  return {
    name: 'Friday cards',
    status: 'ended',
    roundsPlayed: 10,
    createdAt: new Date('2026-11-26T18:00:00Z'),
    endedAt: new Date('2026-11-26T20:00:00Z'),
    gameType: 'least-count',
    gameLabel: null,
    roster: [
      { userId: 'f1', userName: 'Vinay' },
      { userId: 'x', userName: 'Stranger' },
    ],
    standings: [],
    ...overrides,
  };
}

function standing(playerId: string, position: number, total: number, isDnf = false) {
  return { playerId, position, total, gamesWon: 0, roundsPlayed: 5, isDnf, isSharedPosition: false };
}

describe('isFeedWorthy', () => {
  it('hides matches the viewer is already in', () => {
    const mine = feedMatch({ id: 'm', roster: [{ userId: 'me', userName: 'Me' }] });
    expect(isFeedWorthy(mine, 'me', NOW)).toBe(false);
  });

  it('shows live matches once a round is in and recent results only', () => {
    expect(isFeedWorthy(feedMatch({ id: 'a', status: 'active', endedAt: null, roundsPlayed: 2 }), 'me', NOW)).toBe(true);
    expect(isFeedWorthy(feedMatch({ id: 'b', status: 'active', endedAt: null, roundsPlayed: 0 }), 'me', NOW)).toBe(false);
    expect(isFeedWorthy(feedMatch({ id: 'c' }), 'me', NOW)).toBe(true);
    expect(isFeedWorthy(feedMatch({ id: 'd', endedAt: new Date('2026-10-01T00:00:00Z') }), 'me', NOW)).toBe(false);
  });
});

describe('orderFeed', () => {
  it('puts live matches first, then the most recently finished', () => {
    const ordered = orderFeed([
      feedMatch({ id: 'older', endedAt: new Date('2026-11-20T00:00:00Z') }),
      feedMatch({ id: 'live', status: 'active', endedAt: null }),
      feedMatch({ id: 'newer', endedAt: new Date('2026-11-26T00:00:00Z') }),
    ]);
    expect(ordered.map((m) => m.id)).toEqual(['live', 'newer', 'older']);
  });
});

describe('toFriendMatchCard', () => {
  it('names the friends playing and keeps the top three finishers in order', () => {
    const card = toFriendMatchCard(
      feedMatch({
        id: 'm1',
        roster: [
          { userId: 'f1', userName: 'Vinay' },
          { userId: 'f2', userName: 'Bot' },
          { userId: 'x', userName: 'Stranger' },
          { userId: 'y', userName: 'Quit' },
        ],
        standings: [
          standing('x', 2, 40),
          standing('f2', 3, 55),
          standing('y', 1, 10, true),
          standing('f1', 1, 30),
        ],
      }),
      new Set(['f1', 'f2']),
      new Map([['f1', { username: 'vinay', profilePicUrl: null }]])
    );
    expect(card.friendNames).toEqual(['Vinay', 'Bot']);
    expect(card.gameName).toBe('Least Count');
    expect(card.standings.map((s) => [s.name, s.position, s.total])).toEqual([
      ['Vinay', 1, 30],
      ['Stranger', 2, 40],
      ['Bot', 3, 55],
    ]);
    expect(card.standings[0].username).toBe('vinay');
  });
});
