import { describe, it, expect } from 'vitest';
import {
  createRng,
  forecastWinProbabilities,
  gameWinStrength,
  isZeroWinnerGame,
  seedFrom,
  targetGameCount,
  type GameRecord,
  type PlayerForecastInput,
} from './winProbability';

const loss = (score: number): GameRecord => ({ score, won: false });
const win: GameRecord = { score: 0, won: true };

function player(
  playerId: string,
  currentTotal: number,
  history: GameRecord[] = [],
  today: GameRecord[] = []
): PlayerForecastInput {
  return { playerId, currentTotal, history, today };
}

const PRIOR = [20, 40, 60, 80];

describe('targetGameCount', () => {
  it('multiplies rounds by players per round', () => {
    expect(targetGameCount(3, 5, 8)).toBe(15);
  });

  it('extends to the next full round once the target is passed', () => {
    expect(targetGameCount(3, 5, 16)).toBe(20);
  });

  it('falls back to games played when there are no players', () => {
    expect(targetGameCount(3, 0, 4)).toBe(4);
  });
});

describe('isZeroWinnerGame', () => {
  it('is true when the best score is almost always zero in a lowest-first game', () => {
    expect(isZeroWinnerGame([0, 0, 0, 0, 5], 'lowest-first')).toBe(true);
  });

  it('is false for highest-first games and for empty history', () => {
    expect(isZeroWinnerGame([0, 0, 0], 'highest-first')).toBe(false);
    expect(isZeroWinnerGame([], 'lowest-first')).toBe(false);
  });
});

describe('createRng', () => {
  it('is deterministic for a seed and stays within [0, 1)', () => {
    const a = createRng(seedFrom('match-1'));
    const b = createRng(seedFrom('match-1'));
    const values = Array.from({ length: 100 }, () => a());
    expect(values).toEqual(Array.from({ length: 100 }, () => b()));
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});

describe('gameWinStrength', () => {
  it('shrinks toward the even share when there is no history', () => {
    expect(gameWinStrength(player('a', 0), 4)).toBeCloseTo(0.25);
  });

  it('weighs today more than older games', () => {
    const hotToday = player('a', 0, [loss(50), loss(50)], [win, win]);
    const hotLongAgo = player('b', 0, [win, win], [loss(50), loss(50)]);
    expect(gameWinStrength(hotToday, 4)).toBeGreaterThan(gameWinStrength(hotLongAgo, 4));
  });
});

describe('forecastWinProbabilities', () => {
  const baseOptions = {
    rankPreference: 'lowest-first' as const,
    zeroWinner: true,
    priorScores: PRIOR,
    simulations: 2000,
    seed: 42,
  };

  it('sums to 1 across players', () => {
    const result = forecastWinProbabilities(
      [player('a', 150), player('b', 156), player('c', 162)],
      { ...baseOptions, remainingGames: 7 }
    )!;
    const total = result.reduce((sum, r) => sum + r.winProbability, 0);
    expect(total).toBeCloseTo(1, 6);
  });

  it('gives the current leader the edge when players are otherwise equal', () => {
    const result = forecastWinProbabilities([player('a', 100), player('b', 180)], {
      ...baseOptions,
      remainingGames: 3,
    })!;
    const [a, b] = result;
    expect(a.winProbability).toBeGreaterThan(b.winProbability);
  });

  it('favours a player who keeps winning games over one who keeps losing big', () => {
    const strong = player('a', 150, Array(10).fill(win), [win, win]);
    const weak = player('b', 150, Array(10).fill(loss(90)), [loss(90), loss(90)]);
    const result = forecastWinProbabilities([strong, weak], { ...baseOptions, remainingGames: 7 })!;
    expect(result[0].winProbability).toBeGreaterThan(0.8);
  });

  it('settles on current standings when no games remain, splitting ties', () => {
    const result = forecastWinProbabilities(
      [player('a', 100), player('b', 100), player('c', 140)],
      { ...baseOptions, remainingGames: 0 }
    )!;
    expect(result.map((r) => r.winProbability)).toEqual([0.5, 0.5, 0]);
  });

  it('uses the highest total for highest-first games', () => {
    const result = forecastWinProbabilities([player('a', 10), player('b', 30)], {
      ...baseOptions,
      rankPreference: 'highest-first',
      zeroWinner: false,
      remainingGames: 0,
    })!;
    expect(result.map((r) => r.winProbability)).toEqual([0, 1]);
  });

  it('returns null when a player has nothing to sample from', () => {
    const result = forecastWinProbabilities([player('a', 0), player('b', 0)], {
      ...baseOptions,
      priorScores: [],
      remainingGames: 3,
    });
    expect(result).toBeNull();
  });

  it('is reproducible for the same seed', () => {
    const players = [player('a', 150, [loss(30)]), player('b', 156, [loss(60)])];
    const options = { ...baseOptions, remainingGames: 5 };
    expect(forecastWinProbabilities(players, options)).toEqual(
      forecastWinProbabilities(players, options)
    );
  });
});
