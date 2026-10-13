import { NextRequest } from 'next/server';
import { getUsers, getPlayerStats, PlayerStats } from '@/lib/db/collections';
import { success, notFound, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';
import { emptyPlayerStreaks, ZERO_PLAYER_STATS } from '@/lib/domain/playerStats';
import { dayKey, liveDayStreak } from '@/lib/domain/streaks';
import { strictlyAheadFilter } from '@/lib/stats/leaderboard';
import { PRIMARY_RATING_GAME } from '@/lib/games/catalog';
import { countAheadInGame } from '@/lib/stats/ratingGames';
import type { GameRatingSummary, PlayerStatsSummary, PlayerStreaksSummary } from '@/types';

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

type RankedGameRating = GameRatingSummary & { globalRank: number | null };

function primaryGameRating(source: Pick<PlayerStats, 'rating' | 'peakRating' | 'ratedMatches'>): GameRatingSummary {
  return {
    key: PRIMARY_RATING_GAME.key,
    name: PRIMARY_RATING_GAME.name,
    rating: source.rating,
    peakRating: source.peakRating,
    ratedMatches: source.ratedMatches,
  };
}

function otherGameRatings(doc: PlayerStats | null): GameRatingSummary[] {
  return Object.entries(doc?.ratingsByGame ?? {})
    .filter(([key]) => key !== PRIMARY_RATING_GAME.key)
    .map(([key, gameRating]) => ({ key, ...gameRating }))
    .sort((a, b) => b.ratedMatches - a.ratedMatches);
}

async function rankGameRating(
  doc: PlayerStats,
  gameRating: GameRatingSummary
): Promise<RankedGameRating> {
  const ahead = await countAheadInGame(gameRating.key, {
    ...doc,
    rating: gameRating.rating,
  });
  return { ...gameRating, globalRank: ahead + 1 };
}

async function rankedGameRatings(doc: PlayerStats | null, primaryRank: number | null) {
  const primary: RankedGameRating = {
    ...primaryGameRating(doc ?? ZERO_PLAYER_STATS),
    globalRank: primaryRank,
  };
  if (!doc) return [primary];
  const others = await Promise.all(otherGameRatings(doc).map((g) => rankGameRating(doc, g)));
  return [primary, ...others];
}

function toSummary(
  doc: PlayerStats | null,
  globalRank: number | null,
  ratingsByGame: RankedGameRating[]
): PlayerStatsSummary {
  const source = doc ?? ZERO_PLAYER_STATS;
  return {
    rating: source.rating,
    peakRating: source.peakRating,
    ratedMatches: source.ratedMatches,
    ratingsByGame,
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
    const globalRank = await globalRankOf(statsDoc);
    const summary = toSummary(
      statsDoc,
      globalRank,
      await rankedGameRatings(statsDoc, globalRank)
    );

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
