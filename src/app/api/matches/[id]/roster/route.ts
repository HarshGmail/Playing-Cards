import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { getMatches, getUsers } from '@/lib/db/collections';
import { success, notFound, unauthorized, error, forbidden, validationError, conflict } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { invitePlayersToMatch } from '@/lib/domain/matchInvites';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const addPlayerSchema = z.object({
  userId: z.string(),
});

/**
 * POST /api/matches/[id]/roster
 * Invite a player to the match mid-game.
 *
 * Only the creator can invite, and the invite only becomes a roster entry when
 * the invitee accepts — the same rule that applies at creation time. Gating one
 * and not the other would be no gate at all: a creator could open with an empty
 * roster and fill it here instead.
 */
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

    const body = await request.json();

    logApiRequest(requestId, `POST /api/matches/${params.id}/roster`, userId, {
      matchId: params.id,
      newUserId: body.userId,
    });

    // Validate ObjectId format
    if (!ObjectId.isValid(params.id)) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    // Validate request body
    const parsed = addPlayerSchema.safeParse(body);
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

    // Only creator can add players
    if (match.creatorId !== userId) {
      logApiResponse(requestId, 403, Date.now() - startTime);
      return forbidden();
    }

    if (match.status === 'ended') {
      logApiResponse(requestId, 409, Date.now() - startTime);
      return conflict('Match has ended');
    }

    const newUserId = parsed.data.userId;

    if (!ObjectId.isValid(newUserId)) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return error('User not found', 'USER_NOT_FOUND', 404);
    }

    // Check player is not already in roster
    if (match.roster.some((r) => r.userId === newUserId)) {
      logApiResponse(requestId, 409, Date.now() - startTime);
      return conflict('Player already in match');
    }

    // Verify user exists
    const usersCol = await getUsers();
    const user = await usersCol.findOne({ _id: new ObjectId(newUserId) });

    if (!user) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return error('User not found', 'USER_NOT_FOUND', 404);
    }

    const creator = await usersCol.findOne({ _id: new ObjectId(userId) });

    const invited = await invitePlayersToMatch({
      matchId: params.id,
      matchName: match.name,
      invitedBy: userId,
      invitedByName: creator?.name || '',
      userIds: [newUserId],
    });

    logApiResponse(requestId, 201, Date.now() - startTime);

    return success(
      {
        matchId: params.id,
        userId: newUserId,
        userName: user.name,
        inviteId: invited[0]?.inviteId ?? null,
        status: 'pending',
        // The roster is unchanged until the invitee accepts, so the match
        // version has not moved.
        version: match.version,
      },
      201
    );
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
