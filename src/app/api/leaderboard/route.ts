import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getFriendships, getPlayerStats } from '@/lib/db/collections';
import { success, validationError, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';
import { ZERO_PLAYER_STATS } from '@/lib/domain/playerStats';
import { ALL_GAMES_KEY, PRIMARY_RATING_GAME, RATING_GAME_KEY_PATTERN } from '@/lib/games/catalog';
import {
  buildLeaderboard,
  LeaderboardSource,
  RankableStats,
  rankableStatsFor,
} from '@/lib/stats/leaderboard';
import { loadIdentities, UNKNOWN_IDENTITY } from '@/lib/stats/identities';
import { loadRatedGames } from '@/lib/stats/ratingGames';
import type { LeaderboardMetric, LeaderboardScope } from '@/types';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const HAS_PLAYED = { gamesPlayed: { $gt: 0 } };

const gameKeySchema = z
  .string()
  .refine((key) => key === ALL_GAMES_KEY || RATING_GAME_KEY_PATTERN.test(key))
  .default(PRIMARY_RATING_GAME.key);

const querySchema = z.object({
  scope: z.enum(['friends', 'global']).default('friends'),
  metric: z.enum(['rating', 'winPct', 'matchWins', 'gamesWon']).default('rating'),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  game: gameKeySchema,
});

const SOURCE_PROJECTION = {
  _id: 0,
  userId: 1,
  rating: 1,
  matchWins: 1,
  podiums: 1,
  gamesWon: 1,
  gamesPlayed: 1,
  matchesPlayed: 1,
  ratingsByGame: 1,
  'streaks.currentGameStreak': 1,
  'streaks.currentMatchStreak': 1,
} as const;

interface LeaderboardQuery {
  scope: LeaderboardScope;
  viewerId: string;
  metric: LeaderboardMetric;
  gameKey: string;
  limit: number;
}

function effectiveGameKey(metric: LeaderboardMetric, gameKey: string): string {
  return metric === 'rating' && gameKey === ALL_GAMES_KEY ? PRIMARY_RATING_GAME.key : gameKey;
}

function zeroSource(userId: string): LeaderboardSource {
  return { userId, ...ZERO_PLAYER_STATS, podiums: { ...ZERO_PLAYER_STATS.podiums } };
}

async function friendIdsOf(viewerId: string): Promise<string[]> {
  const friendshipsCol = await getFriendships();
  const friendships = await friendshipsCol
    .find({ $or: [{ userA: viewerId }, { userB: viewerId }] }, { projection: { userA: 1, userB: 1 } })
    .toArray();
  return Array.from(
    new Set([viewerId, ...friendships.map((f) => (f.userA === viewerId ? f.userB : f.userA))])
  );
}

async function loadSources({ scope, viewerId }: LeaderboardQuery): Promise<LeaderboardSource[]> {
  const playerStatsCol = await getPlayerStats();
  if (scope === 'global') {
    return (await playerStatsCol
      .find(HAS_PLAYED, { projection: SOURCE_PROJECTION })
      .toArray()) as unknown as LeaderboardSource[];
  }
  const memberIds = await friendIdsOf(viewerId);
  const docs = (await playerStatsCol
    .find({ userId: { $in: memberIds } }, { projection: SOURCE_PROJECTION })
    .toArray()) as unknown as LeaderboardSource[];
  const docsById = new Map(docs.map((doc) => [doc.userId, doc]));
  return memberIds.map((id) => docsById.get(id) ?? zeroSource(id));
}

async function leaderboardFor(query: LeaderboardQuery) {
  const gameKey = effectiveGameKey(query.metric, query.gameKey);
  const sources = await loadSources(query);
  const eligible = sources
    .map((source) => rankableStatsFor(source, gameKey))
    .filter((stats): stats is RankableStats => stats !== null);

  const identities = await loadIdentities(eligible.map((stats) => stats.userId));
  const entries = eligible
    .filter((stats) => query.scope === 'global' || identities.has(stats.userId))
    .map((stats) => ({ stats, identity: identities.get(stats.userId) ?? UNKNOWN_IDENTITY }));

  return buildLeaderboard(query.metric, entries, query.viewerId, query.limit);
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID?.() || Date.now().toString();
  const startTime = Date.now();

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return authResult;
    }
    const { userId } = authResult;

    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    logApiRequest(requestId, 'GET /api/leaderboard', userId, searchParams);

    const parsed = querySchema.safeParse(searchParams);
    if (!parsed.success) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return validationError(
        `scope must be friends|global, metric rating|winPct|matchWins|gamesWon, limit 1-100, game a lowercase slug or ${ALL_GAMES_KEY}`
      );
    }
    const { scope, metric, limit, game } = parsed.data;

    const [result, games] = await Promise.all([
      leaderboardFor({ scope, viewerId: userId, metric, gameKey: game, limit }),
      loadRatedGames(),
    ]);

    logApiResponse(requestId, 200, Date.now() - startTime);
    return success({ ...result, games });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
