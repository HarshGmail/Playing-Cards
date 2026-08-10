/**
 * Card primitives for Least Count. See docs/LEAST_COUNT.md for the rules these
 * encode.
 *
 * Two decks are in play, so a hand can legitimately hold the same card twice.
 * Nothing here may assume a card is unique — hands are arrays, never sets, and
 * the picker counts rather than toggles.
 */

export type Suit = 'S' | 'H' | 'C' | 'D';

/** 'T' is the ten. Kept to one character so a card id is always two. */
export type Rank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'T'
  | 'J'
  | 'Q'
  | 'K';

export interface Card {
  rank: Rank;
  suit: Suit;
}

/** `${Rank}${Suit}`, e.g. 'AS', 'TH'. Stable enough to persist. */
export type CardId = string;

/** Display order: one column per suit in the picker, in this order. */
export const SUITS: Suit[] = ['S', 'H', 'C', 'D'];

/** Display order: top to bottom in the picker. */
export const RANKS: Rank[] = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'T',
  'J',
  'Q',
  'K',
];

/**
 * Plain BMP characters, present in every font. Deliberately not the Unicode
 * playing-card block (U+1F0A0…): those render as tofu on many Android builds,
 * can't be styled per-part, and the block sneaks a non-standard Knight card
 * between the Jack and the Queen, so rank arithmetic over it silently misfires.
 */
export const SUIT_SYMBOL: Record<Suit, string> = {
  S: '♠',
  H: '♥',
  C: '♣',
  D: '♦',
};

export const SUIT_NAME: Record<Suit, string> = {
  S: 'spades',
  H: 'hearts',
  C: 'clubs',
  D: 'diamonds',
};

export const RANK_LABEL: Record<Rank, string> = {
  A: 'A',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  T: '10',
  J: 'J',
  Q: 'Q',
  K: 'K',
};

/** Penalty value at scoring time. Ace, ten and every face card is 10. */
export const RANK_POINTS: Record<Rank, number> = {
  A: 10,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  T: 10,
  J: 10,
  Q: 10,
  K: 10,
};

/**
 * Where a rank can sit in a run. The ace plays low (A-2-3-4) or high (J-Q-K-A)
 * but never wraps, which is why it alone has two values — a single "ace = 1 or
 * 14" pair is what rules out Q-K-A-2.
 */
export const RANK_RUN_VALUES: Record<Rank, number[]> = {
  A: [1, 14],
  '2': [2],
  '3': [3],
  '4': [4],
  '5': [5],
  '6': [6],
  '7': [7],
  '8': [8],
  '9': [9],
  T: [10],
  J: [11],
  Q: [12],
  K: [13],
};

export function isRedSuit(suit: Suit): boolean {
  return suit === 'H' || suit === 'D';
}

export function toCardId(card: Card): CardId {
  return `${card.rank}${card.suit}`;
}

export function fromCardId(id: CardId): Card {
  return { rank: id.slice(0, -1) as Rank, suit: id.slice(-1) as Suit };
}

export function cardLabel(card: Card): string {
  return `${RANK_LABEL[card.rank]}${SUIT_SYMBOL[card.suit]}`;
}

export function handLabel(cards: Card[]): string {
  return cards.map(cardLabel).join(' ');
}

export function cardPoints(card: Card): number {
  return RANK_POINTS[card.rank];
}

export function handPoints(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + cardPoints(card), 0);
}

/** Grouped by suit, ascending by rank — how a hand is held and read. */
export function sortHand(cards: Card[]): Card[] {
  return [...cards].sort(
    (a, b) =>
      SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) ||
      RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank)
  );
}

/** Expands picker counts (a card may be chosen twice) into a hand. */
export function handFromCounts(counts: Record<CardId, number>): Card[] {
  const hand: Card[] = [];
  for (const [id, count] of Object.entries(counts)) {
    for (let i = 0; i < count; i += 1) hand.push(fromCardId(id));
  }
  return sortHand(hand);
}

export function countsFromHand(cards: Card[]): Record<CardId, number> {
  const counts: Record<CardId, number> = {};
  for (const card of cards) {
    const id = toCardId(card);
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

/** Every card in a two-deck shoe exists twice, so this is the hard ceiling. */
export const COPIES_PER_CARD = 2;

/** Cards dealt to each player. */
export const HAND_SIZE = 13;

/** Length of the pure run that unlocks the tiplu. */
export const PURE_RUN_SIZE = 4;

/** Cards per group in the nine that remain after laying the run. */
export const GROUP_SIZE = 3;
