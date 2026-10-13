import { NextRequest } from 'next/server';
import { success, unauthorized, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { sendGameTimeReminders } from '@/lib/notifications/gameTime';

export const dynamic = 'force-dynamic';

function isAuthorizedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID?.() || Date.now().toString();
  const startTime = Date.now();

  if (!isAuthorizedCron(request)) {
    logApiResponse(requestId, 401, Date.now() - startTime);
    return unauthorized();
  }

  try {
    logApiRequest(requestId, 'GET /api/cron/game-time', null);
    const reminded = await sendGameTimeReminders();
    logApiResponse(requestId, 200, Date.now() - startTime);
    return success({ reminded });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
