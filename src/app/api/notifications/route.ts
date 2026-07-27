import { NextRequest } from 'next/server';
import { getNotifications } from '@/lib/db/collections';
import { success, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';

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
    logApiRequest(requestId, 'GET /api/notifications', userId, {});

    const notificationsCol = await getNotifications();
    const notifications = await notificationsCol
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    const unreadCount = notifications.filter((n) => !n.read).length;

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({
      notifications: notifications.map((n) => ({
        id: n._id?.toString(),
        type: n.type,
        payload: n.payload,
        read: n.read,
        createdAt: n.createdAt,
      })),
      unreadCount,
      totalCount: notifications.length,
    });
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
    logApiRequest(requestId, 'POST /api/notifications/mark-all-read', userId, {});

    const notificationsCol = await getNotifications();
    const result = await notificationsCol.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    );

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({
      markedAsRead: result.modifiedCount,
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
