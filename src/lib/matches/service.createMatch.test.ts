import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

const insertOne = vi.fn();
const invitePlayersToMatch = vi.fn();
const notifyUsers = vi.fn();

const CREATOR = new ObjectId();
const FRIEND = new ObjectId();
const SECOND_FRIEND = new ObjectId();
const SPECTATOR = new ObjectId();

const users = [CREATOR, FRIEND, SECOND_FRIEND, SPECTATOR].map((_id, index) => ({
  _id,
  name: ['Harsh', 'Amma', 'Nanna', 'Cousin'][index],
}));

vi.mock('@/lib/db/collections', () => ({
  getMatches: async () => ({ insertOne }),
  getScores: async () => ({}),
  getUsers: async () => ({
    find: (filter: { _id: { $in: ObjectId[] } }) => ({
      toArray: async () => users.filter((user) => filter._id.$in.some((id) => id.equals(user._id))),
    }),
  }),
  getFriendships: async () => ({}),
}));
vi.mock('@/lib/db/client', () => ({ withTransaction: vi.fn() }));
vi.mock('@/lib/events/matchEvents', () => ({ onRoundsChanged: vi.fn(), onMatchEnded: vi.fn() }));
vi.mock('@/lib/notifications/roundScored', () => ({ notifyRoundScored: vi.fn() }));
vi.mock('@/lib/notifications/create', () => ({
  notifyUsers: (ids: string[], type: string, payload: unknown) => notifyUsers(ids, type, payload),
}));
vi.mock('@/lib/domain/matchInvites', () => ({
  invitePlayersToMatch: (args: unknown) => invitePlayersToMatch(args),
}));
vi.mock('@/lib/stats/winProbability', () => ({ computeWinForecast: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logError: vi.fn() }));

const { createMatch, MatchServiceError } = await import('./service');
const { createMatchSchema } = await import('@/lib/schemas/match');

function input(overrides: Record<string, unknown> = {}) {
  return createMatchSchema.parse({
    name: 'Family night',
    creatorRole: 'score-and-play',
    rankPreference: 'lowest-first',
    tiebreakers: ['a', 'b', 'c'],
    players: [FRIEND.toString(), SECOND_FRIEND.toString()],
    ...overrides,
  });
}

describe('createMatch', () => {
  beforeEach(() => {
    insertOne.mockReset().mockResolvedValue({ insertedId: new ObjectId() });
    invitePlayersToMatch.mockReset().mockResolvedValue([{ inviteId: 'i1', userId: FRIEND.toString() }]);
    notifyUsers.mockReset().mockResolvedValue(undefined);
  });

  it('invites players by default and leaves them off the roster', async () => {
    const created = await createMatch(CREATOR.toString(), input());

    expect(insertOne.mock.calls[0][0].roster).toHaveLength(1);
    expect(invitePlayersToMatch).toHaveBeenCalledTimes(1);
    expect(created).toMatchObject({ invitedCount: 1, addedDirectlyCount: 0 });
  });

  it('refuses addDirectly unless the caller is allowed', async () => {
    try {
      await createMatch(CREATOR.toString(), input({ addDirectly: true }));
      throw new Error('expected rejection');
    } catch (err) {
      expect(err).toBeInstanceOf(MatchServiceError);
      expect(err).toMatchObject({ status: 403 });
    }
    expect(insertOne).not.toHaveBeenCalled();
    expect(invitePlayersToMatch).not.toHaveBeenCalled();
  });

  it('refuses addDirectly when permission is explicitly withheld', async () => {
    await expect(
      createMatch(CREATOR.toString(), input({ addDirectly: true }), { canAddDirectly: false })
    ).rejects.toMatchObject({ status: 403 });
  });

  it('puts every player on the roster at round one when an admin adds directly', async () => {
    const created = await createMatch(CREATOR.toString(), input({ addDirectly: true }), {
      canAddDirectly: true,
    });

    const { roster } = insertOne.mock.calls[0][0];
    expect(roster.map((entry: { userId: string; userName: string; order: number; joinedAtRound: number; status: string }) => entry)).toEqual([
      expect.objectContaining({ userId: CREATOR.toString(), order: 0 }),
      { userId: FRIEND.toString(), userName: 'Amma', joinedAtRound: 1, status: 'active', dnfAfterRound: null, order: 1 },
      { userId: SECOND_FRIEND.toString(), userName: 'Nanna', joinedAtRound: 1, status: 'active', dnfAfterRound: null, order: 2 },
    ]);
    expect(invitePlayersToMatch).not.toHaveBeenCalled();
    expect(created).toMatchObject({ invitedCount: 0, addedDirectlyCount: 2 });
  });

  it('tells directly added players who added them and skips spectators', async () => {
    await createMatch(
      CREATOR.toString(),
      input({ addDirectly: true, spectatorIds: [SPECTATOR.toString()] }),
      { canAddDirectly: true }
    );

    expect(notifyUsers).toHaveBeenCalledWith(
      [FRIEND.toString(), SECOND_FRIEND.toString()],
      'added-to-match',
      expect.objectContaining({ role: 'player', invitedByName: 'Harsh' })
    );
    expect(notifyUsers).toHaveBeenCalledWith(
      [SPECTATOR.toString()],
      'added-to-match',
      expect.objectContaining({ role: 'spectator' })
    );
  });

  it('defaults addDirectly to false when the client omits it', () => {
    expect(input().addDirectly).toBe(false);
  });
});
