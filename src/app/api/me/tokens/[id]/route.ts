import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/api/auth';
import { success, notFound, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { revokeApiToken } from '@/lib/auth/apiTokens';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    logApiRequest(requestId, `DELETE /api/me/tokens/${params.id}`, userId, {});

    const revoked = await revokeApiToken(userId, params.id);
    if (!revoked) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    logApiResponse(requestId, 200, Date.now() - startTime);
    return success({ id: params.id, revoked: true });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
