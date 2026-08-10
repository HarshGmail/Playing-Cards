/**
 * Scoring for Least Count, per docs/LEAST_COUNT.md.
 *
 * The whole point of this file is the bit players get wrong at the table: which
 * cards to leave loose. Holding 3♠ 4♠ 5♠ 6♠ 9♥ 9♣ 9♦ K♠ 2♦, using 3♠ 4♠ 5♠ as
 * the run leaves 6♠ K♠ 2♦ loose for 18, but using 4♠ 5♠ 6♠ leaves 3♠ K♠ 2♦ for
 * 15. Same cards, three points, decided by which end of the run you drop. With
 * wilds in play the choice gets harder still, so it is searched rather than
 * eyeballed.
 */

import {
  Card,
  GROUP_SIZE,
  handPoints,
  Rank,
  sortHand,
} from './card';
import { isMeld, meldKinds, MeldKinds } from './melds';

export interface ScoredGroup {
  cards: Card[];
  kinds: MeldKinds;
}

export interface Grouping {
  /** Disjoint valid groups, chosen to save as many points as possible. */
  groups: ScoredGroup[];
  /** Cards in no group. These are what the player is charged for. */
  leftover: Card[];
  /** Sum of the leftover cards' point values. */
  score: number;
}

/** Every combination of `size` indices from `0..count-1`. */
function combinations(count: number, size: number): number[][] {
  const result: number[][] = [];
  const current: number[] = [];

  const walk = (start: number) => {
    if (current.length === size) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < count; i += 1) {
      current.push(i);
      walk(i + 1);
      current.pop();
    }
  };

  walk(0);
  return result;
}

interface CandidateGroup {
  indices: number[];
  mask: number;
  kinds: MeldKinds;
  /** Points removed from the player's score by using this group. */
  saved: number;
}

/** Every valid group of GROUP_SIZE cards that can be formed from the hand. */
function candidateGroups(hand: Card[], wildRank: Rank | null): CandidateGroup[] {
  const candidates: CandidateGroup[] = [];

  for (const indices of combinations(hand.length, GROUP_SIZE)) {
    const cards = indices.map((i) => hand[i]);
    const kinds = meldKinds(cards, wildRank);
    if (!isMeld(kinds)) continue;

    candidates.push({
      indices,
      mask: indices.reduce((mask, i) => mask | (1 << i), 0),
      kinds,
      saved: handPoints(cards),
    });
  }

  return candidates;
}

/**
 * The cheapest way to lay a hand out — the score a player who laid their pure
 * run is charged when the round ends before they can declare.
 *
 * Searched exhaustively. A nine-card hand yields at most 84 candidate groups
 * and 512 coverage states, so "try everything" is both instant and exactly
 * right; there is no need for a heuristic that could miss the best answer.
 *
 * Note this does not require one of the groups to be a sequence. That rule
 * governs *declaring* (see findDeclaration); for a losing hand every valid
 * group earns its keep.
 */
export function bestGrouping(hand: Card[], wildRank: Rank | null): Grouping {
  const cards = sortHand(hand);
  const candidates = candidateGroups(cards, wildRank);
  const full = (1 << cards.length) - 1;

  // best[mask] = the most points that can be saved using only the cards still
  // free in `mask`. Memoised on the covered-card bitmask.
  const memo = new Map<number, { saved: number; picked: CandidateGroup[] }>();

  const solve = (covered: number): { saved: number; picked: CandidateGroup[] } => {
    if (covered === full) return { saved: 0, picked: [] };

    const cached = memo.get(covered);
    if (cached) return cached;

    // Anchor on the lowest uncovered card. Every solution either leaves it
    // loose or uses it in exactly one group, so this enumerates each distinct
    // selection once instead of once per ordering.
    let anchor = 0;
    while ((covered & (1 << anchor)) !== 0) anchor += 1;

    // Option A: leave the anchor loose.
    let best = solve(covered | (1 << anchor));

    // Option B: use the anchor in any group whose other cards are still free.
    for (const candidate of candidates) {
      if ((candidate.mask & (1 << anchor)) === 0) continue;
      if ((candidate.mask & covered) !== 0) continue;

      const rest = solve(covered | candidate.mask);
      const saved = candidate.saved + rest.saved;
      if (saved > best.saved) {
        best = { saved, picked: [candidate, ...rest.picked] };
      }
    }

    memo.set(covered, best);
    return best;
  };

  const { picked } = solve(0);
  const usedMask = picked.reduce((mask, group) => mask | group.mask, 0);
  const leftover = cards.filter((_, i) => (usedMask & (1 << i)) === 0);

  return {
    groups: picked.map((group) => ({
      cards: group.indices.map((i) => cards[i]),
      kinds: group.kinds,
    })),
    leftover,
    score: handPoints(leftover),
  };
}

/**
 * Score for a player who never laid a pure run: the full face value of every
 * card, with no credit for runs or sets and wilds counted at face value —
 * they did not know they were wild.
 */
export function scoreWithoutPureRun(hand: Card[]): number {
  return handPoints(hand);
}

/**
 * A valid show: the nine remaining cards split into three groups with nothing
 * left over, at least one of them usable as a sequence.
 *
 * Returns the winning split, or null when the hand does not declare. Searching
 * for a split where *some* group is a run matters — a group that qualifies as
 * both a run and a set must be allowed to count as the run.
 */
export function findDeclaration(
  hand: Card[],
  wildRank: Rank | null
): ScoredGroup[] | null {
  if (hand.length !== GROUP_SIZE * 3) return null;

  const cards = sortHand(hand);
  const candidates = candidateGroups(cards, wildRank);
  const full = (1 << cards.length) - 1;

  const walk = (
    covered: number,
    picked: CandidateGroup[]
  ): CandidateGroup[] | null => {
    if (covered === full) {
      return picked.some((group) => group.kinds.run) ? picked : null;
    }

    let anchor = 0;
    while ((covered & (1 << anchor)) !== 0) anchor += 1;

    for (const candidate of candidates) {
      if ((candidate.mask & (1 << anchor)) === 0) continue;
      if ((candidate.mask & covered) !== 0) continue;

      const found = walk(covered | candidate.mask, [...picked, candidate]);
      if (found) return found;
    }

    return null;
  };

  const found = walk(0, []);
  if (!found) return null;

  return found.map((group) => ({
    cards: group.indices.map((i) => cards[i]),
    kinds: group.kinds,
  }));
}
