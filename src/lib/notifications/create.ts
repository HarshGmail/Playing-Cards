import { getNotifications, Notification } from '@/lib/db/collections';

/**
 * How long a per-round notification lives. Round chatter is only interesting
 * while the game is still fresh, and a busy match produces one document per
 * player per round — left unbounded that is the fastest-growing collection in
 * the app.
 */
export const EPHEMERAL_NOTIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

/** Types swept by the TTL index a day after they are created. */
const EPHEMERAL_TYPES = new Set<Notification['type']>(['round-scored']);

/**
 * ensureIndexes() is a one-shot migration helper that nothing calls at runtime,
 * so the TTL index cannot be assumed to exist in a given database. Expiry is a
 * requirement of these notifications rather than an optimisation, so ensure it
 * here — memoised, because createIndex is idempotent but not free.
 */
let ttlIndexPromise: Promise<unknown> | null = null;

async function ensureTtlIndex(): Promise<void> {
  if (!ttlIndexPromise) {
    ttlIndexPromise = getNotifications()
      .then((col) => col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }))
      .catch((err) => {
        // Don't cache the failure — the next write should try again.
        ttlIndexPromise = null;
        throw err;
      });
  }
  await ttlIndexPromise;
}

export interface NotificationInput {
  userId: string;
  type: Notification['type'];
  payload: Record<string, unknown>;
}

/**
 * Insert a batch of notifications, each with its own recipient and payload.
 *
 * Notifications are a side effect of the action that produced them, never the
 * point of it: callers await this *after* their own write has committed, and
 * treat a failure here as loggable rather than fatal. A round that scored fine
 * should not report failure because a notification insert did.
 */
export async function notifyMany(inputs: NotificationInput[]): Promise<void> {
  if (inputs.length === 0) return;

  const now = new Date();
  const expiring = inputs.some((i) => EPHEMERAL_TYPES.has(i.type));
  if (expiring) await ensureTtlIndex();

  const notificationsCol = await getNotifications();
  await notificationsCol.insertMany(
    inputs.map((input) => ({
      userId: input.userId,
      type: input.type,
      payload: input.payload,
      read: false,
      createdAt: now,
      expiresAt: EPHEMERAL_TYPES.has(input.type)
        ? new Date(now.getTime() + EPHEMERAL_NOTIFICATION_TTL_MS)
        : null,
    }))
  );
}

/** Fan one payload out to several recipients, de-duplicating the list. */
export async function notifyUsers(
  userIds: string[],
  type: Notification['type'],
  payload: Record<string, unknown>
): Promise<void> {
  const recipients = Array.from(new Set(userIds));
  return notifyMany(recipients.map((userId) => ({ userId, type, payload })));
}

/** Single-recipient convenience wrapper around notifyMany. */
export async function notifyUser(
  userId: string,
  type: Notification['type'],
  payload: Record<string, unknown>
): Promise<void> {
  return notifyMany([{ userId, type, payload }]);
}
