import { NextRequest } from 'next/server';
import { getMatches, getUsers, Match } from '@/lib/db/collections';
import { createMatchSchema } from '@/lib/schemas/match';
import { success, validationError, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';
import { invitePlayersToMatch } from '@/lib/domain/matchInvites';
import { notifyUsers } from '@/lib/notifications/create';
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
      const issue = parsed.error.issues[0];
      const field = issue?.path.join('.');
      return validationError(
        issue ? `${field ? `${field}: ` : ''}${issue.message}` : 'Invalid input'
      );
    }

    const data = parsed.data;
    const matchesCol = await getMatches();
    const usersCol = await getUsers();

    // Invited players are validated here but not rostered: they join only once
    // they accept. See invitePlayersToMatch for why.
    const invitedIds = Array.from(new Set(data.players)).filter((id) => id !== userId);
    const playerIds = [userId, ...invitedIds];

    if (playerIds.some((id) => !ObjectId.isValid(id))) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return error('Some players not found', 'INVALID_PLAYERS', 400);
    }

    const players = await usersCol
      .find({ _id: { $in: playerIds.map((id) => new ObjectId(id)) } })
      .toArray();

    if (players.length !== playerIds.length) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return error('Some players not found', 'INVALID_PLAYERS', 400);
    }

    if (invitedIds.length === 0) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return error('Invite at least one other player', 'INVALID_PLAYERS', 400);
    }

    const creator = players.find((p) => p._id?.toString() === userId);

    // The roster starts as the creator alone. Every invitee is appended by the
    // accept handler, in the order they accept.
    const roster = [
      {
        userId,
        userName: creator?.name || '',
        joinedAtRound: 1,
        status: 'active' as const,
        dnfAfterRound: null,
        order: 0,
      },
    ];

    // Spectators can't also be players — drop any overlap rather than erroring.
    const spectatorIds = data.spectatorIds.filter((id) => !playerIds.includes(id));
    const spectatorUsers = spectatorIds.length
      ? await usersCol.find({ _id: { $in: spectatorIds.map((id) => new ObjectId(id)) } }).toArray()
      : [];

    if (spectatorUsers.length !== spectatorIds.length) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return error('Some spectators not found', 'INVALID_SPECTATORS', 400);
    }

    const spectators = spectatorIds.map((spectatorId) => {
      const spectator = spectatorUsers.find((s) => s._id?.toString() === spectatorId);
      return { userId: spectatorId, userName: spectator?.name || '' };
    });

    // Create match
    const matchDoc: Match = {
      name: data.name,
      nameLower: data.name.toLowerCase(),
      creatorId: userId,
      creatorRole: data.creatorRole,
      rankPreference: data.rankPreference,
      gameType: data.gameType,
      gameLabel: data.gameLabel,
      status: 'active',
      deletedAt: null,
      tiebreakers: data.tiebreakers,
      roster,
      spectators,
      roundsPlayed: 0,
      version: 1,
      createdAt: new Date(),
      endedAt: null,
    };

    const result = await matchesCol.insertOne(matchDoc);
    const matchId = result.insertedId.toString();

    const invited = await invitePlayersToMatch({
      matchId,
      matchName: matchDoc.name,
      invitedBy: userId,
      invitedByName: creator?.name || '',
      userIds: invitedIds,
    });

    // Spectating is read-only and touches nobody's stats, so it needs no accept
    // step — but the invitee should still hear about it.
    await notifyUsers(spectatorIds, 'added-to-match', {
      matchId,
      matchName: matchDoc.name,
      role: 'spectator',
      invitedByName: creator?.name || '',
    }).catch((err) => logError(requestId, err));

    logApiResponse(requestId, 201, Date.now() - startTime);

    return success(
      {
        id: matchId,
        name: matchDoc.name,
        creatorId: matchDoc.creatorId,
        status: matchDoc.status,
        invitedCount: invited.length,
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
