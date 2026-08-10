/**
 * The games this app knows about.
 *
 * Deliberately free of any `.md` import so it stays safe for client components —
 * the rules text itself is pulled in only by the server-rendered pages under
 * src/app/rules/. This catalog is just labels and metadata.
 *
 * `gameType` is stored on the match document. Today it mostly drives which
 * rules link to show, but it is also the hook that later lets rule-aware
 * features (declaration validation, auto-scoring) apply per match instead of
 * being guessed at.
 */

export type GameType = 'least-count' | 'other';

export interface GameDefinition {
  type: GameType;
  label: string;
  /** One-liner shown beside the picker and on the rules index. */
  blurb: string;
  /** In-app rules page, or null when we have no written rules for it. */
  rulesPath: string | null;
  /** Prefilled ranking direction when this game is picked. */
  defaultRankPreference: 'highest-first' | 'lowest-first';
}

export const GAMES: Record<GameType, GameDefinition> = {
  'least-count': {
    type: 'least-count',
    label: 'Least Count',
    blurb:
      '13-card, two decks, hidden joker. Lowest cumulative score wins the match.',
    rulesPath: '/rules/least-count',
    defaultRankPreference: 'lowest-first',
  },
  other: {
    type: 'other',
    label: 'Other',
    blurb: 'Any other card game — name it yourself and keep score.',
    rulesPath: null,
    defaultRankPreference: 'highest-first',
  },
};

/** Display order for pickers. */
export const GAME_TYPES: GameType[] = ['least-count', 'other'];

/**
 * Matches created before `gameType` existed were all Least Count, so a missing
 * field reads as that rather than as unknown.
 */
export const DEFAULT_GAME_TYPE: GameType = 'least-count';

export function isGameType(value: unknown): value is GameType {
  return value === 'least-count' || value === 'other';
}

/** Normalises a possibly-absent stored value into a known game type. */
export function toGameType(value: unknown): GameType {
  return isGameType(value) ? value : DEFAULT_GAME_TYPE;
}

/**
 * What to call the game in the UI. 'other' carries a free-text label so a match
 * can still say what was played; everything else uses the catalog label.
 */
export function gameDisplayName(
  gameType: GameType | undefined,
  gameLabel?: string | null
): string {
  const type = toGameType(gameType);
  if (type === 'other') {
    return gameLabel?.trim() || GAMES.other.label;
  }
  return GAMES[type].label;
}

/** Rules page for a match's game, or null when there are none to link to. */
export function rulesPathFor(gameType: GameType | undefined): string | null {
  return GAMES[toGameType(gameType)].rulesPath;
}
