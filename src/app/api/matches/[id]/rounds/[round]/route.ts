import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { getMatches, getScores } from '@/lib/db/collections';
import { success, notFound, unauthorized, error, forbidden, validationError } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { updateRoundSchema } from '@/lib/schemas/match';
import { notifyRoundScored } from '@/lib/notifications/roundScored';
import { withTransaction } from '@/lib/db/client';
import { ObjectId } from 'mongodb';
import { onRoundsChanged } from '@/lib/events/matchEvents';

export const dynamic = 'force-dynamic';

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

    const { scores: scoreUpdates, dnfPlayerIds } = parsed.data;
    const droppedOutAtThisRound = match.roster
      .filter((r) => r.status === 'dnf' && r.dnfAfterRound === roundNum - 1)
      .map((r) => r.userId);
    const roundPlayerIds = new Set([...existingByPlayerId.keys(), ...droppedOutAtThisRound]);
    const scoredPlayerIds = scoreUpdates.map((s) => s.playerId);
    const submittedPlayerIds = [...scoredPlayerIds, ...dnfPlayerIds];

    const coversEveryRoundPlayer =
      submittedPlayerIds.length === roundPlayerIds.size &&
      new Set(submittedPlayerIds).size === roundPlayerIds.size &&
      submittedPlayerIds.every((id) => roundPlayerIds.has(id));

    if (!coversEveryRoundPlayer) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return error(
        'Each player in this round needs either a score or DNF',
        'INCOMPLETE_SCORES',
        400
      );
    }

    const rejoiningPlayerIds = scoredPlayerIds.filter((id) => !existingByPlayerId.has(id));
    const newlyDnfPlayerIds = dnfPlayerIds.filter((id) => existingByPlayerId.has(id));

    if (rejoiningPlayerIds.length > 0 && roundNum !== match.roundsPlayed) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return error(
        'A DNF can only be undone on the latest round',
        'DNF_UNDO_NOT_LATEST',
        400
      );
    }

    // Update each score with edit history, and bump version, atomically
    await withTransaction(async (session) => {
      for (const playerId of newlyDnfPlayerIds) {
        await scoresCol.deleteMany(
          { matchId: params.id, playerId, round: { $gte: roundNum } },
          { session }
        );
        await matchesCol.updateOne(
          { _id: new ObjectId(params.id), 'roster.userId': playerId },
          {
            $set: {
              'roster.$.status': 'dnf',
              'roster.$.dnfAfterRound': roundNum - 1,
            },
          },
          { session }
        );
      }

      for (const playerId of rejoiningPlayerIds) {
        await matchesCol.updateOne(
          { _id: new ObjectId(params.id), 'roster.userId': playerId },
          {
            $set: {
              'roster.$.status': 'active',
              'roster.$.dnfAfterRound': null,
            },
          },
          { session }
        );
      }

      for (const scoreUpdate of scoreUpdates) {
        const existing = existingByPlayerId.get(scoreUpdate.playerId);

        if (!existing) {
          await scoresCol.insertOne(
            {
              matchId: params.id,
              round: roundNum,
              playerId: scoreUpdate.playerId,
              value: scoreUpdate.value,
              enteredBy: userId,
              enteredAt: new Date(),
              editHistory: [],
            },
            { session }
          );
        } else {
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
            },
            { session }
          );
        }
      }

      await matchesCol.updateOne(
        { _id: new ObjectId(params.id) },
        { $inc: { version: 1 } },
        { session }
      );
    });

    await notifyRoundScored({
      match,
      round: roundNum,
      scores: parsed.data.scores,
      scoredBy: userId,
      edited: true,
    }).catch((err) => logError(requestId, err));

    await onRoundsChanged(params.id).catch((err) => logError(requestId, err));

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
