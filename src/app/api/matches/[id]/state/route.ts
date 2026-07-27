import { NextRequest } from 'next/server';
import { getMatches, getScores } from '@/lib/db/collections';
import { success, notFound, error, forbidden } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';
import { ObjectId } from 'mongodb';
import { buildAggregates, computeLeaderboard, LeaderboardEntry as DomainLeaderboardEntry } from '@/lib/domain/ranking';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const clientVersion = request.nextUrl.searchParams.get('v');
    logApiRequest(requestId, `GET /api/matches/${params.id}/state`, userId, {
      matchId: params.id,
      clientVersion,
    });

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

    const isCreator = match.creatorId === userId;
    const isInRoster = match.roster.some((r) => r.userId === userId);

    if (!isCreator && !isInRoster) {
      logApiResponse(requestId, 403, Date.now() - startTime);
      return forbidden();
    }

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

function calculateLeaderboard(match: any, scores: any[]): DomainLeaderboardEntry[] {
  // Group scores by playerId, in round order. Rounds before a player joined
  // never have a score doc (they weren't in the roster yet), and rounds
  // after a DNF are excluded so their total/average freeze at the DNF point
  // — both fall out naturally from only including rounds that actually
  // exist for that player, no zero-padding needed.
  const scoresByPlayer = new Map<string, { scores: number[]; isDnf: boolean }>();

  match.roster.forEach((r: any) => {
    scoresByPlayer.set(r.userId, { scores: [], isDnf: r.status === 'dnf' });
  });

  const sortedScores = [...scores].sort((a, b) => a.round - b.round);
  for (const score of sortedScores) {
    const entry = scoresByPlayer.get(score.playerId);
    if (!entry) continue;
    const rosterEntry = match.roster.find((r: any) => r.userId === score.playerId);
    if (rosterEntry?.dnfAfterRound != null && score.round > rosterEntry.dnfAfterRound) {
      continue;
    }
    entry.scores.push(score.value);
  }

  const aggregates = buildAggregates(scoresByPlayer);
  const leaderboard = computeLeaderboard(aggregates, match.rankPreference, match.tiebreakers);

  return leaderboard.map((entry) => ({
    ...entry,
    name: match.roster.find((r: any) => r.userId === entry.playerId)?.userName || 'Unknown',
  }));
}
