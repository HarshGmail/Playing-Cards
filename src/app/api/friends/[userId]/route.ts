import { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth/jwt';
import { getFriendships } from '@/lib/db/collections';
import { success, notFound, unauthorized, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { crypto } from 'next/dist/compiled/@edge-runtime/primitives';

/**
 * DELETE /api/friends/[userId]
 * Remove a friend.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    const token = request.cookies.get('auth')?.value;
    if (!token) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return unauthorized();
    }

    const payload = await verifyJwt(token);
    if (!payload?.userId) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return unauthorized();
    }

    logApiRequest(requestId, `DELETE /api/friends/${params.userId}`, payload.userId, {
      friendUserId: params.userId,
    });

    // Prevent self-unfriending
    if (params.userId === payload.userId) {
      return error('Cannot remove yourself', 'SELF_REMOVE', 400);
    }

    const friendshipsCol = await getFriendships();

    // Find friendship
    const friendship = await friendshipsCol.findOne({
      $or: [
        { userA: payload.userId, userB: params.userId },
        { userA: params.userId, userB: payload.userId },
      ],
    });

    if (!friendship) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    // Delete friendship
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
