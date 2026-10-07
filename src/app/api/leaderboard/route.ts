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
import type { LeaderboardMetric, LeaderboardRow } from '@/types';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const HAS_PLAYED = { gamesPlayed: { $gt: 0 } };
const UNKNOWN_IDENTITY: RankableIdentity = { name: 'Unknown', username: '', profilePicUrl: null };

const querySchema = z.object({
  scope: z.enum(['friends', 'global']).default('friends'),
  metric: z.enum(['rating', 'winPct']).default('rating'),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
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
} as const;

type StatsRow = Pick<PlayerStats, keyof RankableStats>;

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

async function friendsLeaderboard(viewerId: string, metric: LeaderboardMetric) {
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
      .find({ userId: { $in: memberIds } }, { projection: STATS_PROJECTION })
      .toArray() as Promise<StatsRow[]>,
    loadIdentities(memberIds),
  ]);
  const statsById = new Map(statsDocs.map((doc) => [doc.userId, doc]));

  const rows = rankByMetric(
    metric,
    memberIds
      .filter((id) => identities.has(id))
      .map((id) => ({ stats: statsById.get(id) ?? zeroStats(id), identity: identities.get(id)! })),
    viewerId
  );
  return { rows, self: rows.find((row) => row.isSelf) ?? null };
}

async function globalLeaderboard(viewerId: string, metric: LeaderboardMetric, limit: number) {
  const playerStatsCol = await getPlayerStats();
  const [facet] = await playerStatsCol
    .aggregate<{ top: StatsRow[]; self: StatsRow[] }>([
      {
        $facet: {
          top: [
            { $match: HAS_PLAYED },
            { $sort: mongoSort(metric) },
            { $limit: limit },
            { $project: STATS_PROJECTION },
          ],
          self: [{ $match: { userId: viewerId, ...HAS_PLAYED } }, { $project: STATS_PROJECTION }],
        },
      },
    ])
    .toArray();

  const top = facet?.top ?? [];
  const viewerStats = facet?.self[0] ?? null;
  const viewerInTop = top.some((doc) => doc.userId === viewerId);

  const [identities, viewerAheadCount] = await Promise.all([
    loadIdentities([...top.map((doc) => doc.userId), viewerId]),
    viewerStats && !viewerInTop
      ? playerStatsCol.countDocuments({ ...HAS_PLAYED, ...strictlyAheadFilter(metric, viewerStats) })
      : Promise.resolve(0),
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
      return validationError('scope must be friends|global, metric rating|winPct, limit 1-100');
    }
    const { scope, metric, limit } = parsed.data;

    const result =
      scope === 'friends'
        ? await friendsLeaderboard(userId, metric)
        : await globalLeaderboard(userId, metric, limit);

    logApiResponse(requestId, 200, Date.now() - startTime);
    return success(result);
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
