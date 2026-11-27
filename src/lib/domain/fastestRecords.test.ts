import { describe, it, expect } from 'vitest';
import {
  fastestRecords,
  firstReaches,
  gameWinEvents,
  matchWinEvents,
  progressOf,
  RECORD_THRESHOLDS,
  recordsOnTheLine,
  type PlayEvent,
  type RecordMatch,
} from './fastestRecords';

function standing(playerId: string, position: number, isDnf = false) {
  return { playerId, position, total: 0, gamesWon: 0, roundsPlayed: 1, isDnf, isSharedPosition: false };
}

function match(overrides: Partial<RecordMatch> & Pick<RecordMatch, 'matchId'>): RecordMatch {
  return {
    status: 'ended',
    createdAt: '2026-01-01T10:00:00Z',
    endedAt: '2026-01-01T12:00:00Z',
    rankPreference: 'highest-first',
    roster: [
      { userId: 'a', dnfAfterRound: null },
      { userId: 'b', dnfAfterRound: null },
    ],
    standings: [standing('a', 1), standing('b', 2)],
    scores: [],
    ...overrides,
  };
}

function events(sequence: Array<[string, boolean]>): PlayEvent[] {
  return sequence.map(([playerId, won], index) => ({
    playerId,
    won,
    at: `2026-01-0${(index % 9) + 1}T00:00:00Z`,
    matchId: `m${index}`,
  }));
}

describe('matchWinEvents', () => {
  it('orders ended matches by end time and skips active matches and DNF players', () => {
    const list = matchWinEvents([
      match({ matchId: 'later', endedAt: '2026-01-03T00:00:00Z' }),
      match({ matchId: 'live', status: 'active', endedAt: null }),
      match({
        matchId: 'earlier',
        endedAt: '2026-01-02T00:00:00Z',
        standings: [standing('b', 1), standing('a', 2, true)],
      }),
    ]);
    expect(list.map((e) => [e.matchId, e.playerId, e.won])).toEqual([
      ['earlier', 'b', true],
      ['later', 'a', true],
      ['later', 'b', false],
    ]);
  });
});

describe('gameWinEvents', () => {
  it('walks rounds in order, sharing a tied best score, and includes live matches', () => {
    const list = gameWinEvents([
      match({
        matchId: 'live',
        status: 'active',
        endedAt: null,
        scores: [
          { playerId: 'a', round: 2, value: 5 },
          { playerId: 'b', round: 2, value: 5 },
          { playerId: 'a', round: 1, value: 9 },
          { playerId: 'b', round: 1, value: 3 },
        ],
      }),
    ]);
    expect(list.map((e) => [e.playerId, e.won])).toEqual([
      ['a', true],
      ['b', false],
      ['a', true],
      ['b', true],
    ]);
  });
});

describe('fastest records', () => {
  it('records how many plays each player needed and picks the fewest', () => {
    const reached = firstReaches(
      events([
        ['a', false],
        ['b', true],
        ['a', true],
      ]),
      [1]
    );
    expect(reached.get('a')!.get(1)!.count).toBe(2);
    expect(reached.get('b')!.get(1)!.count).toBe(1);
    expect(fastestRecords('matchWins', reached)[0].holder.playerId).toBe('b');
  });

  it('gives a tie to whoever got there first', () => {
    const reached = firstReaches(
      events([
        ['a', true],
        ['b', true],
      ]),
      [1]
    );
    expect(fastestRecords('matchWins', reached)[0].holder.playerId).toBe('a');
  });

  it('lists only thresholds someone has reached', () => {
    const reached = firstReaches(events([['a', true]]), RECORD_THRESHOLDS.matchWins);
    expect(fastestRecords('matchWins', reached).map((r) => r.threshold)).toEqual([1]);
  });

  it('counts wins and plays per player', () => {
    expect(progressOf(events([['a', true], ['a', false], ['b', true]])).get('a')).toEqual({ wins: 1, played: 2 });
  });
});

describe('recordsOnTheLine', () => {
  const holder = (count: number) => ({ playerId: 'x', count, at: '2026-01-01T00:00:00Z', matchId: 'm', sequence: 0 });
  const noMatchWinThresholdInReach = new Map([['a', { wins: 2, played: 8 }]]);

  it('flags a match-win record a player breaks by winning this match', () => {
    const chances = recordsOnTheLine({
      playerIds: ['a'],
      matchWinRecords: [{ kind: 'matchWins', threshold: 5, holder: holder(9) }],
      gameWinRecords: [],
      matchWinProgress: new Map([['a', { wins: 4, played: 6 }]]),
      gameWinProgress: new Map(),
    });
    expect(chances).toEqual([
      expect.objectContaining({ kind: 'matchWins', threshold: 5, newCount: 7, winsNeeded: 1 }),
    ]);
  });

  it('skips a match-win record the player could only tie', () => {
    const chances = recordsOnTheLine({
      playerIds: ['a'],
      matchWinRecords: [{ kind: 'matchWins', threshold: 5, holder: holder(7) }],
      gameWinRecords: [],
      matchWinProgress: new Map([['a', { wins: 4, played: 6 }]]),
      gameWinProgress: new Map(),
    });
    expect(chances).toEqual([]);
  });

  it('works out how many of the next rounds a player must win to take a game-win record', () => {
    const chances = recordsOnTheLine({
      playerIds: ['a'],
      matchWinRecords: [],
      gameWinRecords: [{ kind: 'gameWins', threshold: 100, holder: holder(300) }],
      matchWinProgress: noMatchWinThresholdInReach,
      gameWinProgress: new Map([['a', { wins: 97, played: 290 }]]),
    });
    expect(chances).toEqual([
      expect.objectContaining({ kind: 'gameWins', threshold: 100, winsNeeded: 3, withinGames: 9, newCount: 293 }),
    ]);
  });

  it('ignores game-win records that are too many wins away', () => {
    const chances = recordsOnTheLine({
      playerIds: ['a'],
      matchWinRecords: [],
      gameWinRecords: [],
      matchWinProgress: noMatchWinThresholdInReach,
      gameWinProgress: new Map([['a', { wins: 80, played: 200 }]]),
    });
    expect(chances).toEqual([]);
  });

  it('offers an unclaimed record to the first player who gets there', () => {
    const chances = recordsOnTheLine({
      playerIds: ['a'],
      matchWinRecords: [],
      gameWinRecords: [],
      matchWinProgress: new Map([['a', { wins: 0, played: 0 }]]),
      gameWinProgress: new Map(),
    });
    expect(chances).toEqual([expect.objectContaining({ kind: 'matchWins', threshold: 1, record: null })]);
  });
});
