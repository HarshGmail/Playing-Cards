import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAuth } from '@/lib/api/auth';
import { getMatches } from '@/lib/db/collections';
import { success, notFound, error, forbidden, validationError } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { updateMatchSettingsSchema } from '@/lib/schemas/match';
import { onRoundsChanged } from '@/lib/events/matchEvents';
import { toGameType } from '@/lib/games/catalog';

export const dynamic = 'force-dynamic';

const AVERAGE_TIEBREAKER_FOR = {
  'highest-first': 'higher-average',
  'lowest-first': 'lower-average',
} as const;

const AVERAGE_TIEBREAKERS = new Set<string>(Object.values(AVERAGE_TIEBREAKER_FOR));

function alignTiebreakers(
  tiebreakers: string[],
  rankPreference: keyof typeof AVERAGE_TIEBREAKER_FOR
): string[] {
  return tiebreakers.map((breaker) =>
    AVERAGE_TIEBREAKERS.has(breaker) ? AVERAGE_TIEBREAKER_FOR[rankPreference] : breaker
  );
}

export async function PATCH(
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

    const body = await request.json().catch(() => ({}));

    logApiRequest(requestId, `PATCH /api/matches/${params.id}/settings`, userId, {
      matchId: params.id,
    });

    if (!ObjectId.isValid(params.id)) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    const parsed = updateMatchSettingsSchema.safeParse(body);
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

    if (match.creatorId !== userId) {
      logApiResponse(requestId, 403, Date.now() - startTime);
      return forbidden();
    }

    const settings = parsed.data;
    const rankingChanged = settings.rankPreference !== match.rankPreference;
    const gameChanged =
      settings.gameType !== toGameType(match.gameType) ||
      settings.gameLabel !== (match.gameLabel ?? null);

    await matchesCol.updateOne(
      { _id: match._id },
      {
        $set: {
          name: settings.name,
          nameLower: settings.name.toLowerCase(),
          rankPreference: settings.rankPreference,
          gameType: settings.gameType,
          gameLabel: settings.gameLabel,
          targetRounds: settings.targetRounds,
          tiebreakers: alignTiebreakers(match.tiebreakers, settings.rankPreference),
        },
        $inc: { version: 1 },
      }
    );

    if ((rankingChanged || gameChanged) && match.roundsPlayed > 0) {
      await onRoundsChanged(params.id).catch((err) => logError(requestId, err));
    }

    logApiResponse(requestId, 200, Date.now() - startTime);
    return success({ matchId: params.id, ...settings, version: match.version + 1 });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
