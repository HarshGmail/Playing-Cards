import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { getMatches, getUsers } from '@/lib/db/collections';
import { success, notFound, error, forbidden, validationError, conflict } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { notifyUser } from '@/lib/notifications/create';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const addSpectatorSchema = z.object({
  userId: z.string(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID?.() || Date.now().toString();

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return authResult;
    }
    const { userId } = authResult;

    const body = await request.json().catch(() => ({}));

    logApiRequest(requestId, `POST /api/matches/${params.id}/spectators`, userId, {
      matchId: params.id,
      spectatorId: body?.userId,
    });

    if (!ObjectId.isValid(params.id)) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    const parsed = addSpectatorSchema.safeParse(body);
    if (!parsed.success) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return validationError(parsed.error.issues[0]?.message || 'Invalid input');
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

    const spectatorId = parsed.data.userId;

    if (!ObjectId.isValid(spectatorId)) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return error('User not found', 'USER_NOT_FOUND', 404);
    }

    if (spectatorId === userId || match.roster.some((r) => r.userId === spectatorId)) {
      logApiResponse(requestId, 409, Date.now() - startTime);
      return conflict('Player already in match');
    }

    if ((match.spectators ?? []).some((s) => s.userId === spectatorId)) {
      logApiResponse(requestId, 409, Date.now() - startTime);
      return conflict('Already spectating this match');
    }

    const usersCol = await getUsers();
    const spectator = await usersCol.findOne({ _id: new ObjectId(spectatorId) });

    if (!spectator) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return error('User not found', 'USER_NOT_FOUND', 404);
    }

    await matchesCol.updateOne(
      { _id: match._id },
      {
        $push: { spectators: { userId: spectatorId, userName: spectator.name } },
        $inc: { version: 1 },
      }
    );

    const creator = await usersCol.findOne({ _id: new ObjectId(userId) });

    await notifyUser(spectatorId, 'added-to-match', {
      matchId: params.id,
      matchName: match.name,
      role: 'spectator',
      invitedByName: creator?.name || '',
    }).catch((err) => logError(requestId, err));

    logApiResponse(requestId, 201, Date.now() - startTime);

    return success(
      {
        matchId: params.id,
        userId: spectatorId,
        userName: spectator.name,
        role: 'spectator',
      },
      201
    );
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
