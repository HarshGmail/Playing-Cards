import { describe, it, expect } from 'vitest';
import { describeChance, describeRecordToBeat, recordGoal, recordSpent } from './recordCopy';

describe('record copy', () => {
  it('names the goal and the cost with singular and plural words', () => {
    expect(recordGoal('matchWins', 1)).toBe('1 match win');
    expect(recordGoal('gameWins', 100)).toBe('100 game wins');
    expect(recordSpent('matchWins', 9)).toBe('in 9 matches');
    expect(recordSpent('gameWins', 1)).toBe('in 1 game');
  });

  it('tells a player to win this match for a match-win record', () => {
    const chance = { kind: 'matchWins' as const, threshold: 5, winsNeeded: 1, withinGames: null, newCount: 7, record: { name: 'Harsh', count: 9 } };
    expect(describeChance(chance)).toBe('Win this match to hit 5 match wins in 7 matches');
    expect(describeRecordToBeat(chance)).toBe('Record: Harsh, in 9 matches');
  });

  it('gives the rounds budget for a game-win record', () => {
    const chance = { kind: 'gameWins' as const, threshold: 100, winsNeeded: 3, withinGames: 9, newCount: 293, record: { name: 'Vinay', count: 300 } };
    expect(describeChance(chance)).toBe('Win 3 of the next 9 rounds to hit 100 game wins in 293 games');
  });

  it('asks for consecutive wins when there is no slack', () => {
    const tight = { kind: 'gameWins' as const, threshold: 50, winsNeeded: 2, withinGames: 2, newCount: 120, record: { name: 'A', count: 121 } };
    expect(describeChance(tight)).toBe('Win the next 2 rounds to hit 50 game wins in 120 games');
    const single = { ...tight, winsNeeded: 1, withinGames: null, record: null };
    expect(describeChance(single)).toBe('Win the next round to hit 50 game wins in 120 games');
    expect(describeRecordToBeat(single)).toBe('No one has done it yet');
  });
});
