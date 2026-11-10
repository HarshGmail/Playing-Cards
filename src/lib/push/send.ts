import webpush from 'web-push';
import { getPushSubscriptions, PushSubscriptionDoc } from '@/lib/db/collections';
import { logger } from '@/lib/logger';

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

export interface DeliveryResult {
  service: string;
  ok: boolean;
  statusCode?: number;
  reason?: string;
}

interface Delivery {
  result: DeliveryResult;
  goneEndpoint: string | null;
}

const GONE_STATUS_CODES = new Set([404, 410]);
const PUSH_TTL_SECONDS = 60 * 60 * 24;
const REASON_MAX_LENGTH = 200;
const DEFAULT_VAPID_SUBJECT = 'mailto:noreply@playingcards.app';
const UNKNOWN_SERVICE = 'unknown';

const TEST_PAYLOAD: PushPayload = {
  title: 'Test notification',
  body: 'Notifications from Playing Cards reach this device.',
  url: '/notifications',
  tag: 'test',
};

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

function statusCodeOf(err: unknown): number | undefined {
  const statusCode = (err as { statusCode?: number } | null)?.statusCode;
  return typeof statusCode === 'number' ? statusCode : undefined;
}

function isGone(err: unknown): boolean {
  const statusCode = statusCodeOf(err);
  return statusCode !== undefined && GONE_STATUS_CODES.has(statusCode);
}

function pushService(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return UNKNOWN_SERVICE;
  }
}

function failureReason(err: unknown): string | undefined {
  const failure = err as { body?: string; message?: string } | null;
  const reason = (failure?.body || failure?.message || '').trim().slice(0, REASON_MAX_LENGTH);
  return reason || undefined;
}

async function sendToSubscription(
  subscription: PushSubscriptionDoc,
  body: string
): Promise<Delivery> {
  const service = pushService(subscription.endpoint);
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: subscription.keys },
      body,
      { TTL: PUSH_TTL_SECONDS }
    );
    return { result: { service, ok: true }, goneEndpoint: null };
  } catch (err) {
    const statusCode = statusCodeOf(err);
    const reason = failureReason(err);
    logger.warn('Push delivery failed', { service, statusCode, reason });
    return {
      result: { service, ok: false, statusCode, reason },
      goneEndpoint: isGone(err) ? subscription.endpoint : null,
    };
  }
}

export async function sendPushToUsers(
  payloadsByUserId: Map<string, PushPayload[]>
): Promise<DeliveryResult[]> {
  if (payloadsByUserId.size === 0 || !configureVapid()) return [];

  const subscriptionsCol = await getPushSubscriptions();
  const subscriptions = await subscriptionsCol
    .find({ userId: { $in: Array.from(payloadsByUserId.keys()) } })
    .toArray();
  if (subscriptions.length === 0) return [];

  const deliveries = await Promise.all(
    subscriptions.flatMap((subscription) =>
      (payloadsByUserId.get(subscription.userId) ?? []).map((payload) =>
        sendToSubscription(subscription, JSON.stringify(payload))
      )
    )
  );

  const goneEndpoints = deliveries
    .map((delivery) => delivery.goneEndpoint)
    .filter((endpoint): endpoint is string => endpoint !== null);
  if (goneEndpoints.length > 0) {
    await subscriptionsCol.deleteMany({ endpoint: { $in: goneEndpoints } });
  }

  return deliveries.map((delivery) => delivery.result);
}

export async function sendTestPush(
  userId: string
): Promise<{ configured: boolean; results: DeliveryResult[] }> {
  if (!configureVapid()) return { configured: false, results: [] };

  const results = await sendPushToUsers(new Map([[userId, [TEST_PAYLOAD]]]));
  return { configured: true, results };
}
