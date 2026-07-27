import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { getMatches, getScores } from '@/lib/db/collections';
import { success, notFound, unauthorized, error, forbidden, validationError } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { updateRoundSchema } from '@/lib/schemas/match';
import { ObjectId } from 'mongodb';

/**
 * PUT /api/matches/[id]/rounds/[round]
 * Edit scores for a specific round. Only creator can edit rounds.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; round: string } }
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
    const roundNum = parseInt(params.round, 10);

    logApiRequest(requestId, `PUT /api/matches/${params.id}/rounds/${roundNum}`, userId, {
      matchId: params.id,
      round: roundNum,
      scoreCount: body.scores?.length || 0,
    });

    // Validate ObjectId format
    if (!ObjectId.isValid(params.id)) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    // Validate round number
    if (isNaN(roundNum) || roundNum < 1) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return validationError('Invalid round number');
    }

    // Validate request body
    const parsed = updateRoundSchema.safeParse(body);
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

    // Only creator can edit rounds
    if (match.creatorId !== userId) {
      logApiResponse(requestId, 403, Date.now() - startTime);
      return forbidden();
    }

    // Check that round exists
    if (roundNum > match.roundsPlayed) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return error('Round does not exist', 'ROUND_NOT_FOUND', 404);
    }

    // Verify all active players have scores and no extra players
    const activePlayerIds = match.roster
      .filter((r) => r.status === 'active')
      .map((r) => r.userId);

    const submittedPlayerIds = new Set(parsed.data.scores.map((s) => s.playerId));

    for (const playerId of activePlayerIds) {
      if (!submittedPlayerIds.has(playerId)) {
        logApiResponse(requestId, 400, Date.now() - startTime);
        return error('Missing scores for active players', 'INCOMPLETE_SCORES', 400);
      }
    }

    for (const playerId of submittedPlayerIds) {
      if (!activePlayerIds.includes(playerId)) {
        logApiResponse(requestId, 400, Date.now() - startTime);
        return error('Scores for non-active players', 'INVALID_PLAYERS', 400);
      }
    }

    // Update scores for this round
    const scoresCol = await getScores();

    // Get existing scores for this round to maintain edit history
    const existingScores = await scoresCol
      .find({
        matchId: params.id,
        round: roundNum,
      })
      .toArray();

    const existingByPlayerId = new Map(
      existingScores.map((s) => [s.playerId, s])
    );

    // Update each score with edit history
    for (const scoreUpdate of parsed.data.scores) {
      const existing = existingByPlayerId.get(scoreUpdate.playerId);

      if (existing) {
        const editEntry = {
          from: existing.value,
          to: scoreUpdate.value,
          at: new Date(),
          by: userId,
        };

        await scoresCol.updateOne(
          { _id: existing._id },
          {
            $set: {
              value: scoreUpdate.value,
              enteredAt: new Date(),
            },
            $push: {
              editHistory: editEntry,
            },
          }
        );
      }
    }

    // Increment version
    await matchesCol.updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          version: match.version + 1,
        },
      }
    );

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({
      matchId: params.id,
      round: roundNum,
      scoreCount: parsed.data.scores.length,
      version: match.version + 1,
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
