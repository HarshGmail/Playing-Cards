import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/api/auth';
import { success, validationError, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { ALL_GAMES_KEY, RATING_GAME_KEY_PATTERN } from '@/lib/games/catalog';
import { fastestRecords, reachedBy } from '@/lib/domain/fastestRecords';
import { loadIdentities, UNKNOWN_IDENTITY, type PlayerIdentity } from '@/lib/stats/identities';
import { viewerAndFriendIds } from '@/lib/stats/friends';
import { loadRecordBook, toRecordHolder, type RecordTrack } from '@/lib/stats/fastestRecords';
import { loadRatedGames } from '@/lib/stats/ratingGames';
import type { FastestRecordView, RecordKind, RecordProgressView } from '@/types';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  game: z
    .string()
    .refine((key) => key === ALL_GAMES_KEY || RATING_GAME_KEY_PATTERN.test(key))
    .default(ALL_GAMES_KEY),
  scope: z.enum(['friends', 'global']).default('friends'),
});

function recordsFor(kind: RecordKind, track: RecordTrack, memberIds: Set<string> | null) {
  return fastestRecords(kind, memberIds ? reachedBy(track.reached, memberIds) : track.reached);
}

function toViews(
  kind: RecordKind,
  track: RecordTrack,
  records: ReturnType<typeof fastestRecords>,
  identities: Map<string, PlayerIdentity>,
  viewerId: string
): FastestRecordView[] {
  const viewerReached = track.reached.get(viewerId);
  return records.map((record) => {
    const viewerAchievement = viewerReached?.get(record.threshold);
    return {
      kind,
      threshold: record.threshold,
      holder: toRecordHolder(record.holder, identities.get(record.holder.playerId) ?? UNKNOWN_IDENTITY),
      viewer: viewerAchievement ? { count: viewerAchievement.count, at: viewerAchievement.at } : null,
    };
  });
}

function progressFor(track: RecordTrack, viewerId: string): RecordProgressView | null {
  const progress = track.progress.get(viewerId);
  return progress ? { wins: progress.wins, played: progress.played } : null;
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

    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    logApiRequest(requestId, 'GET /api/records', userId, searchParams);

    const parsed = querySchema.safeParse(searchParams);
    if (!parsed.success) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return validationError(`game must be a lowercase slug or ${ALL_GAMES_KEY}; scope friends|global`);
    }
    const { game, scope } = parsed.data;

    const [book, games, memberIds] = await Promise.all([
      loadRecordBook(game),
      loadRatedGames(),
      scope === 'friends' ? viewerAndFriendIds(userId).then((ids) => new Set(ids)) : Promise.resolve(null),
    ]);
    const matchWinRecords = recordsFor('matchWins', book.matchWins, memberIds);
    const gameWinRecords = recordsFor('gameWins', book.gameWins, memberIds);
    const identities = await loadIdentities(
      [...matchWinRecords, ...gameWinRecords].map((record) => record.holder.playerId)
    );

    logApiResponse(requestId, 200, Date.now() - startTime);
    return success({
      matchWins: toViews('matchWins', book.matchWins, matchWinRecords, identities, userId),
      gameWins: toViews('gameWins', book.gameWins, gameWinRecords, identities, userId),
      viewerProgress: {
        matchWins: progressFor(book.matchWins, userId),
        gameWins: progressFor(book.gameWins, userId),
      },
      games,
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
