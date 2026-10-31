import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAuth } from '@/lib/api/auth';
import { getMatches } from '@/lib/db/collections';
import { success, notFound, error, forbidden } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { computeWinForecast } from '@/lib/stats/winProbability';

export const dynamic = 'force-dynamic';

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

    logApiRequest(requestId, `GET /api/matches/${params.id}/forecast`, userId, {
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

    const canView =
      match.creatorId === userId ||
      match.roster.some((r) => r.userId === userId) ||
      (match.spectators ?? []).some((s) => s.userId === userId);

    if (!canView) {
      logApiResponse(requestId, 403, Date.now() - startTime);
      return forbidden();
    }

    const forecast = match.status === 'active' ? await computeWinForecast(params.id, match) : null;

    logApiResponse(requestId, 200, Date.now() - startTime);
    return success({ forecast });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
