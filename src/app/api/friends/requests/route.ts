import { NextRequest } from 'next/server';
import { getUsers, getFriendRequests } from '@/lib/db/collections';
import { success, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

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
    logApiRequest(requestId, 'GET /api/friends/requests', userId, {});

    const friendRequestsCol = await getFriendRequests();
    const usersCol = await getUsers();

    // Get incoming requests
    const requests = await friendRequestsCol
      .find({
        toUserId: userId,
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
