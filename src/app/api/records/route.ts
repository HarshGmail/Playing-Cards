import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/api/auth';
import { success, validationError, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { ALL_GAMES_KEY, RATING_GAME_KEY_PATTERN } from '@/lib/games/catalog';
import { loadIdentities, UNKNOWN_IDENTITY } from '@/lib/stats/identities';
import { loadRecordBook, recordHolderIds, toRecordHolder, type RecordTrack } from '@/lib/stats/fastestRecords';
import { loadRatedGames } from '@/lib/stats/ratingGames';
import type { FastestRecordView, RecordKind } from '@/types';
import type { PlayerIdentity } from '@/lib/stats/identities';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  game: z
    .string()
    .refine((key) => key === ALL_GAMES_KEY || RATING_GAME_KEY_PATTERN.test(key))
    .default(ALL_GAMES_KEY),
});

function toViews(
  kind: RecordKind,
  track: RecordTrack,
  identities: Map<string, PlayerIdentity>,
  viewerId: string
): FastestRecordView[] {
  const viewerReached = track.reached.get(viewerId);
  return track.records.map((record) => {
    const viewerAchievement = viewerReached?.get(record.threshold);
    return {
      kind,
      threshold: record.threshold,
      holder: toRecordHolder(record.holder, identities.get(record.holder.playerId) ?? UNKNOWN_IDENTITY),
      viewer: viewerAchievement ? { count: viewerAchievement.count, at: viewerAchievement.at } : null,
    };
  });
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
      return validationError(`game must be a lowercase slug or ${ALL_GAMES_KEY}`);
    }

    const [book, games] = await Promise.all([loadRecordBook(parsed.data.game), loadRatedGames()]);
    const identities = await loadIdentities(recordHolderIds(book));

    logApiResponse(requestId, 200, Date.now() - startTime);
    return success({
      matchWins: toViews('matchWins', book.matchWins, identities, userId),
      gameWins: toViews('gameWins', book.gameWins, identities, userId),
      games,
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
