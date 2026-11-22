import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

const matchUpdateOne = vi.fn();
const inviteUpdateMany = vi.fn();
const notifyUser = vi.fn();
const logError = vi.fn();

vi.mock('@/lib/db/collections', () => ({
  getMatches: async () => ({ updateOne: matchUpdateOne }),
  getMatchInvites: async () => ({ updateMany: inviteUpdateMany }),
}));
vi.mock('@/lib/db/client', () => ({
  withTransaction: async (work: (session: string) => Promise<void>) => work('session'),
}));
vi.mock('@/lib/notifications/create', () => ({
  notifyMany: vi.fn(),
  notifyUser: (userId: string, type: string, payload: unknown) => notifyUser(userId, type, payload),
}));
vi.mock('@/lib/logger', () => ({ logError: (...args: unknown[]) => logError(...args) }));

const { forceAddPlayerToMatch, rosterPlayerAndAcceptInvites } = await import('./matchInvites');

const MATCH_ID = '64b000000000000000000001';
const PLAYER_ID = 'b'.repeat(24);

function rosterEntry(userId: string, order: number) {
  return { userId, userName: userId, joinedAtRound: 1, status: 'active' as const, dnfAfterRound: null, order };
}

const matchInProgress = {
  name: 'Friday night',
  roster: [rosterEntry('a'.repeat(24), 0), rosterEntry('c'.repeat(24), 1)],
  roundsPlayed: 3,
  version: 7,
};

describe('rosterPlayerAndAcceptInvites', () => {
  beforeEach(() => {
    matchUpdateOne.mockReset();
    inviteUpdateMany.mockReset();
  });

  it('pushes a roster entry for the next round and bumps the version in the same session', async () => {
    const respondedAt = new Date('2026-01-01T00:00:00Z');

    const result = await rosterPlayerAndAcceptInvites({
      matchId: MATCH_ID,
      match: matchInProgress,
      player: { userId: PLAYER_ID, userName: 'Asha' },
      inviteFilter: { matchId: MATCH_ID, userId: PLAYER_ID },
      respondedAt,
    });

    expect(result).toEqual({ joinedAtRound: 4, version: 8 });
    const [filter, update, options] = matchUpdateOne.mock.calls[0];
    expect(filter).toEqual({ _id: new ObjectId(MATCH_ID), 'roster.userId': { $ne: PLAYER_ID } });
    expect(update).toEqual({
      $push: {
        roster: {
          userId: PLAYER_ID,
          userName: 'Asha',
          joinedAtRound: 4,
          status: 'active',
          dnfAfterRound: null,
          order: 2,
        },
      },
      $inc: { version: 1 },
    });
    expect(options).toEqual({ session: 'session' });
  });

  it('marks only pending invites matching the filter as accepted', async () => {
    const respondedAt = new Date('2026-01-01T00:00:00Z');

    await rosterPlayerAndAcceptInvites({
      matchId: MATCH_ID,
      match: matchInProgress,
      player: { userId: PLAYER_ID, userName: 'Asha' },
      inviteFilter: { matchId: MATCH_ID, userId: PLAYER_ID },
      respondedAt,
    });

    expect(inviteUpdateMany).toHaveBeenCalledWith(
      { matchId: MATCH_ID, userId: PLAYER_ID, status: 'pending' },
      { $set: { status: 'accepted', respondedAt } },
      { session: 'session' }
    );
  });
});

describe('forceAddPlayerToMatch', () => {
  beforeEach(() => {
    matchUpdateOne.mockReset();
    inviteUpdateMany.mockReset();
    notifyUser.mockReset().mockResolvedValue(undefined);
    logError.mockReset();
  });

  it('rosters the player, settles their pending invite and tells them who added them', async () => {
    const result = await forceAddPlayerToMatch({
      matchId: MATCH_ID,
      match: matchInProgress,
      player: { userId: PLAYER_ID, userName: 'Asha' },
      addedByName: 'Harsh',
    });

    expect(result).toEqual({ joinedAtRound: 4, version: 8 });
    expect(matchUpdateOne).toHaveBeenCalledTimes(1);
    expect(inviteUpdateMany.mock.calls[0][0]).toEqual({
      matchId: MATCH_ID,
      userId: PLAYER_ID,
      status: 'pending',
    });
    expect(notifyUser).toHaveBeenCalledWith(PLAYER_ID, 'added-to-match', {
      matchId: MATCH_ID,
      matchName: 'Friday night',
      role: 'player',
      invitedByName: 'Harsh',
    });
  });

  it('still succeeds when the notification cannot be sent', async () => {
    notifyUser.mockRejectedValue(new Error('push down'));

    const result = await forceAddPlayerToMatch({
      matchId: MATCH_ID,
      match: matchInProgress,
      player: { userId: PLAYER_ID, userName: 'Asha' },
      addedByName: 'Harsh',
    });

    expect(result.joinedAtRound).toBe(4);
    expect(logError).toHaveBeenCalled();
  });
});
