import { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth/jwt';
import { getMatches, getShareLinks } from '@/lib/db/collections';
import { success, notFound, unauthorized, error, conflict } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { crypto } from 'next/dist/compiled/@edge-runtime/primitives';

/**
 * GET /api/join/[code]
 * Redeem a share code to join a match.
 * Returns match details and join status.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
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

    const code = params.code.toUpperCase();

    logApiRequest(requestId, `GET /api/join/${code}`, payload.userId, {
      code,
    });

    const shareLinksCol = await getShareLinks();
    const shareLink = await shareLinksCol.findOne({
      code,
      revokedAt: null,
    });

    if (!shareLink) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    // Check if expired
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

    // Check if user already in match
    const alreadyInMatch = match.roster.some((r) => r.userId === payload.userId);

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
      code,
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

/**
 * POST /api/join/[code]
 * Actually join a match using a share code.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
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

    const code = params.code.toUpperCase();

    logApiRequest(requestId, `POST /api/join/${code}`, payload.userId, {
      code,
    });

    const shareLinksCol = await getShareLinks();
    const shareLink = await shareLinksCol.findOne({
      code,
      revokedAt: null,
    });

    if (!shareLink) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    // Check if expired
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

    // Check if user already in match
    const alreadyInMatch = match.roster.some((r) => r.userId === payload.userId);

    if (alreadyInMatch) {
      logApiResponse(requestId, 409, Date.now() - startTime);
      return conflict('You are already in this match');
    }

    // Get user details
    const { getUsers } = await import('@/lib/db/collections');
    const usersCol = await getUsers();
    const { ObjectId } = await import('mongodb');
    const user = await usersCol.findOne({ _id: new ObjectId(payload.userId) });

    if (!user) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return error('User not found', 'USER_NOT_FOUND', 404);
    }

    // Add user to roster
    const newRosterEntry = {
      userId: payload.userId,
      userName: user.name,
      joinedAtRound: match.roundsPlayed + 1,
      status: 'active' as const,
      dnfAfterRound: null,
      order: match.roster.length,
    };

    await matchesCol.updateOne(
      { _id: shareLink.matchId },
      {
        $push: {
          roster: newRosterEntry,
        },
        $set: {
          version: match.version + 1,
        },
      }
    );

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({
      matchId: match._id?.toString(),
      userId: payload.userId,
      userName: user.name,
      joined: true,
      joinedAtRound: match.roundsPlayed + 1,
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
