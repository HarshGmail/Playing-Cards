import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { getMatches, getJoinRequests, getUsers } from '@/lib/db/collections';
import { success, notFound, unauthorized, error, forbidden, validationError } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const respondSchema = z.object({
  action: z.enum(['approve', 'decline']),
});

/**
 * POST /api/matches/[id]/join-requests/[requestId]
 * Respond to a join request (approve/decline).
 * Only match creator can respond.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; requestId: string } }
) {
  const startTime = Date.now();
  const logId = crypto.randomUUID?.() || Date.now().toString();

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      logApiResponse(logId, 401, Date.now() - startTime);
      return authResult;
    }
    const { userId } = authResult;

    const body = await request.json();

    logApiRequest(logId, `POST /api/matches/${params.id}/join-requests/${params.requestId}`, userId, {
      matchId: params.id,
      requestId: params.requestId,
      action: body.action,
    });

    // Validate request body
    const parsed = respondSchema.safeParse(body);
    if (!parsed.success) {
      logApiResponse(logId, 400, Date.now() - startTime);
      return validationError(parsed.error.issues[0]?.message || 'Invalid input');
    }

    // Validate ObjectId formats
    if (!ObjectId.isValid(params.id) || !ObjectId.isValid(params.requestId)) {
      logApiResponse(logId, 404, Date.now() - startTime);
      return notFound();
    }

    const matchesCol = await getMatches();
    const match = await matchesCol.findOne({
      _id: new ObjectId(params.id),
      deletedAt: null,
    });

    if (!match) {
      logApiResponse(logId, 404, Date.now() - startTime);
      return notFound();
    }

    // Only creator can respond
    if (match.creatorId !== userId) {
      logApiResponse(logId, 403, Date.now() - startTime);
      return forbidden();
    }

    const joinRequestsCol = await getJoinRequests();
    const joinRequest = await joinRequestsCol.findOne({
      _id: new ObjectId(params.requestId),
      matchId: params.id,
    });

    if (!joinRequest) {
      logApiResponse(logId, 404, Date.now() - startTime);
      return notFound();
    }

    // Check if already responded
    if (joinRequest.status !== 'pending') {
      return error('Request already responded', 'ALREADY_RESPONDED', 409);
    }

    const action = parsed.data.action;

    if (action === 'approve') {
      // Check if user already in match
      if (match.roster.some((r) => r.userId === joinRequest.userId)) {
        return error('User already in match', 'ALREADY_IN_MATCH', 409);
      }

      // Add user to roster
      const usersCol = await getUsers();
      const user = await usersCol.findOne({
        _id: new ObjectId(joinRequest.userId),
      });

      if (!user) {
        return error('User not found', 'USER_NOT_FOUND', 404);
      }

      const newRosterEntry = {
        userId: joinRequest.userId,
        userName: user.name,
        joinedAtRound: match.roundsPlayed + 1,
        status: 'active' as const,
        dnfAfterRound: null,
        order: match.roster.length,
      };

      await matchesCol.updateOne(
        { _id: new ObjectId(params.id) },
        {
          $push: {
            roster: newRosterEntry,
          },
          $inc: { version: 1 },
        }
      );
    }

    // Update request status
    await joinRequestsCol.updateOne(
      { _id: new ObjectId(params.requestId) },
      {
        $set: {
          status: action === 'approve' ? 'approved' : 'declined',
          respondedAt: new Date(),
        },
      }
    );

    logApiResponse(logId, 200, Date.now() - startTime);

    return success({
      requestId: params.requestId,
      matchId: params.id,
      action,
      status: action === 'approve' ? 'approved' : 'declined',
      version: action === 'approve' ? match.version + 1 : match.version,
    });
  } catch (err) {
    logError(logId, err);
    logApiResponse(logId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
