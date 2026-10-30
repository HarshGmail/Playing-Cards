import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { getFriendships, getPlayerStats, getUsers, PlayerStats } from '@/lib/db/collections';
import { success, validationError, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';
import { ZERO_PLAYER_STATS } from '@/lib/domain/playerStats';
import {
  METRIC_SORT_KEYS,
  RankableIdentity,
  RankableStats,
  rankByMetric,
  sortRows,
  strictlyAheadFilter,
  toLeaderboardRow,
} from '@/lib/stats/leaderboard';
import {
  countAheadInGame,
  gameRatingProjection,
  gameRatingStages,
  isPrimaryGame,
  loadRatedGames,
  ratingGameKeySchema,
  withGameRating,
} from '@/lib/stats/ratingGames';
import type { LeaderboardMetric, LeaderboardRow } from '@/types';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const HAS_PLAYED = { gamesPlayed: { $gt: 0 } };
const UNKNOWN_IDENTITY: RankableIdentity = { name: 'Unknown', username: '', profilePicUrl: null };

const querySchema = z.object({
  scope: z.enum(['friends', 'global']).default('friends'),
  metric: z.enum(['rating', 'winPct', 'matchWins', 'gamesWon']).default('rating'),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  game: ratingGameKeySchema,
});

const STATS_PROJECTION = {
  _id: 0,
  userId: 1,
  rating: 1,
  winPct: 1,
  matchWins: 1,
  podiums: 1,
  gamesWon: 1,
  gamesPlayed: 1,
  matchesPlayed: 1,
  'streaks.currentGameStreak': 1,
  'streaks.currentMatchStreak': 1,
} as const;

type StatsRow = Pick<PlayerStats, keyof RankableStats | 'ratingsByGame'>;

function zeroStats(userId: string): RankableStats {
  return { userId, ...ZERO_PLAYER_STATS, podiums: { ...ZERO_PLAYER_STATS.podiums } };
}

function mongoSort(metric: LeaderboardMetric): Record<string, -1> {
  const [primary, secondary] = METRIC_SORT_KEYS[metric];
  return { [primary]: -1, [secondary]: -1 };
}

async function loadIdentities(userIds: string[]): Promise<Map<string, RankableIdentity>> {
  const objectIds = userIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  if (objectIds.length === 0) return new Map();
  const usersCol = await getUsers();
  const users = await usersCol
    .find(
      { _id: { $in: objectIds } },
      { projection: { name: 1, username: 1, profilePicUrl: 1 } }
    )
    .toArray();
  return new Map(
    users.map((u) => [
      u._id!.toString(),
      { name: u.name, username: u.username, profilePicUrl: u.profilePicUrl ?? null },
    ])
  );
}

interface LeaderboardQuery {
  viewerId: string;
  metric: LeaderboardMetric;
  gameKey: string;
}

function isGameRatingQuery({ metric, gameKey }: LeaderboardQuery): boolean {
  return metric === 'rating' && !isPrimaryGame(gameKey);
}

function statsProjection(query: LeaderboardQuery) {
  return isGameRatingQuery(query)
    ? { ...STATS_PROJECTION, ...gameRatingProjection(query.gameKey) }
    : STATS_PROJECTION;
}

function friendsStatsFor(
  query: LeaderboardQuery,
  memberIds: string[],
  statsById: Map<string, StatsRow>
): Map<string, RankableStats> {
  const statsByMember = new Map<string, RankableStats>();
  for (const id of memberIds) {
    const doc = statsById.get(id);
    if (!isGameRatingQuery(query)) {
      statsByMember.set(id, doc ?? zeroStats(id));
      continue;
    }
    const rated = doc ? withGameRating(doc, query.gameKey) : null;
    if (rated) statsByMember.set(id, rated);
  }
  return statsByMember;
}

async function friendsLeaderboard(query: LeaderboardQuery) {
  const { viewerId, metric } = query;
  const friendshipsCol = await getFriendships();
  const friendships = await friendshipsCol
    .find({ $or: [{ userA: viewerId }, { userB: viewerId }] }, { projection: { userA: 1, userB: 1 } })
    .toArray();
  const memberIds = Array.from(
    new Set([viewerId, ...friendships.map((f) => (f.userA === viewerId ? f.userB : f.userA))])
  );

  const playerStatsCol = await getPlayerStats();
  const [statsDocs, identities] = await Promise.all([
    playerStatsCol
      .find({ userId: { $in: memberIds } }, { projection: statsProjection(query) })
      .toArray() as Promise<StatsRow[]>,
    loadIdentities(memberIds),
  ]);
  const statsByMember = friendsStatsFor(
    query,
    memberIds,
    new Map(statsDocs.map((doc) => [doc.userId, doc]))
  );

  const rows = rankByMetric(
    metric,
    Array.from(statsByMember)
      .filter(([id]) => identities.has(id))
      .map(([id, stats]) => ({ stats, identity: identities.get(id)! })),
    viewerId
  );
  return { rows, self: rows.find((row) => row.isSelf) ?? null };
}

function eligibleStages(query: LeaderboardQuery) {
  return isGameRatingQuery(query) ? gameRatingStages(query.gameKey) : [{ $match: HAS_PLAYED }];
}

function countAhead(query: LeaderboardQuery, stats: RankableStats): Promise<number> {
  if (isGameRatingQuery(query)) return countAheadInGame(query.gameKey, stats);
  return getPlayerStats().then((col) =>
    col.countDocuments({ ...HAS_PLAYED, ...strictlyAheadFilter(query.metric, stats) })
  );
}

async function globalLeaderboard(query: LeaderboardQuery, limit: number) {
  const { viewerId, metric } = query;
  const playerStatsCol = await getPlayerStats();
  const [facet] = await playerStatsCol
    .aggregate<{ top: StatsRow[]; self: StatsRow[] }>([
      ...eligibleStages(query),
      {
        $facet: {
          top: [
            { $sort: mongoSort(metric) },
            { $limit: limit },
            { $project: STATS_PROJECTION },
          ],
          self: [{ $match: { userId: viewerId } }, { $project: STATS_PROJECTION }],
        },
      },
    ])
    .toArray();

  const top = facet?.top ?? [];
  const viewerStats = facet?.self[0] ?? null;
  const viewerInTop = top.some((doc) => doc.userId === viewerId);

  const [identities, viewerAheadCount] = await Promise.all([
    loadIdentities([...top.map((doc) => doc.userId), viewerId]),
    viewerStats && !viewerInTop ? countAhead(query, viewerStats) : Promise.resolve(0),
  ]);
  const identityOf = (userId: string) => identities.get(userId) ?? UNKNOWN_IDENTITY;

  const rows = rankByMetric(
    metric,
    top.map((stats) => ({ stats, identity: identityOf(stats.userId) })),
    viewerId
  );

  let self: LeaderboardRow | null = rows.find((row) => row.isSelf) ?? null;
  if (!self && viewerStats) {
    self = toLeaderboardRow(viewerAheadCount + 1, viewerStats, identityOf(viewerId), viewerId);
  }
  return { rows: sortRows(metric, rows), self };
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
        'scope must be friends|global, metric rating|winPct|matchWins|gamesWon, limit 1-100, game a lowercase slug'
      );
    }
    const { scope, metric, limit, game } = parsed.data;
    const query: LeaderboardQuery = { viewerId: userId, metric, gameKey: game };

    const [result, games] = await Promise.all([
      scope === 'friends' ? friendsLeaderboard(query) : globalLeaderboard(query, limit),
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
