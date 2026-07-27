import { NextRequest } from 'next/server';
import { getUsers, getFriendships, getFriendRequests } from '@/lib/db/collections';
import { success, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';
import { createHandler } from '@/lib/api/handler';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

const sendFriendRequestSchema = z.object({
  toUserId: z.string(),
});

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
    logApiRequest(requestId, 'GET /api/friends', userId, {});

    const friendshipsCol = await getFriendships();
    const usersCol = await getUsers();

    const friendships = await friendshipsCol
      .find({
        $or: [
          { userA: userId },
          { userB: userId },
        ],
      })
      .toArray();

    const friendIds = friendships.map((f) => {
      const otherId = f.userA === userId ? f.userB : f.userA;
      return new ObjectId(otherId);
    });

    const friends = await usersCol
      .find({ _id: { $in: friendIds } })
      .toArray();

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({
      friends: friends.map((f) => ({
        id: f._id?.toString(),
        name: f.name,
        username: f.username,
        profilePicUrl: f.profilePicUrl,
      })),
      count: friends.length,
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export const POST = createHandler(
  async (_, data, userId) => {
    if (!userId) {
      return error('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { toUserId } = data as typeof sendFriendRequestSchema._type;

    if (toUserId === userId) {
      return error('Cannot send friend request to yourself', 'SELF_REQUEST', 400);
    }

    if (!ObjectId.isValid(toUserId)) {
      return error('Invalid user ID', 'INVALID_USER_ID', 400);
    }

    const usersCol = await getUsers();
    const targetUser = await usersCol.findOne({ _id: new ObjectId(toUserId) });
    if (!targetUser) {
      return error('User not found', 'USER_NOT_FOUND', 404);
    }

    const friendshipsCol = await getFriendships();
    const friendRequestsCol = await getFriendRequests();

    const existing = await friendshipsCol.findOne({
      $or: [
        { userA: userId, userB: toUserId },
        { userA: toUserId, userB: userId },
      ],
    });

    if (existing) {
      return error('Already friends', 'ALREADY_FRIENDS', 409);
    }

    const pendingRequest = await friendRequestsCol.findOne({
      $or: [
        { fromUserId: userId, toUserId, status: 'pending' },
        { fromUserId: toUserId, toUserId: userId, status: 'pending' },
      ],
    });

    if (pendingRequest) {
      return error('Friend request already pending', 'REQUEST_PENDING', 409);
    }

    // A prior request between this exact pair (e.g. previously declined) already
    // holds the unique {fromUserId, toUserId} index slot, so re-request by
    // resetting it to pending rather than inserting a fresh document.
    const updated = await friendRequestsCol.findOneAndUpdate(
      { fromUserId: userId, toUserId },
      {
        $set: {
          status: 'pending' as const,
          createdAt: new Date(),
          respondedAt: null,
        },
      },
      { upsert: true, returnDocument: 'after' }
    );

    return success(
      {
        requestId: updated?._id?.toString(),
        fromUserId: userId,
        toUserId,
        status: 'pending',
      },
      201
    );
  },
  {
    rateLimitKey: 'send-friend-request',
    maxAttempts: 20,
    windowMs: 60 * 60 * 1000,
    schema: sendFriendRequestSchema,
    requireAuth: true,
  }
);
