import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ObjectId } from 'mongodb';

interface StoredUser {
  _id: ObjectId;
  name: string;
  email: string;
}

const OWNER: StoredUser = { _id: new ObjectId(), name: 'Harsh', email: 'Maddalaharshvardhan@gmail.com' };
const CREATOR: StoredUser = { _id: new ObjectId(), name: 'Creator', email: 'creator@example.com' };
const OTHER: StoredUser = { _id: new ObjectId(), name: 'Other', email: 'other@example.com' };
const FAMILY: StoredUser = { _id: new ObjectId(), name: 'Amma', email: 'amma@example.com' };
const MATCH_ID = new ObjectId();

let storedUsers: StoredUser[] = [];
let storedMatch: Record<string, unknown> | null = null;
const forceAddPlayerToMatch = vi.fn();
const invitePlayersToMatch = vi.fn();

vi.mock('@/lib/auth/jwt', () => ({ verifyJwt: async () => null }));
vi.mock('@/lib/db/collections', () => ({
  getMatches: async () => ({ findOne: async () => storedMatch }),
  getUsers: async () => ({
    findOne: async (filter: { _id: ObjectId }) =>
      storedUsers.find((user) => user._id.equals(filter._id)) ?? null,
  }),
}));
vi.mock('@/lib/domain/matchInvites', () => ({
  forceAddPlayerToMatch: (args: unknown) => forceAddPlayerToMatch(args),
  invitePlayersToMatch: (args: unknown) => invitePlayersToMatch(args),
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn() },
  logApiRequest: vi.fn(),
  logApiResponse: vi.fn(),
  logError: vi.fn(),
}));

const { POST } = await import('./route');

function matchCreatedBy(creator: StoredUser, overrides: Record<string, unknown> = {}) {
  return {
    _id: MATCH_ID,
    name: 'Friday night',
    creatorId: creator._id.toString(),
    status: 'active',
    roster: [{ userId: creator._id.toString(), userName: creator.name }],
    roundsPlayed: 2,
    version: 4,
    ...overrides,
  };
}

function addPlayerAs(requester: StoredUser | null, body: Record<string, unknown>) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (requester) headers['x-user-id'] = requester._id.toString();
  const request = new NextRequest(`https://app.test/api/matches/${MATCH_ID}/roster`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return POST(request, { params: { id: MATCH_ID.toString() } });
}

