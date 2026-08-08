import { NextRequest } from 'next/server';
import { getMatchInvites, getMatches, getUsers } from '@/lib/db/collections';
import {
  success,
  notFound,
  error,
  forbidden,
  conflict,
  validationError,
} from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';
import { withTransaction } from '@/lib/db/client';
import { notifyUser } from '@/lib/notifications/create';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const respondSchema = z.object({
  action: z.enum(['accept', 'decline']),
});

/**
 * POST /api/match-invites/[id]
 * Accept or decline a match invitation. Only the invitee can respond — not even
 * the creator who sent it, which is the whole point of the mechanism.
 *
 * Accepting is what puts the player on the roster; until then no round can
 * include them and nothing reaches their career stats.
 */
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

    const body = await request.json();

    logApiRequest(requestId, `POST /api/match-invites/${params.id}`, userId, {
      inviteId: params.id,
      action: body.action,
    });

    const parsed = respondSchema.safeParse(body);
    if (!parsed.success) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return validationError(parsed.error.issues[0]?.message || 'Invalid input');
    }

    if (!ObjectId.isValid(params.id)) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    const invitesCol = await getMatchInvites();
    const invite = await invitesCol.findOne({ _id: new ObjectId(params.id) });

    if (!invite) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    if (invite.userId !== userId) {
      logApiResponse(requestId, 403, Date.now() - startTime);
      return forbidden();
    }

    if (invite.status !== 'pending') {
      logApiResponse(requestId, 409, Date.now() - startTime);
      return error('Invite already responded to', 'ALREADY_RESPONDED', 409);
    }

    const matchesCol = await getMatches();
    const match = await matchesCol.findOne({
      _id: new ObjectId(invite.matchId),
      deletedAt: null,
    });

    if (!match) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    const action = parsed.data.action;
    const respondedAt = new Date();

    if (action === 'decline') {
      await invitesCol.updateOne(
        { _id: new ObjectId(params.id), status: 'pending' },
        { $set: { status: 'declined', respondedAt } }
      );

      await notifyUser(invite.invitedBy, 'match-invite-declined', {
        matchId: invite.matchId,
        matchName: match.name,
        userId,
        userName: (await nameOf(userId)) || 'A player',
      }).catch((err) => logError(requestId, err));

      logApiResponse(requestId, 200, Date.now() - startTime);
      return success({ inviteId: params.id, matchId: invite.matchId, status: 'declined' });
    }

    if (match.status === 'ended') {
      logApiResponse(requestId, 409, Date.now() - startTime);
      return conflict('This match has already ended');
    }

    if (match.roster.some((r) => r.userId === userId)) {
      // Already rostered (e.g. joined by share link after being invited).
      // Settle the invite so it stops showing up, and report success.
      await invitesCol.updateOne(
        { _id: new ObjectId(params.id), status: 'pending' },
        { $set: { status: 'accepted', respondedAt } }
      );

      logApiResponse(requestId, 200, Date.now() - startTime);
      return success({
        inviteId: params.id,
        matchId: invite.matchId,
        status: 'accepted',
        alreadyInMatch: true,
      });
    }

    const usersCol = await getUsers();
    const user = await usersCol.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return error('User not found', 'USER_NOT_FOUND', 404);
    }

    const joinedAtRound = match.roundsPlayed + 1;

    // Roster entry and invite status move together: a half-applied accept would
    // either leave a player unable to accept a match they aren't in, or leave a
    // pending invite for a match they are already playing.
    await withTransaction(async (session) => {
      await matchesCol.updateOne(
        {
          _id: new ObjectId(invite.matchId),
          // Guards a double-submit from pushing two entries for one player.
          'roster.userId': { $ne: userId },
        },
        {
          $push: {
            roster: {
              userId,
              userName: user.name,
              joinedAtRound,
              status: 'active' as const,
              dnfAfterRound: null,
              order: match.roster.length,
            },
          },
          $inc: { version: 1 },
        },
        { session }
      );

      await invitesCol.updateOne(
        { _id: new ObjectId(params.id), status: 'pending' },
        { $set: { status: 'accepted', respondedAt } },
        { session }
      );
    });

    await notifyUser(invite.invitedBy, 'match-invite-accepted', {
      matchId: invite.matchId,
      matchName: match.name,
      userId,
      userName: user.name,
    }).catch((err) => logError(requestId, err));

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({
      inviteId: params.id,
      matchId: invite.matchId,
      status: 'accepted',
      joinedAtRound,
      version: match.version + 1,
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

async function nameOf(userId: string): Promise<string | null> {
  const usersCol = await getUsers();
  const user = await usersCol.findOne({ _id: new ObjectId(userId) });
  return user?.name ?? null;
}
