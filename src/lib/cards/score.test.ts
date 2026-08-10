import { describe, it, expect } from 'vitest';
import { Card, handLabel, Rank } from './card';
import { isPureRun, meldKinds } from './melds';
import { bestGrouping, findDeclaration, scoreWithoutPureRun } from './score';

/** Terse hand builder: hand('3S 4S 5S') — 'T' is the ten. */
function hand(spec: string): Card[] {
  return spec
    .trim()
    .split(/\s+/)
    .map((token) => ({
      rank: token.slice(0, -1) as Rank,
      suit: token.slice(-1) as Card['suit'],
    }));
}

describe('isPureRun', () => {
  it('accepts four consecutive cards of one suit', () => {
    expect(isPureRun(hand('4H 5H 6H 7H'))).toBe(true);
  });

  it('accepts the ace low and the ace high', () => {
    expect(isPureRun(hand('AH 2H 3H 4H'))).toBe(true);
    expect(isPureRun(hand('JS QS KS AS'))).toBe(true);
  });

  it('rejects a run that wraps around the ace', () => {
    expect(isPureRun(hand('QC KC AC 2C'))).toBe(false);
  });

  it('rejects mixed suits', () => {
    expect(isPureRun(hand('4H 5H 6H 7C'))).toBe(false);
  });

  it('rejects a duplicate from the second deck', () => {
    expect(isPureRun(hand('4H 5H 5H 6H'))).toBe(false);
  });

  it('rejects the wrong length', () => {
    expect(isPureRun(hand('4H 5H 6H'))).toBe(false);
    expect(isPureRun(hand('4H 5H 6H 7H 8H'))).toBe(false);
  });
});

describe('meldKinds', () => {
  it('recognises a natural run and a natural set', () => {
    expect(meldKinds(hand('5D 6D 7D'), null)).toEqual({ run: true, set: false });
    expect(meldKinds(hand('5H 5C 5S'), null)).toEqual({ run: false, set: true });
  });

  it('rejects a set with a repeated suit', () => {
    // Two decks make 5♥ 5♥ possible, but they are not "different suits".
    expect(meldKinds(hand('5H 5H 5C'), null)).toEqual({ run: false, set: false });
  });

  it('lets a wild stand in inside a run', () => {
    // Tiplu is a 7, so 7♣ plays as the Q♥ this run is missing.
    expect(meldKinds(hand('JH 7C KH'), '7').run).toBe(true);
  });

  it('lets a wild stand in inside a set', () => {
    expect(meldKinds(hand('5H 5C 7D'), '7').set).toBe(true);
  });

  it('will not let a wild paper over a repeated suit in a set', () => {
    expect(meldKinds(hand('5H 5H 7D'), '7').set).toBe(false);
  });

  it('treats three wilds as either shape', () => {
    expect(meldKinds(hand('7H 7C 7S'), '7')).toEqual({ run: true, set: true });
  });

  it('still rejects a wrapping run when a wild is involved', () => {
    expect(meldKinds(hand('KC AC 7D'), '7').run).toBe(true); // Q-K-A
    expect(meldKinds(hand('AC 2C 7D'), '7').run).toBe(true); // A-2-3
    expect(meldKinds(hand('KC 2C 7D'), '7').run).toBe(false); // K-A-2 never
  });
});

