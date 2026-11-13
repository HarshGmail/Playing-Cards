import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { success, error, conflict, validationError } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { createApiTokenSchema, MAX_API_TOKENS_PER_USER } from '@/lib/schemas/apiTokens';
import { countApiTokens, createApiToken, listApiTokens } from '@/lib/auth/apiTokens';

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
    logApiRequest(requestId, 'GET /api/me/tokens', userId, {});

    const tokens = await listApiTokens(userId);

    logApiResponse(requestId, 200, Date.now() - startTime);
    return success({ tokens: tokens.map(toTokenJson) });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID?.() || Date.now().toString();
  const startTime = Date.now();

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return authResult;
    }
    const { userId } = authResult;
    logApiRequest(requestId, 'POST /api/me/tokens', userId, {});

    const body = await request.json().catch(() => null);
    const parsed = createApiTokenSchema.safeParse(body);
    if (!parsed.success) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return validationError(parsed.error.issues[0]?.message || 'Invalid input');
    }

    if ((await countApiTokens(userId)) >= MAX_API_TOKENS_PER_USER) {
      logApiResponse(requestId, 409, Date.now() - startTime);
      return conflict(
        `You can have at most ${MAX_API_TOKENS_PER_USER} tokens. Revoke one first.`
      );
    }

    const { token, record } = await createApiToken(userId, parsed.data.name);

    logApiResponse(requestId, 201, Date.now() - startTime);
    return success({ token, ...toTokenJson(record) }, 201);
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

function toTokenJson(record: { id: string; name: string; prefix: string; createdAt: Date; lastUsedAt: Date | null }) {
  return {
    id: record.id,
    name: record.name,
    prefix: record.prefix,
    createdAt: record.createdAt.toISOString(),
    lastUsedAt: record.lastUsedAt ? record.lastUsedAt.toISOString() : null,
  };
}
