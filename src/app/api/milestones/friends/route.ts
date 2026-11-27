import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { success, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { getPlayerStats } from '@/lib/db/collections';
import { holdersByMilestone } from '@/lib/domain/milestoneHolders';
import { viewerAndFriendIds } from '@/lib/stats/friends';
import { loadIdentities, UNKNOWN_IDENTITY } from '@/lib/stats/identities';
import type { MilestoneFriendHolder } from '@/types';

export const dynamic = 'force-dynamic';

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
    logApiRequest(requestId, 'GET /api/milestones/friends', userId, {});

    const friendIds = (await viewerAndFriendIds(userId)).filter((id) => id !== userId);
    if (friendIds.length === 0) {
      logApiResponse(requestId, 200, Date.now() - startTime);
      return success({ holders: {} });
    }

    const playerStatsCol = await getPlayerStats();
    const docs = await playerStatsCol
      .find({ userId: { $in: friendIds } }, { projection: { _id: 0, userId: 1, milestones: 1 } })
      .toArray();
    const grouped = holdersByMilestone(docs.map((doc) => ({ userId: doc.userId, milestones: doc.milestones ?? [] })));
    const identities = await loadIdentities(docs.map((doc) => doc.userId));

    const holders: Record<string, MilestoneFriendHolder[]> = {};
    grouped.forEach((list, milestoneId) => {
      holders[milestoneId] = list.map((holder) => {
        const identity = identities.get(holder.userId) ?? UNKNOWN_IDENTITY;
        return { userId: holder.userId, ...identity, achievedAt: holder.achievedAt };
      });
    });

    logApiResponse(requestId, 200, Date.now() - startTime);
    return success({ holders });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
