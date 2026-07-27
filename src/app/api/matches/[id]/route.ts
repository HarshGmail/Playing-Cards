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

/**
 * PATCH /api/matches/[id]
 * End a match. Only the creator can end it; a match can only be ended once.
 */
export async function PATCH(
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

    logApiRequest(requestId, `PATCH /api/matches/${params.id}`, userId, {
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

    if (match.status === 'ended') {
      logApiResponse(requestId, 409, Date.now() - startTime);
      return error('Match already ended', 'ALREADY_ENDED', 409);
    }

    const endedAt = new Date();
    await matchesCol.updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { status: 'ended', endedAt }, $inc: { version: 1 } }
    );

    logApiResponse(requestId, 200, Date.now() - startTime);
    return success({ matchId: params.id, status: 'ended', endedAt });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

/**
 * DELETE /api/matches/[id]
 * Soft-delete (dissolve) a match. Only the creator can dissolve it.
 */
export async function DELETE(
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

    logApiRequest(requestId, `DELETE /api/matches/${params.id}`, userId, {
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

    await matchesCol.updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { deletedAt: new Date() }, $inc: { version: 1 } }
    );

    logApiResponse(requestId, 200, Date.now() - startTime);
    return success({ matchId: params.id, deleted: true });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
