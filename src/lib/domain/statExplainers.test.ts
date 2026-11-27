import { describe, it, expect } from 'vitest';
import { ALL_GAMES_SCOPE, explainStat, type StatRecord } from './statExplainers';

const record: StatRecord = {
  matchesPlayed: 36,
  matchWins: 13,
  gamesPlayed: 289,
  gamesWon: 101,
  averageRank: 2.2,
  currentDayStreak: 4,
  longestDayStreak: 17,
  podiums: { first: 19, second: 13, third: 19 },
};

const empty: StatRecord = { matchesPlayed: 0, matchWins: 0, gamesPlayed: 0, gamesWon: 0 };

describe('explainStat', () => {
  it('shows the game strike rate calculation with the real numbers', () => {
    const card = explainStat('gameStrikeRate', record);
    expect(card.value).toBe('34.9');
    expect(card.calculation).toBe('101 game wins ÷ 289 games × 100 = 34.9');
    expect(card.detail).toBe("That's about 1 in every 3 games.");
  });

  it('shows the match win percentage calculation with the real numbers', () => {
    const card = explainStat('matchWinPct', record);
    expect(card.value).toBe('36%');
    expect(card.calculation).toBe('13 match wins ÷ 36 matches × 100 = 36%');
  });

  it('adds silver and bronze and counts total podiums', () => {
    const card = explainStat('podiums', record);
    expect(card.value).toBe('32');
    expect(card.calculation).toBe('13 silver + 19 bronze = 32');
    expect(card.detail).toBe('Add your 19 wins and you have been on the podium 51 times.');
  });

  it('describes average rank as a finishing position', () => {
    expect(explainStat('averageRank', record).detail).toBe('On average you finish around 2nd.');
  });

  it('shows the best day streak alongside the current one', () => {
    const card = explainStat('dayStreak', record);
    expect(card.value).toBe('4');
    expect(card.detail).toBe('Your best run is 17 days.');
  });

  it('uses singular words for a count of one', () => {
    const card = explainStat('matchWinPct', { ...empty, matchesPlayed: 1, matchWins: 1 });
    expect(card.calculation).toBe('1 match win ÷ 1 match × 100 = 100%');
    expect(card.detail).toBe('You win almost every match you play.');
  });

  it('skips calculations that would divide by zero', () => {
    expect(explainStat('gameStrikeRate', empty).calculation).toBeNull();
    expect(explainStat('matchWinPct', empty).calculation).toBeNull();
    expect(explainStat('gameStrikeRate', empty).detail).toBeNull();
  });

  it('labels the scope, defaulting to all games combined', () => {
    expect(explainStat('matchesPlayed', record).scope).toBe(ALL_GAMES_SCOPE);
    expect(explainStat('matchesPlayed', record, 'Least Count').scope).toBe('Least Count');
  });

  it('gives every stat a title, meaning and hover hint', () => {
    const kinds = [
      'matchesPlayed', 'matchWins', 'matchWinPct', 'gamesPlayed', 'gamesWon',
      'gameStrikeRate', 'averageRank', 'dayStreak', 'podiums',
    ] as const;
    for (const kind of kinds) {
      const card = explainStat(kind, record);
      expect(card.title && card.meaning && card.hint).toBeTruthy();
    }
  });
});
