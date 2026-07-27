import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { getMatches, getScores } from '@/lib/db/collections';
import { success, notFound, unauthorized, error, forbidden, validationError } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { submitRoundSchema } from '@/lib/schemas/match';
import { ObjectId } from 'mongodb';

/**
 * POST /api/matches/[id]/rounds
 * Submit scores for the next round. Only creator can submit rounds.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    logApiRequest(requestId, `POST /api/matches/${params.id}/rounds`, userId, {
      matchId: params.id,
      scoreCount: body.scores?.length || 0,
    });

    // Validate ObjectId format
    if (!ObjectId.isValid(params.id)) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    // Validate request body
    const parsed = submitRoundSchema.safeParse(body);
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

    // Only creator can submit rounds
    if (match.creatorId !== userId) {
      logApiResponse(requestId, 403, Date.now() - startTime);
      return forbidden();
    }

    // Verify all players in scores exist in roster and are active
    const activePlayerIds = match.roster
      .filter((r) => r.status === 'active')
      .map((r) => r.userId);

    const submittedPlayerIds = new Set(parsed.data.scores.map((s) => s.playerId));

    // Check that all active players have scores
    for (const playerId of activePlayerIds) {
      if (!submittedPlayerIds.has(playerId)) {
        logApiResponse(requestId, 400, Date.now() - startTime);
        return error('Missing scores for active players', 'INCOMPLETE_SCORES', 400);
      }
    }

    // Check that no extra players are included
    for (const playerId of submittedPlayerIds) {
      if (!activePlayerIds.includes(playerId)) {
        logApiResponse(requestId, 400, Date.now() - startTime);
        return error('Scores for non-active players', 'INVALID_PLAYERS', 400);
      }
    }

    // Get next round number
    const nextRound = match.roundsPlayed + 1;
    const scoresCol = await getScores();

    // Insert score documents
    const scoreDocuments = parsed.data.scores.map((score) => ({
      matchId: params.id,
      round: nextRound,
      playerId: score.playerId,
      value: score.value,
      enteredBy: userId,
      enteredAt: new Date(),
      editHistory: [],
    }));

    await scoresCol.insertMany(scoreDocuments);

    // Update match with new round count and version
    await matchesCol.updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          roundsPlayed: nextRound,
          version: match.version + 1,
        },
      }
    );

    logApiResponse(requestId, 201, Date.now() - startTime);

    return success(
      {
        matchId: params.id,
        round: nextRound,
        scoreCount: scoreDocuments.length,
        version: match.version + 1,
      },
      201
    );
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

/**
 * GET /api/matches/[id]/rounds
 * Fetch all rounds for a match (for viewing round history)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    logApiRequest(requestId, `GET /api/matches/${params.id}/rounds`, userId, {
      matchId: params.id,
    });

    // Validate ObjectId format
    if (!ObjectId.isValid(params.id)) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
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

    // Check if user is creator or in roster
    const isCreator = match.creatorId === userId;
    const isInRoster = match.roster.some((r) => r.userId === userId);

    if (!isCreator && !isInRoster) {
      logApiResponse(requestId, 403, Date.now() - startTime);
      return forbidden();
    }

    // Fetch scores grouped by round
    const scoresCol = await getScores();
    const scores = await scoresCol
      .find({ matchId: params.id })
      .sort({ round: 1, playerId: 1 })
      .toArray();

    // Group by round
    const roundsByNumber = new Map<number, any[]>();
    scores.forEach((score) => {
      if (!roundsByNumber.has(score.round)) {
        roundsByNumber.set(score.round, []);
      }
      roundsByNumber.get(score.round)!.push(score);
    });

    const rounds = Array.from(roundsByNumber.entries()).map(([roundNum, roundScores]) => ({
      round: roundNum,
      scores: roundScores.map((s) => ({
        playerId: s.playerId,
        value: s.value,
        enteredBy: s.enteredBy,
        enteredAt: s.enteredAt,
      })),
    }));

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({
      matchId: params.id,
      rounds,
      totalRounds: match.roundsPlayed,
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
