import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { success, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { getMatches } from '@/lib/db/collections';
import { toGameType } from '@/lib/games/catalog';
import {
  FEED_RECENT_DAYS,
  isFeedWorthy,
  orderFeed,
  toFriendMatchCard,
  type FeedMatch,
} from '@/lib/domain/friendsFeed';
import { viewerAndFriendIds } from '@/lib/stats/friends';
import { loadIdentities } from '@/lib/stats/identities';

export const dynamic = 'force-dynamic';

const FEED_LIMIT = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

const FEED_PROJECTION = {
  name: 1,
  status: 1,
  roundsPlayed: 1,
  createdAt: 1,
  endedAt: 1,
  gameType: 1,
  gameLabel: 1,
  roster: 1,
  standings: 1,
} as const;

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
    logApiRequest(requestId, 'GET /api/matches/feed', userId, {});

    const friendIds = (await viewerAndFriendIds(userId)).filter((id) => id !== userId);
    if (friendIds.length === 0) {
      logApiResponse(requestId, 200, Date.now() - startTime);
      return success({ matches: [] });
    }

    const now = new Date();
    const matchesCol = await getMatches();
    const docs = await matchesCol
      .find(
        {
          deletedAt: null,
          'roster.userId': { $in: friendIds },
          $or: [{ status: 'active' }, { endedAt: { $gte: new Date(now.getTime() - FEED_RECENT_DAYS * DAY_MS) } }],
        },
        { projection: FEED_PROJECTION }
      )
      .toArray();

    const feed: FeedMatch[] = docs.map((doc) => ({
      id: doc._id!.toString(),
      name: doc.name,
      status: doc.status,
      roundsPlayed: doc.roundsPlayed,
      createdAt: doc.createdAt,
      endedAt: doc.endedAt ?? null,
      gameType: toGameType(doc.gameType),
      gameLabel: doc.gameLabel ?? null,
      roster: doc.roster.map((entry) => ({ userId: entry.userId, userName: entry.userName })),
      standings: doc.standings ?? [],
    }));
    const shown = orderFeed(feed.filter((match) => isFeedWorthy(match, userId, now))).slice(0, FEED_LIMIT);

    const identities = await loadIdentities(shown.flatMap((match) => match.standings.map((s) => s.playerId)));
    const friendSet = new Set(friendIds);

    logApiResponse(requestId, 200, Date.now() - startTime);
    return success({ matches: shown.map((match) => toFriendMatchCard(match, friendSet, identities)) });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
