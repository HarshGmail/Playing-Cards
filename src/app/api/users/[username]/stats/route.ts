import { NextRequest } from 'next/server';
import { getUsers, getMatches, getScores } from '@/lib/db/collections';
import { success, notFound, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';
import { computeMatchLeaderboard } from '@/lib/domain/ranking';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users/[username]/stats
 * Aggregate match stats (wins, matches played, average rank, times leading)
 * across every match the user has played at least one round in.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  const requestId = crypto.randomUUID?.() || Date.now().toString();
  const startTime = Date.now();

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return authResult;
    }
    const { userId: viewerId } = authResult;

    logApiRequest(requestId, `GET /api/users/${params.username}/stats`, viewerId, {
      username: params.username,
    });

    const usersCol = await getUsers();
    const user = await usersCol.findOne({ username: params.username });

    if (!user) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    const targetUserId = user._id!.toString();

    const matchesCol = await getMatches();
    const matches = await matchesCol
      .find({ 'roster.userId': targetUserId, deletedAt: null, roundsPlayed: { $gte: 1 } })
      .toArray();

    const scoresCol = await getScores();

    let wins = 0;
    let timesLeading = 0;
    const ranks: number[] = [];

    for (const match of matches) {
      const scores = await scoresCol.find({ matchId: match._id!.toString() }).toArray();
      const leaderboard = computeMatchLeaderboard(
        match.roster,
        scores,
        match.rankPreference,
        match.tiebreakers
      );

      const entry = leaderboard.find((e) => e.playerId === targetUserId);
      if (!entry || entry.isDnf) continue;

      ranks.push(entry.position);
      if (entry.position === 1) {
        timesLeading += 1;
        if (match.status === 'ended') wins += 1;
      }
    }

    const averageRank = ranks.length > 0 ? ranks.reduce((a, b) => a + b, 0) / ranks.length : 0;

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({
      stats: {
        wins,
        totalMatches: matches.length,
        averageRank,
        timesLeading,
      },
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
