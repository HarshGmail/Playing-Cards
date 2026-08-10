/**
 * What counts as a run or a set, per docs/LEAST_COUNT.md.
 *
 * A group can qualify as both — three wilds, for instance — so validity is
 * reported as two independent booleans rather than a single "kind". The
 * declaration rules need that distinction: one of the three groups must be
 * usable as a sequence, and collapsing a dual-purpose group to one label too
 * early would reject legal hands.
 */

import {
  Card,
  GROUP_SIZE,
  PURE_RUN_SIZE,
  Rank,
  RANK_RUN_VALUES,
  Suit,
} from './card';

export interface MeldKinds {
  /** Same suit, consecutive ranks, wilds filling any gaps. */
  run: boolean;
  /** Same rank in distinct suits, wilds standing in for missing suits. */
  set: boolean;
}

export const NO_MELD: MeldKinds = { run: false, set: false };

export function isMeld(kinds: MeldKinds): boolean {
  return kinds.run || kinds.set;
}

/** A card is wild when its rank matches the revealed tiplu's rank. */
export function isWild(card: Card, wildRank: Rank | null): boolean {
  return wildRank !== null && card.rank === wildRank;
}

/**
 * Can these natural (non-wild) cards sit inside a window of `size` consecutive
 * ranks in one suit, with `wildCount` wilds filling the rest?
 *
 * Two cards of the same rank can never share a run, which is what stops a
 * two-deck duplicate like 5♦ 5♦ 6♦ from passing.
 */
function fitsRunWindow(
  naturals: Card[],
  wildCount: number,
  size: number
): boolean {
  if (naturals.length + wildCount !== size) return false;
  if (naturals.length === 0) return true; // all wild — takes any shape

  const suit = naturals[0].suit;
  if (naturals.some((card) => card.suit !== suit)) return false;

  // The ace is the only rank with two candidate values, so enumerate the
  // combinations rather than picking one and hoping.
  const valueSets: number[][] = [[]];
  for (const card of naturals) {
    const candidates = RANK_RUN_VALUES[card.rank];
    const next: number[][] = [];
    for (const partial of valueSets) {
      for (const value of candidates) next.push([...partial, value]);
    }
    valueSets.length = 0;
    valueSets.push(...next);
  }

  return valueSets.some((values) => {
    if (new Set(values).size !== values.length) return false;
    return Math.max(...values) - Math.min(...values) <= size - 1;
  });
}

/** Same rank, and no suit used twice once the wilds have been placed. */
function fitsSet(naturals: Card[], wildCount: number, size: number): boolean {
  if (naturals.length + wildCount !== size) return false;
  if (naturals.length === 0) return true;

  const rank = naturals[0].rank;
  if (naturals.some((card) => card.rank !== rank)) return false;

  // Duplicates from the second deck are explicitly not "different suits".
  const suits = new Set<Suit>(naturals.map((card) => card.suit));
  if (suits.size !== naturals.length) return false;

  // Each wild has to become a suit nobody has used yet.
  return suits.size + wildCount <= 4;
}

/** Classifies a group of exactly GROUP_SIZE cards. */
export function meldKinds(cards: Card[], wildRank: Rank | null): MeldKinds {
  if (cards.length !== GROUP_SIZE) return NO_MELD;

  const naturals = cards.filter((card) => !isWild(card, wildRank));
  const wildCount = cards.length - naturals.length;

  return {
    run: fitsRunWindow(naturals, wildCount, GROUP_SIZE),
    set: fitsSet(naturals, wildCount, GROUP_SIZE),
  };
}

/**
 * The four-card run that unlocks the tiplu.
 *
 * Takes no wild rank on purpose: this run is laid *before* anyone has seen the
 * tiplu, so it is pure by definition. A card that later turns out to be wild
 * does not retroactively invalidate a run already on the table.
 */
export function isPureRun(cards: Card[]): boolean {
  if (cards.length !== PURE_RUN_SIZE) return false;
  return fitsRunWindow(cards, 0, PURE_RUN_SIZE);
}
