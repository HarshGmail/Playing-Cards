import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAuth } from '@/lib/api/auth';
import { getUsers } from '@/lib/db/collections';
import { success, error, validationError } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { searchUsersSchema } from '@/lib/schemas/friends';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users/search?q=<query>&limit=<n>
 * Search for users by name or username.
 * Available to authenticated users only.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID?.() || Date.now().toString();

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return authResult;
    }
    const { userId } = authResult;

    const params = request.nextUrl.searchParams;
    const rawQuery = params.get('q') ?? '';
    const rawLimit = params.get('limit');

    logApiRequest(requestId, 'GET /api/users/search', userId, {
      query: rawQuery.substring(0, 20),
      limit: rawLimit,
    });

    const parsed = searchUsersSchema.safeParse({
      query: rawQuery,
      // Omit rather than pass null so the schema default applies.
      ...(rawLimit === null ? {} : { limit: rawLimit }),
    });
    if (!parsed.success) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return validationError(parsed.error.issues[0]?.message || 'Invalid input');
    }

    const { query, limit } = parsed.data;
    const usersCol = await getUsers();

    // Search by username or name (case-insensitive). Escape regex
    // metacharacters in user input to avoid ReDoS / regex injection.
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escaped, 'i');
    const results = await usersCol
      .find({
        $or: [
          { username: searchRegex },
          { name: searchRegex },
        ],
        _id: { $ne: new ObjectId(userId) }, // Exclude current user
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
