import { NextRequest } from 'next/server';
import { ImageResponse } from 'next/og';
import { error, forbidden, notFound } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';
import { loadMatchRecap } from '@/lib/stats/matchRecap';
import MatchRecapImage, { RECAP_WIDTH, recapHeight } from '@/components/match/MatchRecapImage';

export const dynamic = 'force-dynamic';

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

    logApiRequest(requestId, `GET /api/matches/${params.id}/recap`, userId, {
      matchId: params.id,
    });

    const result = await loadMatchRecap(params.id, userId);

    if (result.access === 'not-found') {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }
    if (result.access === 'forbidden') {
      logApiResponse(requestId, 403, Date.now() - startTime);
      return forbidden();
    }
    if (result.access === 'not-ended') {
      logApiResponse(requestId, 409, Date.now() - startTime);
      return error('Recap is available once the match has ended', 'MATCH_NOT_ENDED', 409);
    }

    logApiResponse(requestId, 200, Date.now() - startTime);
    return new ImageResponse(<MatchRecapImage view={result.view} />, {
      width: RECAP_WIDTH,
      height: recapHeight(result.view),
      headers: { 'cache-control': 'private, no-store' },
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
