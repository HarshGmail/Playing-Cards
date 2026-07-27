import { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth/jwt';
import { getMatches, getScores } from '@/lib/db/collections';
import { success, notFound, unauthorized, error, forbidden } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { crypto } from 'next/dist/compiled/@edge-runtime/primitives';
import { ObjectId } from 'mongodb';

/**
 * GET /api/matches/[id]/state?v=<version>
 * Returns match state with leaderboard and version for polling.
 * The `v` parameter indicates the client's current version for efficient polling.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const clientVersion = request.nextUrl.searchParams.get('v');
    logApiRequest(requestId, `GET /api/matches/${params.id}/state`, payload.userId, {
      matchId: params.id,
      clientVersion,
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
    const isCreator = match.creatorId === payload.userId;
    const isInRoster = match.roster.some((r) => r.userId === payload.userId);

    if (!isCreator && !isInRoster) {
      logApiResponse(requestId, 403, Date.now() - startTime);
      return forbidden();
    }

    // If client version matches, return 204 No Content for efficient polling
    if (clientVersion && parseInt(clientVersion, 10) === match.version) {
      logApiResponse(requestId, 204, Date.now() - startTime);
      return new Response(null, { status: 204 });
    }

    // Fetch all scores for this match
    const scoresCol = await getScores();
    const scores = await scoresCol
      .find({ matchId: params.id })
      .sort({ round: 1 })
      .toArray();

    // Calculate leaderboard
    const leaderboard = calculateLeaderboard(match, scores);

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({
      state: {
        matchId: match._id?.toString(),
        version: match.version,
        roundsPlayed: match.roundsPlayed,
        status: match.status,
        leaderboard,
        roster: match.roster.map((r) => ({
          userId: r.userId,
          userName: r.userName,
          status: r.status,
          joinedAtRound: r.joinedAtRound,
          dnfAfterRound: r.dnfAfterRound,
        })),
      },
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

interface LeaderboardEntry {
  userId: string;
  userName: string;
  totalScore: number;
  roundScores: number[];
  rank: number;
  status: 'active' | 'dnf';
}

function calculateLeaderboard(match: any, scores: any[]): LeaderboardEntry[] {
  // Group scores by userId
  const playerScores = new Map<string, number[]>();

  // Initialize all active players
  match.roster.forEach((r: any) => {
    if (r.status === 'active') {
      playerScores.set(r.userId, []);
    }
  });

  // Accumulate scores by round
  scores.forEach((score: any) => {
    if (!playerScores.has(score.playerId)) {
      playerScores.set(score.playerId, []);
    }
    const roundScores = playerScores.get(score.playerId)!;
    // Ensure array has enough space for this round
    while (roundScores.length < score.round) {
      roundScores.push(0);
    }
    roundScores[score.round - 1] = score.value;
  });

  // Calculate totals and create entries
  const entries: LeaderboardEntry[] = Array.from(playerScores.entries()).map(
    ([userId, roundScores]) => {
      const rosterEntry = match.roster.find((r: any) => r.userId === userId);
      const totalScore = roundScores.reduce((sum: number, v: number) => sum + v, 0);

      return {
        userId,
        userName: rosterEntry?.userName || 'Unknown',
        totalScore,
        roundScores,
        rank: 0, // Will be set after sorting
        status: rosterEntry?.status || 'active',
      };
    }
  );

  // Sort by total score based on rank preference
  const isLowestFirst = match.rankPreference === 'lowest-first';
  entries.sort((a, b) => {
    if (isLowestFirst) {
      return a.totalScore - b.totalScore;
    } else {
      return b.totalScore - a.totalScore;
    }
  });

  // Assign ranks
  entries.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  return entries;
}
