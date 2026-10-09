import { NextRequest } from 'next/server';
import { getUsers, getPlayerStats, PlayerStats } from '@/lib/db/collections';
import { success, notFound, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';
import { emptyPlayerStreaks, ZERO_PLAYER_STATS } from '@/lib/domain/playerStats';
import { dayKey, liveDayStreak } from '@/lib/domain/streaks';
import { strictlyAheadFilter } from '@/lib/stats/leaderboard';
import type { PlayerStatsSummary, PlayerStreaksSummary } from '@/types';

export const dynamic = 'force-dynamic';

function toStreaksSummary(doc: PlayerStats | null, now: Date): PlayerStreaksSummary {
  const streaks = doc?.streaks ?? emptyPlayerStreaks();
  return {
    longestGameStreak: streaks.longestGameStreak,
    currentGameStreak: streaks.currentGameStreak,
    gameStreakCounts: { ...streaks.gameStreakCounts },
    longestMatchStreak: streaks.longestMatchStreak,
    currentMatchStreak: streaks.currentMatchStreak,
    longestDayStreak: streaks.longestDayStreak,
    currentDayStreak: liveDayStreak(streaks.currentDayStreak, streaks.lastActiveDay, dayKey(now)),
  };
}

function toMilestonesSummary(doc: PlayerStats | null): PlayerStatsSummary['milestones'] {
  return (doc?.milestones ?? []).map((m) => ({
    id: m.id,
    achievedAt: new Date(m.achievedAt).toISOString(),
  }));
}

function toSummary(doc: PlayerStats | null, globalRank: number | null): PlayerStatsSummary {
  const source = doc ?? ZERO_PLAYER_STATS;
  return {
    rating: source.rating,
    peakRating: source.peakRating,
    ratedMatches: source.ratedMatches,
    matchesPlayed: source.matchesPlayed,
    matchWins: source.matchWins,
    podiums: { ...source.podiums },
    gamesWon: source.gamesWon,
    gamesPlayed: source.gamesPlayed,
    winPct: source.winPct,
    averageRank: source.averageRank,
    globalRank,
    streaks: toStreaksSummary(doc, new Date()),
    milestones: toMilestonesSummary(doc),
  };
}

async function globalRankOf(doc: PlayerStats | null): Promise<number | null> {
  if (!doc || doc.gamesPlayed <= 0) return null;
  const playerStatsCol = await getPlayerStats();
  const rankedAhead = await playerStatsCol.countDocuments({
    gamesPlayed: { $gt: 0 },
    ...strictlyAheadFilter('rating', doc),
  });
  return rankedAhead + 1;
}

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
    const user = await usersCol.findOne(
      { username: params.username },
      { projection: { profilePicUrl: 1 } }
    );

    if (!user) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    const playerStatsCol = await getPlayerStats();
    const statsDoc = await playerStatsCol.findOne({ userId: user._id!.toString() });
    const summary = toSummary(statsDoc, await globalRankOf(statsDoc));

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({
      stats: {
        ...summary,
        wins: summary.matchWins,
        totalMatches: summary.matchesPlayed,
        totalRounds: summary.gamesPlayed,
      },
      profilePicUrl: user.profilePicUrl ?? null,
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
