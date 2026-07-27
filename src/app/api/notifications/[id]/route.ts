import { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth/jwt';
import { getNotifications } from '@/lib/db/collections';
import { success, notFound, unauthorized, error, forbidden } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { crypto } from 'next/dist/compiled/@edge-runtime/primitives';
import { ObjectId } from 'mongodb';

/**
 * PATCH /api/notifications/[id]
 * Mark a specific notification as read.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    logApiRequest(requestId, `PATCH /api/notifications/${params.id}`, payload.userId, {
      notificationId: params.id,
    });

    // Validate ObjectId format
    if (!ObjectId.isValid(params.id)) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    const notificationsCol = await getNotifications();
    const notification = await notificationsCol.findOne({
      _id: new ObjectId(params.id),
    });

    if (!notification) {
      logApiResponse(requestId, 404, Date.now() - startTime);
      return notFound();
    }

    // Only owner can mark as read
    if (notification.userId !== payload.userId) {
      logApiResponse(requestId, 403, Date.now() - startTime);
      return forbidden();
    }

    // Mark as read
    const result = await notificationsCol.updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { read: true } }
    );

    if (result.modifiedCount === 0) {
      // Already read or not found
      logApiResponse(requestId, 200, Date.now() - startTime);
      return success({
        notificationId: params.id,
        read: notification.read,
      });
    }

    logApiResponse(requestId, 200, Date.now() - startTime);

    return success({
      notificationId: params.id,
      read: true,
    });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
