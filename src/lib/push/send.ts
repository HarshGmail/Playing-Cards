import webpush from 'web-push';
import { getPushSubscriptions, PushSubscriptionDoc } from '@/lib/db/collections';
import { logger } from '@/lib/logger';

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

const GONE_STATUS_CODES = new Set([404, 410]);
const PUSH_TTL_SECONDS = 60 * 60 * 24;
const DEFAULT_VAPID_SUBJECT = 'mailto:noreply@playingcards.app';

let vapidConfigured: boolean | null = null;

function configureVapid(): boolean {
  if (vapidConfigured !== null) return vapidConfigured;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    vapidConfigured = false;
    return false;
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || DEFAULT_VAPID_SUBJECT,
    publicKey,
    privateKey
  );
  vapidConfigured = true;
  return true;
}

export function isPushConfigured(): boolean {
  return configureVapid();
}

function isGone(err: unknown): boolean {
  const statusCode = (err as { statusCode?: number } | null)?.statusCode;
  return typeof statusCode === 'number' && GONE_STATUS_CODES.has(statusCode);
}

async function sendToSubscription(
  subscription: PushSubscriptionDoc,
  body: string
): Promise<string | null> {
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: subscription.keys },
      body,
      { TTL: PUSH_TTL_SECONDS }
    );
    return null;
  } catch (err) {
    if (isGone(err)) return subscription.endpoint;
    logger.warn('Push delivery failed', {
      endpoint: subscription.endpoint.slice(0, 48),
      statusCode: (err as { statusCode?: number } | null)?.statusCode,
    });
    return null;
  }
}

export async function sendPushToUsers(
  payloadsByUserId: Map<string, PushPayload[]>
): Promise<void> {
  if (payloadsByUserId.size === 0 || !configureVapid()) return;

  const subscriptionsCol = await getPushSubscriptions();
  const subscriptions = await subscriptionsCol
    .find({ userId: { $in: Array.from(payloadsByUserId.keys()) } })
    .toArray();
  if (subscriptions.length === 0) return;

  const deliveries = subscriptions.flatMap((subscription) =>
    (payloadsByUserId.get(subscription.userId) ?? []).map((payload) =>
      sendToSubscription(subscription, JSON.stringify(payload))
    )
  );

  const goneEndpoints = (await Promise.all(deliveries)).filter(
    (endpoint): endpoint is string => endpoint !== null
  );
  if (goneEndpoints.length > 0) {
    await subscriptionsCol.deleteMany({ endpoint: { $in: goneEndpoints } });
  }
}
