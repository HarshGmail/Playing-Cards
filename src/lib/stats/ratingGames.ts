import { z } from 'zod';
import type { Document } from 'mongodb';
import { getMatches, getPlayerStats, PlayerStats } from '@/lib/db/collections';
import {
  GameType,
  PRIMARY_RATING_GAME,
  RATING_GAME_KEY_PATTERN,
  ratingGameFor,
  RatingGame,
} from '@/lib/games/catalog';
import { RankableStats, strictlyAheadFilter } from './leaderboard';

export const ratingGameKeySchema = z
  .string()
  .regex(RATING_GAME_KEY_PATTERN)
  .default(PRIMARY_RATING_GAME.key);

const RATED_MATCH_FILTER = { deletedAt: null, status: 'ended' as const, roundsPlayed: { $gte: 1 } };
const HAS_PLAYED = { gamesPlayed: { $gt: 0 } };

export function isPrimaryGame(gameKey: string): boolean {
  return gameKey === PRIMARY_RATING_GAME.key;
}

function gameRatingPath(gameKey: string): string {
  return `ratingsByGame.${gameKey}`;
}

export function gameRatingProjection(gameKey: string): Record<string, 1> {
  return isPrimaryGame(gameKey) ? {} : { [gameRatingPath(gameKey)]: 1 };
}

export function gameRatingStages(gameKey: string): Document[] {
  if (isPrimaryGame(gameKey)) return [{ $match: HAS_PLAYED }];
  const path = gameRatingPath(gameKey);
  return [
    { $match: { [`${path}.ratedMatches`]: { $gt: 0 } } },
    { $addFields: { rating: `$${path}.rating` } },
  ];
}

export function withGameRating<T extends Pick<PlayerStats, 'rating' | 'ratingsByGame'>>(
  stats: T,
  gameKey: string
): T | null {
  if (isPrimaryGame(gameKey)) return stats;
  const gameRating = stats.ratingsByGame?.[gameKey];
  return gameRating ? { ...stats, rating: gameRating.rating } : null;
}

export async function countAheadInGame(gameKey: string, stats: RankableStats): Promise<number> {
  const playerStatsCol = await getPlayerStats();
  const [result] = await playerStatsCol
    .aggregate<{ ahead: number }>([
      ...gameRatingStages(gameKey),
      { $match: strictlyAheadFilter('rating', stats) },
      { $count: 'ahead' },
    ])
    .toArray();
  return result?.ahead ?? 0;
}

export async function loadRatedGames(): Promise<RatingGame[]> {
  const matchesCol = await getMatches();
  const groups = await matchesCol
    .aggregate<{ _id: { gameType?: GameType; gameLabel?: string | null } }>([
      { $match: RATED_MATCH_FILTER },
      {
        $group: {
          _id: { gameType: '$gameType', gameLabel: '$gameLabel' },
          lastEndedAt: { $max: '$endedAt' },
        },
      },
      { $sort: { lastEndedAt: -1 } },
    ])
    .toArray();

  const gamesByKey = new Map<string, RatingGame>([[PRIMARY_RATING_GAME.key, PRIMARY_RATING_GAME]]);
  for (const { _id } of groups) {
    const game = ratingGameFor(_id.gameType, _id.gameLabel);
    if (!gamesByKey.has(game.key)) gamesByKey.set(game.key, game);
  }
  return Array.from(gamesByKey.values());
}

export interface PlayedGame extends RatingGame {
  rankPreference: 'highest-first' | 'lowest-first';
}

const NAMED_GAME_FILTER = { deletedAt: null, gameType: 'other' as const, gameLabel: { $nin: [null, ''] } };

export async function loadPlayedGames(): Promise<PlayedGame[]> {
  const matchesCol = await getMatches();
  const groups = await matchesCol
    .aggregate<{ _id: string; rankPreference: PlayedGame['rankPreference']; lastPlayedAt: Date }>([
      { $match: NAMED_GAME_FILTER },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$gameLabel',
          rankPreference: { $first: '$rankPreference' },
          lastPlayedAt: { $first: '$createdAt' },
        },
      },
      { $sort: { lastPlayedAt: -1 } },
    ])
    .toArray();

  const gamesByKey = new Map<string, PlayedGame>();
  for (const group of groups) {
    const game = ratingGameFor('other', group._id);
    if (!gamesByKey.has(game.key)) {
      gamesByKey.set(game.key, { ...game, rankPreference: group.rankPreference });
    }
  }
  return Array.from(gamesByKey.values());
}
