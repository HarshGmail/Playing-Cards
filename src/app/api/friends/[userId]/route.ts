import { NextRequest } from 'next/server';
import { getFriendships } from '@/lib/db/collections';
import { success, notFound, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
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
    logApiRequest(requestId, `DELETE /api/friends/${params.userId}`, userId, {
      friendUserId: params.userId,
    });

    if (params.userId === userId) {
      return error('Cannot remove yourself', 'SELF_REMOVE', 400);
    }

    const friendshipsCol = await getFriendships();
    const friendship = await friendshipsCol.findOne({
      $or: [
        { userA: userId, userB: params.userId },
        { userA: params.userId, userB: userId },
      ],
    });

    if (!friendship) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    const result = await friendshipsCol.deleteOne({ _id: friendship._id });

    if (result.deletedCount === 0) {
      logApiResponse(requestId, 500, Date.now() - startTime);
      return error('Failed to remove friend', 'DELETE_FAILED', 500);
    }

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({
      friendUserId: params.userId,
      removed: true,
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
