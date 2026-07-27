import { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth/jwt';
import { getMatches } from '@/lib/db/collections';
import { success, notFound, unauthorized, error, forbidden, validationError } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { crypto } from 'next/dist/compiled/@edge-runtime/primitives';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

const updateRosterSchema = z.object({
  action: z.enum(['mark-dnf', 'rejoin']),
});

/**
 * PATCH /api/matches/[id]/roster/[userId]
 * Mark a player as DNF (Did Not Finish) or rejoin.
 * Only creator can manage roster.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const token = request.cookies.get('auth')?.value;
    if (!token) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return unauthorized();
    }

    const payload = await verifyJwt(token);
    if (!payload?.userId) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return unauthorized();
    }

    const body = await request.json();

    logApiRequest(requestId, `PATCH /api/matches/${params.id}/roster/${params.userId}`, payload.userId, {
      matchId: params.id,
      targetUserId: params.userId,
      action: body.action,
    });

    // Validate ObjectId format
    if (!ObjectId.isValid(params.id)) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    // Validate request body
    const parsed = updateRosterSchema.safeParse(body);
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

    // Only creator can manage roster
    if (match.creatorId !== payload.userId) {
      logApiResponse(requestId, 403, Date.now() - startTime);
      return forbidden();
    }

    // Find the roster entry
    const rosterEntry = match.roster.find((r) => r.userId === params.userId);
    if (!rosterEntry) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return error('Player not in match', 'PLAYER_NOT_FOUND', 404);
    }

    const action = parsed.data.action;

    if (action === 'mark-dnf') {
      // Mark player as DNF after current round
      if (rosterEntry.status === 'dnf') {
        logApiResponse(requestId, 400, Date.now() - startTime);
        return error('Player already marked as DNF', 'ALREADY_DNF', 400);
      }

      await matchesCol.updateOne(
        { _id: new ObjectId(params.id), 'roster.userId': params.userId },
        {
          $set: {
            'roster.$.status': 'dnf',
            'roster.$.dnfAfterRound': match.roundsPlayed,
            version: match.version + 1,
          },
        }
      );
    } else if (action === 'rejoin') {
      // Allow player to rejoin
      if (rosterEntry.status !== 'dnf') {
        logApiResponse(requestId, 400, Date.now() - startTime);
        return error('Player is not marked as DNF', 'NOT_DNF', 400);
      }

      await matchesCol.updateOne(
        { _id: new ObjectId(params.id), 'roster.userId': params.userId },
        {
          $set: {
            'roster.$.status': 'active',
            'roster.$.dnfAfterRound': null,
            version: match.version + 1,
          },
        }
      );
    }

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({
      matchId: params.id,
      userId: params.userId,
      action,
      newStatus: action === 'mark-dnf' ? 'dnf' : 'active',
      version: match.version + 1,
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
