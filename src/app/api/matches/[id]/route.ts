import { NextRequest } from 'next/server';
import { getMatches } from '@/lib/db/collections';
import { success, notFound, error, forbidden } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';
import { ObjectId } from 'mongodb';

export async function GET(
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
    logApiRequest(requestId, `GET /api/matches/${params.id}`, userId, {
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

    const isCreator = match.creatorId === userId;
    const isInRoster = match.roster.some((r) => r.userId === userId);

    if (!isCreator && !isInRoster) {
      logApiResponse(requestId, 403, Date.now() - startTime);
      return forbidden();
    }

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({
      match: {
        id: match._id?.toString(),
        name: match.name,
        creatorId: match.creatorId,
        creatorRole: match.creatorRole,
        rankPreference: match.rankPreference,
        status: match.status,
        tiebreakers: match.tiebreakers,
        roster: match.roster.map((r) => ({
          userId: r.userId,
          userName: r.userName,
          joinedAtRound: r.joinedAtRound,
          status: r.status,
          dnfAfterRound: r.dnfAfterRound,
          order: r.order,
        })),
        roundsPlayed: match.roundsPlayed,
        version: match.version,
        createdAt: match.createdAt,
        endedAt: match.endedAt,
      },
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
