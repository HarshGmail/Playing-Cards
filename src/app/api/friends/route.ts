import { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth/jwt';
import { getUsers, getFriendships } from '@/lib/db/collections';
import { success, unauthorized, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { crypto } from 'next/dist/compiled/@edge-runtime/primitives';
import { ObjectId } from 'mongodb';

/**
 * GET /api/friends
 * List all confirmed friendships for the current user.
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

    logApiRequest(requestId, 'GET /api/friends', payload.userId, {});

    const friendshipsCol = await getFriendships();
    const usersCol = await getUsers();

    // Find all friendships involving this user
    const friendships = await friendshipsCol
      .find({
        $or: [
          { userA: payload.userId },
          { userB: payload.userId },
        ],
      })
      .toArray();

    // Extract friend IDs
    const friendIds = friendships.map((f) => {
      const otherId = f.userA === payload.userId ? f.userB : f.userA;
      return new ObjectId(otherId);
    });

    // Fetch friend details
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

/**
 * POST /api/friends
 * Send a friend request.
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();

    logApiRequest(requestId, 'POST /api/friends', payload.userId, {
      toUserId: body.toUserId,
    });

    // Validate request body
    if (!body.toUserId || typeof body.toUserId !== 'string') {
      return error('toUserId is required', 'VALIDATION_ERROR', 400);
    }

    // Prevent self-friending
    if (body.toUserId === payload.userId) {
      return error('Cannot send friend request to yourself', 'SELF_REQUEST', 400);
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(body.toUserId)) {
      return error('Invalid user ID', 'INVALID_USER_ID', 400);
    }

    const usersCol = await getUsers();
    const friendRequestsCol = await (await import('@/lib/db/collections')).getFriendRequests();

    // Verify target user exists
    const targetUser = await usersCol.findOne({ _id: new ObjectId(body.toUserId) });
    if (!targetUser) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return error('User not found', 'USER_NOT_FOUND', 404);
    }

    // Check if already friends
    const friendshipsCol = await getFriendships();
    const existing = await friendshipsCol.findOne({
      $or: [
        { userA: payload.userId, userB: body.toUserId },
        { userA: body.toUserId, userB: payload.userId },
      ],
    });

    if (existing) {
      return error('Already friends', 'ALREADY_FRIENDS', 409);
    }

    // Check if request already pending
    const pendingRequest = await friendRequestsCol.findOne({
      $or: [
        { fromUserId: payload.userId, toUserId: body.toUserId, status: 'pending' },
        { fromUserId: body.toUserId, toUserId: payload.userId, status: 'pending' },
      ],
    });

    if (pendingRequest) {
      return error('Friend request already pending', 'REQUEST_PENDING', 409);
    }

    // Create friend request
    const result = await friendRequestsCol.insertOne({
      fromUserId: payload.userId,
      toUserId: body.toUserId,
      status: 'pending' as const,
      createdAt: new Date(),
      respondedAt: null,
    });

    logApiResponse(requestId, 201, Date.now() - startTime);

    return success(
      {
        requestId: result.insertedId.toString(),
        fromUserId: payload.userId,
        toUserId: body.toUserId,
        status: 'pending',
      },
      201
    );
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
