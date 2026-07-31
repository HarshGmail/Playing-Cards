import { NextRequest } from 'next/server';
import { getMatches, getShareLinks, getUsers } from '@/lib/db/collections';
import { success, notFound, error, conflict } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
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
    const code = params.code.toUpperCase();

    logApiRequest(requestId, `GET /api/join/${code}`, userId, { code });

    const shareLinksCol = await getShareLinks();
    const shareLink = await shareLinksCol.findOne({
      code,
      revokedAt: null,
    });

    if (!shareLink) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    if (new Date() > shareLink.expiresAt) {
      logApiResponse(requestId, 410, Date.now() - startTime);
      return error('Share code expired', 'CODE_EXPIRED', 410);
    }

    const matchesCol = await getMatches();
    const match = await matchesCol.findOne({
      _id: shareLink.matchId,
      deletedAt: null,
    });

    if (!match) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    const alreadyInMatch =
      match.roster.some((r) => r.userId === userId) ||
      (match.spectators ?? []).some((s) => s.userId === userId);

    if (alreadyInMatch) {
      logApiResponse(requestId, 409, Date.now() - startTime);
      return conflict('You are already in this match');
    }

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({
      match: {
        id: match._id?.toString(),
        name: match.name,
        creatorId: match.creatorId,
        roundsPlayed: match.roundsPlayed,
        playerCount: match.roster.length,
      },
      canJoin: true,
      role: shareLink.role,
      code,
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
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
    const code = params.code.toUpperCase();

    logApiRequest(requestId, `POST /api/join/${code}`, userId, { code });

    const shareLinksCol = await getShareLinks();
    const shareLink = await shareLinksCol.findOne({
      code,
      revokedAt: null,
    });

    if (!shareLink) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    if (new Date() > shareLink.expiresAt) {
      logApiResponse(requestId, 410, Date.now() - startTime);
      return error('Share code expired', 'CODE_EXPIRED', 410);
    }

    const matchesCol = await getMatches();
    const match = await matchesCol.findOne({
      _id: shareLink.matchId,
      deletedAt: null,
    });

    if (!match) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    const alreadyInMatch =
      match.roster.some((r) => r.userId === userId) ||
      (match.spectators ?? []).some((s) => s.userId === userId);

    if (alreadyInMatch) {
      logApiResponse(requestId, 409, Date.now() - startTime);
      return conflict('You are already in this match');
    }

    const usersCol = await getUsers();
    const user = await usersCol.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return error('User not found', 'USER_NOT_FOUND', 404);
    }

    if (shareLink.role === 'spectator') {
      await matchesCol.updateOne(
        { _id: shareLink.matchId },
        {
          $push: { spectators: { userId, userName: user.name } },
          $inc: { version: 1 },
        }
      );

      logApiResponse(requestId, 200, Date.now() - startTime);

      return success({
        matchId: match._id?.toString(),
        userId,
        userName: user.name,
        joined: true,
        role: 'spectator',
      });
    }

    const newRosterEntry = {
      userId,
      userName: user.name,
      joinedAtRound: match.roundsPlayed + 1,
      status: 'active' as const,
      dnfAfterRound: null,
      order: match.roster.length,
    };

    await matchesCol.updateOne(
      { _id: shareLink.matchId },
      {
        $push: { roster: newRosterEntry },
        $inc: { version: 1 },
      }
    );

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({
      matchId: match._id?.toString(),
      userId,
      userName: user.name,
      joined: true,
      role: 'player',
      joinedAtRound: match.roundsPlayed + 1,
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
