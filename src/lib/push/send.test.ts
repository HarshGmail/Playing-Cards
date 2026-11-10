import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  sendNotification: vi.fn(),
  setVapidDetails: vi.fn(),
  find: vi.fn(),
  deleteMany: vi.fn(),
  warn: vi.fn(),
}));

vi.mock('web-push', () => ({
  default: { sendNotification: mocks.sendNotification, setVapidDetails: mocks.setVapidDetails },
}));
vi.mock('@/lib/db/collections', () => ({
  getPushSubscriptions: async () => ({ find: mocks.find, deleteMany: mocks.deleteMany }),
}));
vi.mock('@/lib/logger', () => ({ logger: { warn: mocks.warn } }));

const FCM_ENDPOINT = 'https://fcm.googleapis.com/fcm/send/phone-abc';
const MOZILLA_ENDPOINT = 'https://updates.push.services.mozilla.com/wpush/v2/laptop-xyz';
const SUBSCRIPTION_KEYS = { p256dh: 'p256', auth: 'auth' };

function subscription(userId: string, endpoint: string) {
  return { userId, endpoint, keys: SUBSCRIPTION_KEYS, userAgent: null, createdAt: new Date() };
}

function httpError(statusCode: number, body: string) {
  return Object.assign(new Error(`Received ${statusCode}`), { statusCode, body });
}

async function loadSend(configured: boolean) {
  vi.stubEnv('VAPID_PUBLIC_KEY', configured ? 'public-key' : '');
  vi.stubEnv('VAPID_PRIVATE_KEY', configured ? 'private-key' : '');
  vi.resetModules();
  return import('./send');
}

function payloadFor(userId: string) {
  return new Map([[userId, [{ title: 'Hello', body: 'World', url: '/' }]]]);
}

describe('sendPushToUsers', () => {
  beforeEach(() => {
    mocks.sendNotification.mockReset();
    mocks.setVapidDetails.mockReset();
    mocks.find.mockReset();
    mocks.deleteMany.mockReset();
    mocks.warn.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports each device separately and logs the refused one', async () => {
    const { sendPushToUsers } = await loadSend(true);
    mocks.find.mockReturnValue({
      toArray: async () => [subscription('u1', FCM_ENDPOINT), subscription('u1', MOZILLA_ENDPOINT)],
    });
    mocks.sendNotification.mockImplementation(async (target: { endpoint: string }) => {
      if (target.endpoint === MOZILLA_ENDPOINT) throw httpError(403, 'VAPID credentials do not match');
    });

    const results = await sendPushToUsers(payloadFor('u1'));

    expect(results).toEqual([
      { service: 'fcm.googleapis.com', ok: true },
      {
        service: 'updates.push.services.mozilla.com',
        ok: false,
        statusCode: 403,
        reason: 'VAPID credentials do not match',
      },
    ]);
    expect(mocks.deleteMany).not.toHaveBeenCalled();
    expect(mocks.warn).toHaveBeenCalledWith('Push delivery failed', {
      service: 'updates.push.services.mozilla.com',
      statusCode: 403,
      reason: 'VAPID credentials do not match',
    });
  });

  it('trims long reasons to 200 characters', async () => {
    const { sendPushToUsers } = await loadSend(true);
    mocks.find.mockReturnValue({ toArray: async () => [subscription('u1', FCM_ENDPOINT)] });
    mocks.sendNotification.mockRejectedValue(httpError(500, 'x'.repeat(500)));

    const [result] = await sendPushToUsers(payloadFor('u1'));

    expect(result.reason).toHaveLength(200);
  });

  it('returns nothing when VAPID is not configured', async () => {
    const { sendPushToUsers } = await loadSend(false);

    const results = await sendPushToUsers(payloadFor('u1'));

    expect(results).toEqual([]);
    expect(mocks.find).not.toHaveBeenCalled();
    expect(mocks.sendNotification).not.toHaveBeenCalled();
  });

  it('deletes a subscription the push service reports as gone (410)', async () => {
    const { sendPushToUsers } = await loadSend(true);
    mocks.find.mockReturnValue({ toArray: async () => [subscription('u1', FCM_ENDPOINT)] });
    mocks.sendNotification.mockRejectedValue(httpError(410, 'Gone'));

    const results = await sendPushToUsers(payloadFor('u1'));

    expect(mocks.deleteMany).toHaveBeenCalledWith({ endpoint: { $in: [FCM_ENDPOINT] } });
    expect(results).toEqual([
      { service: 'fcm.googleapis.com', ok: false, statusCode: 410, reason: 'Gone' },
    ]);
  });
});

describe('sendTestPush', () => {
  beforeEach(() => {
    mocks.sendNotification.mockReset();
    mocks.find.mockReset();
    mocks.deleteMany.mockReset();
    mocks.warn.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports not configured without touching subscriptions when VAPID is unset', async () => {
    const { sendTestPush } = await loadSend(false);

    expect(await sendTestPush('u1')).toEqual({ configured: false, results: [] });
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it('sends the test payload to every device of the user', async () => {
    const { sendTestPush } = await loadSend(true);
    mocks.find.mockReturnValue({ toArray: async () => [subscription('u1', FCM_ENDPOINT)] });
    mocks.sendNotification.mockResolvedValue(undefined);

    const answer = await sendTestPush('u1');

    expect(answer).toEqual({
      configured: true,
      results: [{ service: 'fcm.googleapis.com', ok: true }],
    });
    const sentBody = JSON.parse(mocks.sendNotification.mock.calls[0][1]);
    expect(sentBody).toEqual({
      title: 'Test notification',
      body: 'Notifications from Playing Cards reach this device.',
      url: '/notifications',
      tag: 'test',
    });
  });
});
