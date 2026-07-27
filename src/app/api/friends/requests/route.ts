import { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth/jwt';
import { getUsers, getFriendRequests } from '@/lib/db/collections';
import { success, unauthorized, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { crypto } from 'next/dist/compiled/@edge-runtime/primitives';
import { ObjectId } from 'mongodb';

/**
 * GET /api/friends/requests
 * Get incoming friend requests for the current user.
 */
export async function GET(request: NextRequest) {
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

    logApiRequest(requestId, 'GET /api/friends/requests', payload.userId, {});

    const friendRequestsCol = await getFriendRequests();
    const usersCol = await getUsers();

    // Get incoming requests
    const requests = await friendRequestsCol
      .find({
        toUserId: payload.userId,
        status: 'pending',
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Fetch sender details
    const senderIds = requests.map((r) => new ObjectId(r.fromUserId));
    const senders = await usersCol
      .find({ _id: { $in: senderIds } })
      .toArray();

    const sendersById = new Map(
      senders.map((s) => [s._id?.toString(), s])
    );

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({
      requests: requests.map((r) => {
        const sender = sendersById.get(r.fromUserId);
        return {
          id: r._id?.toString(),
          fromUserId: r.fromUserId,
          fromUserName: sender?.name || 'Unknown',
          fromUsername: sender?.username || 'unknown',
          createdAt: r.createdAt,
        };
      }),
      count: requests.length,
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
