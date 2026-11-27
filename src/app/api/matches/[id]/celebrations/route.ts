import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { success, notFound, error, forbidden } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { loadViewableMatch } from '@/lib/api/viewableMatch';
import { getNotifications } from '@/lib/db/collections';
import type { MatchCelebration } from '@/types';

export const dynamic = 'force-dynamic';

const CELEBRATION_WINDOW_MS = 30 * 60 * 1000;

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = crypto.randomUUID?.() || Date.now().toString();
  const startTime = Date.now();

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return authResult;
    }
    const { userId } = authResult;
    logApiRequest(requestId, `GET /api/matches/${params.id}/celebrations`, userId, { matchId: params.id });

    const result = await loadViewableMatch(params.id, userId);
    if (result.status === 'not-found') {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }
    if (result.status === 'forbidden') {
      logApiResponse(requestId, 403, Date.now() - startTime);
      return forbidden();
    }

    const { match } = result;
    const rosterIds = match.roster.map((entry) => entry.userId);
    const nameById = new Map(match.roster.map((entry) => [entry.userId, entry.userName]));
    const notificationsCol = await getNotifications();
    const notifications = await notificationsCol
      .find({
        type: 'milestone',
        userId: { $in: rosterIds },
        'payload.matchId': params.id,
        createdAt: { $gte: new Date(Date.now() - CELEBRATION_WINDOW_MS) },
      })
      .sort({ createdAt: 1 })
      .toArray();

    const celebrations: MatchCelebration[] = notifications.map((notification) => ({
      id: notification._id!.toString(),
      userId: notification.userId,
      userName: nameById.get(notification.userId) ?? 'Someone',
      milestoneId: String(notification.payload.milestoneId ?? ''),
      createdAt: notification.createdAt.toISOString(),
    }));

    logApiResponse(requestId, 200, Date.now() - startTime);
    return success({ celebrations });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
