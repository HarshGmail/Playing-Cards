import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { success, notFound, error, forbidden } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { loadViewableMatch } from '@/lib/api/viewableMatch';
import { ratingGameFor } from '@/lib/games/catalog';
import { recordsOnTheLine } from '@/lib/domain/fastestRecords';
import { loadIdentities, UNKNOWN_IDENTITY } from '@/lib/stats/identities';
import { loadRecordBook, toRecordHolder } from '@/lib/stats/fastestRecords';
import type { RecordChanceView } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const requestId = crypto.randomUUID?.() || Date.now().toString();
  const startTime = Date.now();

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return authResult;
    }
    const { userId } = authResult;
    logApiRequest(requestId, `GET /api/matches/${params.id}/records`, userId, { matchId: params.id });

    const result = await loadViewableMatch(params.id, userId);
    if (result.status === 'not-found') {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }
    if (result.status === 'forbidden') {
      logApiResponse(requestId, 403, Date.now() - startTime);
      return forbidden();
    }

    const { match } = result;
    const game = ratingGameFor(match.gameType, match.gameLabel);
    if (match.status !== 'active') {
      logApiResponse(requestId, 200, Date.now() - startTime);
      return success({ gameName: game.name, chances: [] });
    }

    const book = await loadRecordBook(game.key);
    const playerIds = match.roster.filter((entry) => entry.status === 'active').map((entry) => entry.userId);
    const chances = recordsOnTheLine({
      playerIds,
      matchWinRecords: book.matchWins.records,
      gameWinRecords: book.gameWins.records,
      matchWinProgress: book.matchWins.progress,
      gameWinProgress: book.gameWins.progress,
    });
    const identities = await loadIdentities(chances.flatMap((c) => (c.record ? [c.record.playerId] : [])));
    const nameById = new Map(match.roster.map((entry) => [entry.userId, entry.userName]));

    const views: RecordChanceView[] = chances.map((chance) => ({
      kind: chance.kind,
      threshold: chance.threshold,
      playerId: chance.playerId,
      playerName: nameById.get(chance.playerId) ?? 'Unknown',
      winsNeeded: chance.winsNeeded,
      withinGames: chance.withinGames,
      newCount: chance.newCount,
      record: chance.record
        ? toRecordHolder(chance.record, identities.get(chance.record.playerId) ?? UNKNOWN_IDENTITY)
        : null,
    }));

    logApiResponse(requestId, 200, Date.now() - startTime);
    return success({ gameName: game.name, chances: views });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
