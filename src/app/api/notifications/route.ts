import { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth/jwt';
import { getNotifications } from '@/lib/db/collections';
import { success, unauthorized, error } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { crypto } from 'next/dist/compiled/@edge-runtime/primitives';

/**
 * GET /api/notifications
 * Fetch all notifications for the current user.
 */
export async function GET(request: NextRequest) {
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

    logApiRequest(requestId, 'GET /api/notifications', payload.userId, {});

    const notificationsCol = await getNotifications();

    // Get all notifications for user, sorted by creation date
    const notifications = await notificationsCol
      .find({ userId: payload.userId })
      .sort({ createdAt: -1 })
      .limit(100) // Return last 100 notifications
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

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for the current user.
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

    logApiRequest(requestId, 'POST /api/notifications/mark-all-read', payload.userId, {});

    const notificationsCol = await getNotifications();

    // Mark all notifications as read
    const result = await notificationsCol.updateMany(
      { userId: payload.userId, read: false },
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
