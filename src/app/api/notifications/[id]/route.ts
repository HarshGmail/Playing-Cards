import { NextRequest } from 'next/server';
import { getNotifications } from '@/lib/db/collections';
import { success, notFound, error, forbidden } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function PATCH(
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
    logApiRequest(requestId, `PATCH /api/notifications/${params.id}`, userId, {
      notificationId: params.id,
    });

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

    if (notification.userId !== userId) {
      logApiResponse(requestId, 403, Date.now() - startTime);
      return forbidden();
    }

    const result = await notificationsCol.updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { read: true } }
    );

    if (result.modifiedCount === 0) {
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
