import { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth/jwt';
import { getUsers } from '@/lib/db/collections';
import { success, notFound, unauthorized, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { crypto } from 'next/dist/compiled/@edge-runtime/primitives';

/**
 * GET /api/users/[username]
 * Get public profile information for a user by username.
 * Available to authenticated users only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
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

    logApiRequest(requestId, `GET /api/users/${params.username}`, payload.userId, {
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
