import { NextRequest } from 'next/server';
import { getUsers } from '@/lib/db/collections';
import { success, notFound, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';

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

    const { userId } = authResult;
    logApiRequest(requestId, `GET /api/users/${params.username}`, userId, {
      username: params.username,
    });

    const usersCol = await getUsers();
    const user = await usersCol.findOne({
      username: params.username,
    });

    if (!user) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({
      user: {
        id: user._id?.toString(),
        name: user.name,
        username: user.username,
        profilePicUrl: user.profilePicUrl,
      },
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
