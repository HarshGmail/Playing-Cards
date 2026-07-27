import { NextRequest } from 'next/server';
import { getMatches, getUsers, Match } from '@/lib/db/collections';
import { createMatchSchema } from '@/lib/schemas/match';
import { success, validationError, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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
    logApiRequest(requestId, 'POST /api/matches', userId, {
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
    const playerIds = [userId, ...data.players];
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
      creatorId: userId,
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
  const requestId = crypto.randomUUID?.() || Date.now().toString();
  const startTime = Date.now();

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return authResult;
    }

    const { userId } = authResult;

    logApiRequest(requestId, 'GET /api/matches', userId, {});

    const matchesCol = await getMatches();
    const matches = await matchesCol
      .find({
        $or: [
          { creatorId: userId },
          { 'roster.userId': userId },
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
