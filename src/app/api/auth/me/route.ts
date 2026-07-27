import { NextRequest } from 'next/server';
import { getUsers } from '@/lib/db/collections';
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
    logApiRequest(requestId, 'GET /api/auth/me', userId, {});

    const users = await getUsers();
    const user = await users.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return error('User not found', 'USER_NOT_FOUND', 401);
    }

    logApiResponse(requestId, 200, Date.now() - startTime);
    return success({
      user: {
        id: user._id!.toString(),
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        dob: user.dob,
      },
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
