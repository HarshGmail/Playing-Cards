import { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth/jwt';
import { getMatches, getUsers, Match } from '@/lib/db/collections';
import { createMatchSchema } from '@/lib/schemas/match';
import { success, validationError, error, unauthorized } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { crypto } from 'next/dist/compiled/@edge-runtime/primitives';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
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
    logApiRequest(requestId, 'POST /api/matches', payload.userId, {
      name: body.name,
    });

    const parsed = createMatchSchema.safeParse(body);
    if (!parsed.success) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return validationError(parsed.error.issues[0]?.message || 'Invalid input');
    }

    const data = parsed.data;
    const matchesCol = await getMatches();
    const usersCol = await getUsers();

    // Get all players including creator
    const playerIds = [payload.userId, ...data.players];
    const players = await usersCol
      .find({ _id: { $in: playerIds.map((id) => new ObjectId(id)) } })
      .toArray();

    if (players.length !== playerIds.length) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return error('Some players not found', 'INVALID_PLAYERS', 400);
    }

    // Create roster entries
    const roster = playerIds.map((playerId, idx) => {
      const player = players.find((p) => p._id?.toString() === playerId);
      return {
        userId: playerId,
        userName: player?.name || '',
        joinedAtRound: 1,
        status: 'active' as const,
        dnfAfterRound: null,
        order: idx,
      };
    });

    // Create match
    const matchDoc: Match = {
      name: data.name,
      nameLower: data.name.toLowerCase(),
      creatorId: payload.userId,
      creatorRole: data.creatorRole,
      rankPreference: data.rankPreference,
      status: 'active',
      deletedAt: null,
      tiebreakers: data.tiebreakers,
      roster,
      roundsPlayed: 0,
      version: 1,
      createdAt: new Date(),
      endedAt: null,
    };

    const result = await matchesCol.insertOne(matchDoc);

    logApiResponse(requestId, 201, Date.now() - startTime);

    return success(
      {
        id: result.insertedId.toString(),
        name: matchDoc.name,
        creatorId: matchDoc.creatorId,
        status: matchDoc.status,
      },
      201
    );
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function GET(request: NextRequest) {
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

    logApiRequest(requestId, 'GET /api/matches', payload.userId, {});

    const matchesCol = await getMatches();
    const matches = await matchesCol
      .find({
        $or: [
          { creatorId: payload.userId },
          { 'roster.userId': payload.userId },
        ],
        deletedAt: null,
      })
      .sort({ createdAt: -1 })
      .toArray();

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({
      matches: matches.map((m) => ({
        id: m._id?.toString(),
        name: m.name,
        creatorId: m.creatorId,
        status: m.status,
        roundsPlayed: m.roundsPlayed,
        roster: m.roster,
        version: m.version,
      })),
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
