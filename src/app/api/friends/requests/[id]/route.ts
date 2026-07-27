import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { getUsers, getFriendRequests, getFriendships } from '@/lib/db/collections';
import { success, notFound, unauthorized, error, forbidden, validationError } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const respondSchema = z.object({
  action: z.enum(['accept', 'decline']),
});

/**
 * POST /api/friends/requests/[id]/accept
 * Accept a friend request.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID?.() || Date.now().toString();

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return authResult;
    }
    const { userId } = authResult;

    const body = await request.json();

    logApiRequest(requestId, `POST /api/friends/requests/${params.id}`, userId, {
      requestId: params.id,
      action: body.action,
    });

    // Validate request body
    const parsed = respondSchema.safeParse(body);
    if (!parsed.success) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return validationError(parsed.error.issues[0]?.message || 'Invalid input');
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(params.id)) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    const friendRequestsCol = await getFriendRequests();
    const friendRequest = await friendRequestsCol.findOne({
      _id: new ObjectId(params.id),
    });

    if (!friendRequest) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    // Only recipient can respond
    if (friendRequest.toUserId !== userId) {
      logApiResponse(requestId, 403, Date.now() - startTime);
      return forbidden();
    }

    // Check if already responded
    if (friendRequest.status !== 'pending') {
      return error('Request already responded', 'ALREADY_RESPONDED', 409);
    }

    const action = parsed.data.action;

    if (action === 'accept') {
      // Create friendship
      const friendshipsCol = await getFriendships();
      await friendshipsCol.insertOne({
        userA: friendRequest.fromUserId,
        userB: friendRequest.toUserId,
        createdAt: new Date(),
      });
    }

    // Update request status
    await friendRequestsCol.updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          status: action === 'accept' ? 'accepted' : 'declined',
          respondedAt: new Date(),
        },
      }
    );

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({
      requestId: params.id,
      action,
      status: action === 'accept' ? 'accepted' : 'declined',
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
