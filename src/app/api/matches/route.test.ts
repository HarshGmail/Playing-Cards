import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

interface StoredUser {
  _id: ObjectId;
  email: string;
}

const OWNER: StoredUser = { _id: new ObjectId(), email: 'maddalaharshvardhan@gmail.com' };
const PLAYER: StoredUser = { _id: new ObjectId(), email: 'player@example.com' };
const FRIEND_ID = new ObjectId().toString();

const createMatch = vi.fn();

vi.mock('@/lib/auth/jwt', () => ({ verifyJwt: async () => null }));
vi.mock('@/lib/db/collections', () => ({
  getMatches: async () => ({}),
  getUsers: async () => ({
    findOne: async (filter: { _id: ObjectId }) =>
      [OWNER, PLAYER].find((user) => user._id.equals(filter._id)) ?? null,
  }),
}));
vi.mock('@/lib/matches/service', () => ({
  createMatch: (userId: string, input: unknown, options: unknown) => createMatch(userId, input, options),
  MatchServiceError: class MatchServiceError extends Error {
    constructor(
      readonly status: number,
      readonly code: string,
      message: string
    ) {
      super(message);
    }
  },
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn() },
  logApiRequest: vi.fn(),
  logApiResponse: vi.fn(),
  logError: vi.fn(),
}));

const { POST } = await import('./route');

function createMatchAs(requester: StoredUser, extra: Record<string, unknown> = {}) {
  const request = new NextRequest('https://app.test/api/matches', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-user-id': requester._id.toString() },
    body: JSON.stringify({
      name: 'Family night',
      creatorRole: 'score-and-play',
      rankPreference: 'lowest-first',
      tiebreakers: ['a', 'b', 'c'],
      players: [FRIEND_ID],
      ...extra,
    }),
  });
  return POST(request);
}

describe('POST /api/matches', () => {
  beforeEach(() => {
    createMatch.mockReset().mockResolvedValue({ id: 'm1', invitedCount: 0, addedDirectlyCount: 1 });
    delete process.env.APP_ADMIN_EMAILS;
  });

  it('passes direct-add permission to the service for an admin', async () => {
    const response = await createMatchAs(OWNER, { addDirectly: true });

    expect(response.status).toBe(201);
    expect(createMatch.mock.calls[0][1]).toMatchObject({ addDirectly: true });
    expect(createMatch.mock.calls[0][2]).toEqual({ canAddDirectly: true });
  });

  it('withholds direct-add permission from a non-admin who asks for it', async () => {
    await createMatchAs(PLAYER, { addDirectly: true });

    expect(createMatch.mock.calls[0][2]).toEqual({ canAddDirectly: false });
  });

  it('withholds direct-add permission from everyone when it was not requested', async () => {
    await createMatchAs(OWNER);

    expect(createMatch.mock.calls[0][1]).toMatchObject({ addDirectly: false });
    expect(createMatch.mock.calls[0][2]).toEqual({ canAddDirectly: false });
  });
});