describe('bestGrouping', () => {
  it('picks the end of a four-card run that saves the most points', () => {
    // The case that motivated this engine. Using 3♠4♠5♠ leaves 6♠ K♠ 2♦ = 18;
    // using 4♠5♠6♠ leaves 3♠ K♠ 2♦ = 15. It must find 15.
    const result = bestGrouping(hand('3S 4S 5S 6S 9H 9C 9D KS 2D'), null);
    expect(result.score).toBe(15);
    expect(handLabel(result.leftover)).toBe('3♠ K♠ 2♦');
    expect(result.groups).toHaveLength(2);
  });

  it('matches the worked example from the rules doc', () => {
    // One set, one run, and 5♥ 6♥ 5♦ loose = 16.
    const result = bestGrouping(hand('5H 5C 5S 7D 8D 9D 5H 6H 5D'), null);
    expect(result.score).toBe(16);
  });

  it('scores a hand with no melds at full face value', () => {
    const cards = hand('2H 4C 6S 8D TH QC AS 3D 9H');
    expect(bestGrouping(cards, null).score).toBe(2 + 4 + 6 + 8 + 10 + 10 + 10 + 3 + 9);
  });

  it('reaches zero when all nine cards group up', () => {
    const result = bestGrouping(hand('3S 4S 5S 9H 9C 9D 7D 8D 9S'), null);
    expect(result.score).toBe(0);
    expect(result.leftover).toEqual([]);
    expect(result.groups).toHaveLength(3);
  });

  it('spends a wild where it saves the most', () => {
    // The 7♣ is wild. Completing K♠ A♠ (10 + 10) beats completing 2♦ 3♦ (2 + 3).
    const withWild = bestGrouping(hand('KS AS 7C 2D 3D 5H 5C 5S 4H'), '7');
    const withoutWild = bestGrouping(hand('KS AS 7C 2D 3D 5H 5C 5S 4H'), null);
    expect(withWild.score).toBeLessThan(withoutWild.score);
    expect(handLabel(withWild.groups.find((g) => g.cards.length === 3 && g.kinds.run)!.cards)).toContain('7♣');
  });

  it('is unaffected by the order cards are handed in', () => {
    const a = bestGrouping(hand('3S 4S 5S 6S 9H 9C 9D KS 2D'), null);
    const b = bestGrouping(hand('2D KS 9D 6S 9C 5S 9H 4S 3S'), null);
    expect(a.score).toBe(b.score);
  });
});

describe('scoreWithoutPureRun', () => {
  it('matches the worked example from the rules doc', () => {
    // Q♠ K♠ A♠ 3♠ 4♠ 6♣ 7♣ 8♣ 2♥ 2♥ 7♦ 5♦ 8♦ = 82. Contains 6♣7♣8♣ and
    // Q♠K♠A♠ but earns nothing for them: no pure run was laid.
    const cards = hand('QS KS AS 3S 4S 6C 7C 8C 2H 2H 7D 5D 8D');
    expect(cards).toHaveLength(13);
    expect(scoreWithoutPureRun(cards)).toBe(82);
  });

  it('counts wilds at face value, since the player never saw the tiplu', () => {
    expect(scoreWithoutPureRun(hand('7H 7C'))).toBe(14);
  });
});

describe('findDeclaration', () => {
  it('accepts three groups when one is a sequence', () => {
    const found = findDeclaration(hand('3S 4S 5S 9H 9C 9D 5H 5C 5D'), null);
    expect(found).not.toBeNull();
    expect(found).toHaveLength(3);
    expect(found!.some((group) => group.kinds.run)).toBe(true);
  });

  it('rejects three sets with no sequence among them', () => {
    // All groups valid, but the compulsory sequence is missing.
    expect(findDeclaration(hand('9H 9C 9D 5H 5C 5D 2H 2C 2D'), null)).toBeNull();
  });

  it('rejects a hand with a card left over', () => {
    expect(findDeclaration(hand('3S 4S 5S 9H 9C 9D 5H 5C KS'), null)).toBeNull();
  });

  it('uses a dual-purpose group as the sequence when that is what saves the hand', () => {
    // 7♥ 7♣ 7S are wild and count as either shape; the other two groups are
    // sets, so the wild group has to be read as the sequence.
    const found = findDeclaration(hand('7H 7C 7S 9H 9C 9D 5H 5C 5D'), '7');
    expect(found).not.toBeNull();
    expect(found!.some((group) => group.kinds.run)).toBe(true);
  });

  it('rejects a hand that is not nine cards', () => {
    expect(findDeclaration(hand('3S 4S 5S 9H 9C 9D'), null)).toBeNull();
  });
});
