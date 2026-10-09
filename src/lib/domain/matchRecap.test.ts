import { describe, it, expect } from 'vitest';
import type { MatchStanding } from '@/lib/db/collections';
import { buildMatchRecap, MatchRecapInput } from './matchRecap';

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
    gameRuns: [],
    ...overrides,
  };
}

const names = new Map([
  ['a', 'Alice'],
  ['b', 'Bob'],
  ['c', 'Cara'],
  ['d', 'Dev'],
]);

function input(overrides: Partial<MatchRecapInput> = {}): MatchRecapInput {
  return {
    standings: [standing('a', 1), standing('b', 2), standing('c', 3), standing('d', 4)],
    rounds: [],
    names,
    ratingDeltas: new Map(),
    ...overrides,
  };
}

describe('buildMatchRecap', () => {
  it('orders players by rank and names them', () => {
    const recap = buildMatchRecap(input());
    expect(recap.players.map((p) => p.name)).toEqual(['Alice', 'Bob', 'Cara', 'Dev']);
    expect(recap.winners.map((p) => p.playerId)).toEqual(['a']);
  });

  it('keeps tied winners together and skips the podium rank nobody holds', () => {
    const recap = buildMatchRecap(
      input({
        standings: [
          standing('a', 1, { isSharedPosition: true }),
          standing('b', 1, { isSharedPosition: true }),
          standing('c', 3),
          standing('d', 4),
        ],
      })
    );
    expect(recap.winners.map((p) => p.playerId)).toEqual(['a', 'b']);
    expect(recap.podium.map((slot) => slot.rank)).toEqual([1, 3]);
    expect(recap.podium[0].players).toHaveLength(2);
  });

  it('leaves DNF players off the podium and ranks them last', () => {
    const recap = buildMatchRecap(
      input({
        standings: [standing('a', 1), standing('b', 2), standing('c', 3, { isDnf: true })],
      })
    );
    const podiumIds = recap.podium.flatMap((slot) => slot.players.map((p) => p.playerId));
    expect(podiumIds).toEqual(['a', 'b']);
    expect(recap.players[recap.players.length - 1]).toMatchObject({ playerId: 'c', rank: 3 });
  });

  it('omits players who never played a round', () => {
    const recap = buildMatchRecap(
      input({ standings: [standing('a', 1), standing('b', 2, { roundsPlayed: 0 })] })
    );
    expect(recap.players.map((p) => p.playerId)).toEqual(['a']);
  });

  it('reports the longest game streak and everyone who shares it', () => {
    const recap = buildMatchRecap(
      input({
        standings: [
          standing('a', 1, { gameRuns: [3, 1] }),
          standing('b', 2, { gameRuns: [2] }),
          standing('c', 3, { gameRuns: [3] }),
        ],
      })
    );
    expect(recap.longestGameStreak?.length).toBe(3);
    expect(recap.longestGameStreak?.players.map((p) => p.playerId)).toEqual(['a', 'c']);
  });

  it('hides a streak too short to show', () => {
    const recap = buildMatchRecap(
      input({ standings: [standing('a', 1, { gameRuns: [1, 1] }), standing('b', 2)] })
    );
    expect(recap.longestGameStreak).toBeNull();
  });

  it('picks the highest single-round score, earliest round on ties', () => {
    const recap = buildMatchRecap(
      input({
        rounds: [
          { round: 2, scores: [{ playerId: 'b', value: 80 }] },
          { round: 1, scores: [{ playerId: 'c', value: 80 }, { playerId: 'a', value: 0 }] },
        ],
      })
    );
    expect(recap.biggestRound).toMatchObject({ round: 1, value: 80 });
    expect(recap.biggestRound?.player.playerId).toBe('c');
  });

  it('has no biggest round when every score is zero', () => {
    const recap = buildMatchRecap(
      input({ rounds: [{ round: 1, scores: [{ playerId: 'a', value: 0 }] }] })
    );
    expect(recap.biggestRound).toBeNull();
  });

  it('attaches rating deltas and leaves unrated players null', () => {
    const recap = buildMatchRecap(input({ ratingDeltas: new Map([['a', 12], ['b', -7]]) }));
    expect(recap.players.map((p) => p.ratingDelta)).toEqual([12, -7, null, null]);
  });
});
