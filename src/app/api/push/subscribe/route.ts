import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getPushSubscriptions } from '@/lib/db/collections';
import { success, error, validationError } from '@/lib/api/respond';
import { logApiRequest, logApiResponse, logError } from '@/lib/logger';
import { requireAuth } from '@/lib/api/auth';

export const dynamic = 'force-dynamic';

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

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

    logApiRequest(requestId, 'POST /api/push/subscribe', userId, {});

    const parsed = subscribeSchema.safeParse(await request.json());
    if (!parsed.success) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return validationError(parsed.error.issues[0]?.message || 'Invalid subscription');
    }

    const subscriptionsCol = await getPushSubscriptions();
    await subscriptionsCol.updateOne(
      { endpoint: parsed.data.endpoint },
      {
        $set: {
          userId,
          keys: parsed.data.keys,
          userAgent: request.headers.get('user-agent'),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    logApiResponse(requestId, 200, Date.now() - startTime);
    return success({ subscribed: true });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = crypto.randomUUID?.() || Date.now().toString();
  const startTime = Date.now();

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      logApiResponse(requestId, 401, Date.now() - startTime);
      return authResult;
    }
    const { userId } = authResult;

    logApiRequest(requestId, 'DELETE /api/push/subscribe', userId, {});

    const parsed = unsubscribeSchema.safeParse(await request.json());
    if (!parsed.success) {
      logApiResponse(requestId, 400, Date.now() - startTime);
      return validationError(parsed.error.issues[0]?.message || 'Invalid subscription');
    }

    const subscriptionsCol = await getPushSubscriptions();
    await subscriptionsCol.deleteOne({ endpoint: parsed.data.endpoint, userId });

    logApiResponse(requestId, 200, Date.now() - startTime);
    return success({ subscribed: false });
  } catch (err) {
    logError(requestId, err);
    logApiResponse(requestId, 500, Date.now() - startTime);
    return error('Internal server error', 'INTERNAL_ERROR', 500);
  }
}
