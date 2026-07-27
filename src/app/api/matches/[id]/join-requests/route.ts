import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { getMatches, getJoinRequests } from '@/lib/db/collections';
import { success, notFound, unauthorized, error, conflict } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

const createJoinRequestSchema = z.object({
  message: z.string().max(500).optional(),
});

/**
 * POST /api/matches/[id]/join-requests
 * Request to join a match (for when join code is not used).
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

    logApiRequest(requestId, `POST /api/matches/${params.id}/join-requests`, userId, {
      matchId: params.id,
      hasMessage: !!body.message,
    });

    // Validate ObjectId format
    if (!ObjectId.isValid(params.id)) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    // Validate request body
    const parsed = createJoinRequestSchema.safeParse(body);
    if (!parsed.success) {
      return error('Invalid input', 'VALIDATION_ERROR', 400);
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

    // Check if already in match
    if (match.roster.some((r) => r.userId === userId)) {
      logApiResponse(requestId, 409, Date.now() - startTime);
      return conflict('You are already in this match');
    }

    const joinRequestsCol = await getJoinRequests();

    // Check if request already pending
    const existing = await joinRequestsCol.findOne({
      matchId: params.id,
      userId: userId,
      status: 'pending',
    });

    if (existing) {
      logApiResponse(requestId, 409, Date.now() - startTime);
      return conflict('Join request already pending');
    }

    // Create join request
    const result = await joinRequestsCol.insertOne({
      matchId: params.id,
      userId: userId,
      status: 'pending' as const,
      createdAt: new Date(),
      respondedAt: null,
    });

    logApiResponse(requestId, 201, Date.now() - startTime);

    return success(
      {
        joinRequestId: result.insertedId.toString(),
        matchId: params.id,
        userId: userId,
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

/**
 * GET /api/matches/[id]/join-requests
 * List pending join requests for a match (creator only).
 */
export async function GET(
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

    logApiRequest(requestId, `GET /api/matches/${params.id}/join-requests`, userId, {
      matchId: params.id,
    });

    // Validate ObjectId format
    if (!ObjectId.isValid(params.id)) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
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

    // Only creator can view join requests
    if (match.creatorId !== userId) {
      return error('Only match creator can view join requests', 'FORBIDDEN', 403);
    }

    const joinRequestsCol = await getJoinRequests();
    const { getUsers } = await import('@/lib/db/collections');
    const usersCol = await getUsers();

    // Get pending join requests
    const requests = await joinRequestsCol
      .find({
        matchId: params.id,
        status: 'pending',
      })
      .sort({ createdAt: -1 })
      .toArray();

    // Fetch user details
    const userIds = requests.map((r) => new ObjectId(r.userId));
    const users = await usersCol
      .find({ _id: { $in: userIds } })
      .toArray();

    const usersById = new Map(users.map((u) => [u._id?.toString(), u]));

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({
      matchId: params.id,
      requests: requests.map((r) => {
        const user = usersById.get(r.userId);
        return {
          requestId: r._id?.toString(),
          userId: r.userId,
          userName: user?.name || 'Unknown',
          username: user?.username || 'unknown',
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
