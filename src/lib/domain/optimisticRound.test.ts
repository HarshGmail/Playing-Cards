import { describe, expect, it } from 'vitest';
import { applyOptimisticRound, appendRound, nextRoundNumber, type CachedRound } from './optimisticRound';

const ENTERED_AT = '2026-11-22T10:00:00.000Z';

const roster = [
  { userId: 'a', userName: 'Asha', status: 'active' as const, dnfAfterRound: null },
  { userId: 'b', userName: 'Bala', status: 'active' as const, dnfAfterRound: null },
  { userId: 'c', userName: 'Chitra', status: 'active' as const, dnfAfterRound: null },
];

const buildMatch = (roundsPlayed: number, rankPreference: 'highest-first' | 'lowest-first' = 'lowest-first') => ({
  creatorId: 'a',
  roundsPlayed,
  rankPreference,
  tiebreakers: [] as string[],
  roster,
  version: 4,
});

const firstRound: CachedRound = {
  round: 1,
  scores: [
    { playerId: 'a', value: 0, enteredBy: 'a', enteredAt: ENTERED_AT },
    { playerId: 'b', value: 30, enteredBy: 'a', enteredAt: ENTERED_AT },
    { playerId: 'c', value: 12, enteredBy: 'a', enteredAt: ENTERED_AT },
  ],
};

const secondRoundScores = [
  { playerId: 'a', value: 25 },
  { playerId: 'b', value: 0 },
  { playerId: 'c', value: 40 },
];

describe('nextRoundNumber', () => {
  it('is one past the rounds played', () => {
    expect(nextRoundNumber({ roundsPlayed: 0 })).toBe(1);
    expect(nextRoundNumber({ roundsPlayed: 7 })).toBe(8);
  });
});

describe('appendRound', () => {
  it('adds the round with who entered it and when', () => {
    const rounds = appendRound([firstRound], 2, secondRoundScores, 'a', ENTERED_AT);
    expect(rounds).toHaveLength(2);
    expect(rounds[1]).toEqual({
      round: 2,
      scores: secondRoundScores.map((score) => ({ ...score, enteredBy: 'a', enteredAt: ENTERED_AT })),
    });
  });

  it('does not mutate the rounds it was given', () => {
    const original = [firstRound];
    appendRound(original, 2, secondRoundScores, 'a', ENTERED_AT);
    expect(original).toHaveLength(1);
  });

  it('replaces a round with the same number rather than duplicating it', () => {
    const rounds = appendRound([firstRound], 1, secondRoundScores, 'a', ENTERED_AT);
    expect(rounds).toHaveLength(1);
    expect(rounds[0].scores[0].value).toBe(25);
  });
});

describe('applyOptimisticRound', () => {
  it('bumps roundsPlayed but leaves the version for the server to set', () => {
    const { match } = applyOptimisticRound({
      match: buildMatch(1),
      rounds: [firstRound],
      state: { leaderboard: [], version: 4 },
      scores: secondRoundScores,
      enteredAt: ENTERED_AT,
    });
    expect(match.roundsPlayed).toBe(2);
    expect(match.version).toBe(4);
  });

  it('recomputes totals, positions and rounds won across both rounds', () => {
    const { state } = applyOptimisticRound({
      match: buildMatch(1),
      rounds: [firstRound],
      state: { leaderboard: [], version: 4 },
      scores: secondRoundScores,
      enteredAt: ENTERED_AT,
    });
    const byId = new Map(state!.leaderboard.map((entry) => [entry.playerId, entry]));
    expect(byId.get('a')).toMatchObject({ total: 25, position: 1, gamesWon: 1, roundsPlayed: 2 });
    expect(byId.get('b')).toMatchObject({ total: 30, position: 2, gamesWon: 1 });
    expect(byId.get('c')).toMatchObject({ total: 52, position: 3, gamesWon: 0 });
  });

  it('counts a shared best score as a round won for each tied player', () => {
    const { state } = applyOptimisticRound({
      match: buildMatch(0),
      rounds: [],
      state: { leaderboard: [], version: 1 },
      scores: [
        { playerId: 'a', value: 5 },
        { playerId: 'b', value: 5 },
        { playerId: 'c', value: 9 },
      ],
      enteredAt: ENTERED_AT,
    });
    const wins = Object.fromEntries(state!.leaderboard.map((entry) => [entry.playerId, entry.gamesWon]));
    expect(wins).toEqual({ a: 1, b: 1, c: 0 });
  });

  it('ranks highest total first when the game rewards high scores', () => {
    const { state } = applyOptimisticRound({
      match: buildMatch(1, 'highest-first'),
      rounds: [firstRound],
      state: { leaderboard: [], version: 4 },
      scores: secondRoundScores,
      enteredAt: ENTERED_AT,
    });
    expect(state!.leaderboard[0].playerId).toBe('c');
  });

  it('leaves state undefined when it was not cached yet', () => {
    const { state, rounds } = applyOptimisticRound({
      match: buildMatch(1),
      rounds: [firstRound],
      state: undefined,
      scores: secondRoundScores,
      enteredAt: ENTERED_AT,
    });
    expect(state).toBeUndefined();
    expect(rounds).toHaveLength(2);
  });

  it('keeps other state fields untouched', () => {
    const { state } = applyOptimisticRound({
      match: buildMatch(1),
      rounds: [firstRound],
      state: { leaderboard: [], version: 4, status: 'active' },
      scores: secondRoundScores,
      enteredAt: ENTERED_AT,
    });
    expect(state).toMatchObject({ version: 4, status: 'active' });
  });
});
