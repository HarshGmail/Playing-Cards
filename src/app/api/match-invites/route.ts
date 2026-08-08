import { NextRequest } from 'next/server';
import { getMatchInvites, getMatches, getUsers } from '@/lib/db/collections';
import { success, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

/**
 * GET /api/match-invites
 * The signed-in user's pending match invitations.
 *
 * Deliberately not nested under /api/matches/[id]: an invitee has no read
 * access to the match until they accept, so this endpoint joins in the handful
 * of fields needed to decide rather than sending them to the match resource.
 */
export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID?.() || Date.now().toString();
  const startTime = Date.now();

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return authResult;
    }

    const { userId } = authResult;
    logApiRequest(requestId, 'GET /api/match-invites', userId, {});

    const invitesCol = await getMatchInvites();
    const invites = await invitesCol
      .find({ userId, status: 'pending' })
      .sort({ createdAt: -1 })
      .toArray();

    if (invites.length === 0) {
      logApiResponse(requestId, 200, Date.now() - startTime);
      return success({ invites: [] });
    }

    const matchesCol = await getMatches();
    const matches = await matchesCol
      .find({
        _id: { $in: invites.map((i) => new ObjectId(i.matchId)) },
        deletedAt: null,
      })
      .toArray();
    const matchesById = new Map(matches.map((m) => [m._id?.toString(), m]));

    const usersCol = await getUsers();
    const inviters = await usersCol
      .find({ _id: { $in: invites.map((i) => new ObjectId(i.invitedBy)) } })
      .toArray();
    const invitersById = new Map(inviters.map((u) => [u._id?.toString(), u]));

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({
      invites: invites
        // A dissolved or missing match leaves its invites behind; there is
        // nothing to accept, so don't offer them.
        .filter((invite) => matchesById.has(invite.matchId))
        .map((invite) => {
          const match = matchesById.get(invite.matchId)!;
          const inviter = invitersById.get(invite.invitedBy);
          return {
            id: invite._id?.toString(),
            matchId: invite.matchId,
            matchName: match.name,
            matchStatus: match.status,
            roundsPlayed: match.roundsPlayed,
            playerCount: match.roster.length,
            invitedBy: invite.invitedBy,
            invitedByName: inviter?.name || 'Someone',
            invitedByUsername: inviter?.username || '',
            invitedByProfilePicUrl: inviter?.profilePicUrl ?? null,
            createdAt: invite.createdAt,
          };
        }),
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
