import { NextRequest } from 'next/server';
import { getMatches } from '@/lib/db/collections';
import { success, notFound, error, forbidden } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';
import { ObjectId } from 'mongodb';
import { onMatchResumed } from '@/lib/events/matchEvents';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestId = crypto.randomUUID?.() || Date.now().toString();
  const startTime = Date.now();

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return authResult;
    }
    const { userId } = authResult;

    logApiRequest(requestId, `POST /api/matches/${params.id}/resume`, userId, {
      matchId: params.id,
    });

    if (!ObjectId.isValid(params.id)) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    const matchesCol = await getMatches();
    const match = await matchesCol.findOne({
      _id: new ObjectId(params.id),
      deletedAt: null,
    });

    if (!match) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    if (match.creatorId !== userId) {
      logApiResponse(requestId, 403, Date.now() - startTime);
      return forbidden();
    }

    if (match.status !== 'ended') {
      logApiResponse(requestId, 409, Date.now() - startTime);
      return error('Match is not ended', 'NOT_ENDED', 409);
    }

    await matchesCol.updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { status: 'active', endedAt: null }, $inc: { version: 1 } }
    );

    await onMatchResumed().catch((err) => logError(requestId, err));

    logApiResponse(requestId, 200, Date.now() - startTime);
    return success({ matchId: params.id, status: 'active' });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
