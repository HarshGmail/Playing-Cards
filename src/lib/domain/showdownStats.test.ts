import { describe, it, expect } from 'vitest';
import { declaredTotal, showdownMarkFor, showdownOutcome, showdownTallies, withWrongShowPenalty } from './showdownStats';

describe('showdownOutcome', () => {
  it('treats a lone zero as a correct show', () => {
    expect(
      showdownOutcome({
        round: 1,
        scores: [
          { playerId: 'harsh', value: 0 },
          { playerId: 'vinay', value: 12 },
          { playerId: 'bot', value: 30 },
        ],
      })
    ).toEqual({ kind: 'correct', shower: 'harsh' });
  });

  it('finds who beat a wrong show, ties included', () => {
    expect(
      showdownOutcome({
        round: 2,
        scores: [
          { playerId: 'harsh', value: 58, wrongShow: true },
          { playerId: 'vinay', value: 8 },
          { playerId: 'bot', value: 6 },
          { playerId: 'ksp', value: 20 },
        ],
      })
    ).toEqual({ kind: 'wrong', shower: 'harsh', declared: 8, beaters: ['vinay', 'bot'] });
  });

  it('counts a 0 against 0 as a wrong show beaten by the other zero', () => {
    const outcome = showdownOutcome({
      round: 3,
      scores: [
        { playerId: 'harsh', value: 50, wrongShow: true },
        { playerId: 'vinay', value: 0 },
      ],
    });
    expect(outcome).toEqual({ kind: 'wrong', shower: 'harsh', declared: 0, beaters: ['vinay'] });
  });

  it('reads an unmarked round with no zero as a wrong show by the highest score, won by the lowest', () => {
    expect(
      showdownOutcome({
        round: 14,
        scores: [
          { playerId: 'harsh', value: 52 },
          { playerId: 'vinay', value: 73 },
          { playerId: 'bot', value: 23 },
        ],
      })
    ).toEqual({ kind: 'wrong', shower: 'vinay', declared: 23, beaters: ['bot'] });
  });

  it('leaves a round unmarked when it cannot tell who showed', () => {
    const noPenalty = [{ playerId: 'a', value: 30 }, { playerId: 'b', value: 40 }];
    const tiedForHighest = [{ playerId: 'a', value: 60 }, { playerId: 'b', value: 60 }, { playerId: 'c', value: 5 }];
    const twoZeros = [{ playerId: 'a', value: 0 }, { playerId: 'b', value: 0 }];
    for (const scores of [noPenalty, tiedForHighest, twoZeros]) {
      expect(showdownOutcome({ round: 5, scores })).toEqual({ kind: 'none' });
    }
  });

  it('prefers the marked +50 over the inferred one', () => {
    const outcome = showdownOutcome({
      round: 6,
      scores: [
        { playerId: 'a', value: 55, wrongShow: true },
        { playerId: 'b', value: 70 },
        { playerId: 'c', value: 2 },
      ],
    });
    expect(outcome).toMatchObject({ kind: 'wrong', shower: 'a', declared: 5, beaters: ['c'] });
  });
});

describe('showdownTallies', () => {
  it('adds up correct shows, wrong shows and shows beaten per player', () => {
    const tallies = showdownTallies(
      [
        { round: 1, scores: [{ playerId: 'harsh', value: 0 }, { playerId: 'vinay', value: 9 }] },
        { round: 2, scores: [{ playerId: 'harsh', value: 57, wrongShow: true }, { playerId: 'vinay', value: 5 }] },
        { round: 3, scores: [{ playerId: 'harsh', value: 0 }, { playerId: 'vinay', value: 4 }] },
      ],
      ['harsh', 'vinay', 'bot']
    );
    expect(tallies.get('harsh')).toEqual({ correctShows: 2, wrongShows: 1, beatShows: 0 });
    expect(tallies.get('vinay')).toEqual({ correctShows: 0, wrongShows: 0, beatShows: 1 });
    expect(tallies.get('bot')).toEqual({ correctShows: 0, wrongShows: 0, beatShows: 0 });
  });
});

describe('showdownMarkFor', () => {
  it('marks the shower and anyone who beat a wrong show', () => {
    const wrong = { kind: 'wrong' as const, shower: 'harsh', declared: 8, beaters: ['vinay'] };
    expect(showdownMarkFor(wrong, 'harsh')).toBe('wrong');
    expect(showdownMarkFor(wrong, 'vinay')).toBe('beat');
    expect(showdownMarkFor(wrong, 'bot')).toBeNull();
    expect(showdownMarkFor({ kind: 'correct', shower: 'bot' }, 'bot')).toBe('correct');
    expect(showdownMarkFor({ kind: 'none' }, 'bot')).toBeNull();
  });
});

describe('penalty helpers', () => {
  it('adds and removes the 50-point wrong show penalty', () => {
    expect(withWrongShowPenalty(8, true)).toBe(58);
    expect(withWrongShowPenalty(8, false)).toBe(8);
    expect(declaredTotal(58)).toBe(8);
  });
});
