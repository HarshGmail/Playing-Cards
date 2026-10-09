import { describe, it, expect, vi, beforeEach } from 'vitest';

const insertMany = vi.fn();

vi.mock('@/lib/db/collections', () => ({
  getNotifications: async () => ({ insertMany, createIndex: async () => 'expiresAt_1' }),
}));
vi.mock('@/lib/push/send', () => ({ sendPushToUsers: async () => undefined }));

const { notifyMany, expiresAtOnRead, DEFAULT_NOTIFICATION_TTL_MS, EPHEMERAL_NOTIFICATION_TTL_MS } =
  await import('./create');

function insertedExpiry(index: number): Date | null {
  return insertMany.mock.calls[0][0][index].expiresAt;
}

describe('notifyMany expiry', () => {
  beforeEach(() => insertMany.mockReset());

  it('keeps milestones until read and expires other types by their TTL', async () => {
    await notifyMany([
      { userId: 'u', type: 'milestone', payload: {} },
      { userId: 'u', type: 'round-scored', payload: {} },
      { userId: 'u', type: 'match-won', payload: {} },
    ]);
    const createdAt: Date = insertMany.mock.calls[0][0][0].createdAt;
    expect(insertedExpiry(0)).toBeNull();
    expect(insertedExpiry(1)!.getTime()).toBe(createdAt.getTime() + EPHEMERAL_NOTIFICATION_TTL_MS);
    expect(insertedExpiry(2)!.getTime()).toBe(createdAt.getTime() + DEFAULT_NOTIFICATION_TTL_MS);
  });
});

describe('expiresAtOnRead', () => {
  it('gives a read milestone the default lifetime from the moment it is read', () => {
    const readAt = new Date('2026-10-01T00:00:00Z');
    expect(expiresAtOnRead(readAt).getTime()).toBe(readAt.getTime() + DEFAULT_NOTIFICATION_TTL_MS);
  });
});
