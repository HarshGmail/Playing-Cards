import { NextRequest } from 'next/server';
import { getUsers } from '@/lib/db/collections';
import { success, notFound, error, validationError } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';
import { loadRatingHistory } from '@/lib/stats/ratingHistory';
import { ratingGameKeySchema } from '@/lib/stats/ratingGames';

export const dynamic = 'force-dynamic';

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

    logApiRequest(requestId, `GET /api/users/${params.username}/rating-history`, viewerId, {
      username: params.username,
    });

    const game = ratingGameKeySchema.safeParse(
      request.nextUrl.searchParams.get('game') ?? undefined
    );
    if (!game.success) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return validationError('game must be a lowercase slug');
    }

    const usersCol = await getUsers();
    const user = await usersCol.findOne({ username: params.username }, { projection: { _id: 1 } });

    if (!user) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    const history = await loadRatingHistory(user._id!.toString(), game.data);

    logApiResponse(requestId, 200, Date.now() - startTime);
    return success({ history });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
