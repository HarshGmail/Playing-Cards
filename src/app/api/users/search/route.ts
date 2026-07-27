import { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth/jwt';
import { getUsers } from '@/lib/db/collections';
import { success, unauthorized, error, validationError } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { searchUsersSchema } from '@/lib/schemas/friends';
import { crypto } from 'next/dist/compiled/@edge-runtime/primitives';

/**
 * POST /api/users/search
 * Search for users by name or username.
 * Available to authenticated users only.
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

    logApiRequest(requestId, 'POST /api/users/search', payload.userId, {
      query: body.query?.substring(0, 20) || '',
      limit: body.limit,
    });

    // Validate request body
    const parsed = searchUsersSchema.safeParse(body);
    if (!parsed.success) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return validationError(parsed.error.issues[0]?.message || 'Invalid input');
    }

    const { query, limit } = parsed.data;
    const usersCol = await getUsers();

    // Search by username or name (case-insensitive)
    const searchRegex = new RegExp(query, 'i');
    const results = await usersCol
      .find({
        $or: [
          { username: searchRegex },
          { name: searchRegex },
        ],
        _id: { $ne: payload.userId }, // Exclude current user
      })
      .limit(limit)
      .toArray();

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({
      query,
      results: results.map((u) => ({
        id: u._id?.toString(),
        name: u.name,
        username: u.username,
        profilePicUrl: u.profilePicUrl,
      })),
      count: results.length,
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