describe('POST /api/matches/[id]/roster', () => {
  beforeEach(() => {
    storedUsers = [OWNER, CREATOR, OTHER, FAMILY];
    storedMatch = matchCreatedBy(OWNER);
    forceAddPlayerToMatch.mockReset().mockResolvedValue({ joinedAtRound: 3, version: 5 });
    invitePlayersToMatch.mockReset().mockResolvedValue([{ inviteId: 'invite-1', userId: FAMILY._id.toString() }]);
    delete process.env.APP_ADMIN_EMAILS;
  });

  describe('force add', () => {
    it('answers 401 when nobody is signed in', async () => {
      const response = await addPlayerAs(null, { userId: FAMILY._id.toString(), force: true });

      expect(response.status).toBe(401);
      expect(forceAddPlayerToMatch).not.toHaveBeenCalled();
    });

    it('refuses a creator who is not an admin', async () => {
      storedMatch = matchCreatedBy(CREATOR);

      const response = await addPlayerAs(CREATOR, { userId: FAMILY._id.toString(), force: true });

      expect(response.status).toBe(403);
      expect(forceAddPlayerToMatch).not.toHaveBeenCalled();
      expect(invitePlayersToMatch).not.toHaveBeenCalled();
    });

    it('refuses a signed-in session whose account no longer exists', async () => {
      const ghost = { ...OWNER, _id: new ObjectId() };

      const response = await addPlayerAs(ghost, { userId: FAMILY._id.toString(), force: true });

      expect(response.status).toBe(403);
      expect(forceAddPlayerToMatch).not.toHaveBeenCalled();
    });

    it("refuses an admin on someone else's match", async () => {
      storedMatch = matchCreatedBy(CREATOR);

      const response = await addPlayerAs(OWNER, { userId: FAMILY._id.toString(), force: true });

      expect(response.status).toBe(403);
      expect(forceAddPlayerToMatch).not.toHaveBeenCalled();
    });

    it('adds the player straight to the roster for an admin creator', async () => {
      const response = await addPlayerAs(OWNER, { userId: FAMILY._id.toString(), force: true });
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body).toMatchObject({ status: 'added', joinedAtRound: 3, version: 5, inviteId: null });
      expect(forceAddPlayerToMatch).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId: MATCH_ID.toString(),
          player: { userId: FAMILY._id.toString(), userName: 'Amma' },
          addedByName: 'Harsh',
        })
      );
      expect(invitePlayersToMatch).not.toHaveBeenCalled();
    });

    it('also works while the match is in progress', async () => {
      storedMatch = matchCreatedBy(OWNER, { roundsPlayed: 5 });

      const response = await addPlayerAs(OWNER, { userId: FAMILY._id.toString(), force: true });

      expect(response.status).toBe(201);
      expect(forceAddPlayerToMatch).toHaveBeenCalledTimes(1);
    });

    it('honours APP_ADMIN_EMAILS over the built-in default', async () => {
      process.env.APP_ADMIN_EMAILS = ' CREATOR@example.com ';
      storedMatch = matchCreatedBy(CREATOR);

      const asCreator = await addPlayerAs(CREATOR, { userId: FAMILY._id.toString(), force: true });
      storedMatch = matchCreatedBy(OWNER);
      const asOwner = await addPlayerAs(OWNER, { userId: FAMILY._id.toString(), force: true });

      expect(asCreator.status).toBe(201);
      expect(asOwner.status).toBe(403);
    });

    it('refuses an ended match', async () => {
      storedMatch = matchCreatedBy(OWNER, { status: 'ended' });

      const response = await addPlayerAs(OWNER, { userId: FAMILY._id.toString(), force: true });

      expect(response.status).toBe(409);
      expect(forceAddPlayerToMatch).not.toHaveBeenCalled();
    });

    it('refuses a player who is already on the roster', async () => {
      const response = await addPlayerAs(OWNER, { userId: OWNER._id.toString(), force: true });

      expect(response.status).toBe(409);
      expect(forceAddPlayerToMatch).not.toHaveBeenCalled();
    });

    it('answers 404 for a user that does not exist', async () => {
      const response = await addPlayerAs(OWNER, { userId: new ObjectId().toString(), force: true });

      expect(response.status).toBe(404);
      expect(forceAddPlayerToMatch).not.toHaveBeenCalled();
    });
  });

  describe('plain invite', () => {
    it('still sends an invite for a non-admin creator', async () => {
      storedMatch = matchCreatedBy(CREATOR);

      const response = await addPlayerAs(CREATOR, { userId: FAMILY._id.toString() });
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body).toMatchObject({ status: 'pending', inviteId: 'invite-1' });
      expect(invitePlayersToMatch).toHaveBeenCalledTimes(1);
      expect(forceAddPlayerToMatch).not.toHaveBeenCalled();
    });

    it('does not force-add for an admin who omits the flag', async () => {
      const response = await addPlayerAs(OWNER, { userId: FAMILY._id.toString() });

      expect(response.status).toBe(201);
      expect(invitePlayersToMatch).toHaveBeenCalledTimes(1);
      expect(forceAddPlayerToMatch).not.toHaveBeenCalled();
    });

    it('does not let a non-creator invite', async () => {
      const response = await addPlayerAs(OTHER, { userId: FAMILY._id.toString() });

      expect(response.status).toBe(403);
      expect(invitePlayersToMatch).not.toHaveBeenCalled();
    });
  });
});
