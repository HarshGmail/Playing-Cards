import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { getUsers } from '@/lib/db/collections';
import { success, notFound, error, validationError } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const resolveUserSchema = z.object({
  identifier: z.string().min(1).max(100),
});

/**
 * POST /api/users/resolve
 * Resolve a user by exact username, email, or phone match.
 * No fuzzy matching — used by the create-match player-add step, which is
 * exact-match-only by design (no autocomplete/suggestions).
 */
export async function POST(request: NextRequest) {
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
    logApiRequest(requestId, 'POST /api/users/resolve', userId, {});

    const parsed = resolveUserSchema.safeParse(body);
    if (!parsed.success) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return validationError(parsed.error.issues[0]?.message || 'Invalid input');
    }

    const identifier = parsed.data.identifier.trim().toLowerCase();

    const usersCol = await getUsers();
    const user = await usersCol.findOne({
      $or: [
        { username: identifier },
        { email: identifier },
        { phone: parsed.data.identifier.trim() },
      ],
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
      },
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
