import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

const findOneMatch = vi.fn();
const updateOne = vi.fn();
const insertMany = vi.fn();
const notifyRoundScored = vi.fn();
const onRoundsChanged = vi.fn();

vi.mock('@/lib/db/collections', () => ({
  getMatches: async () => ({ findOne: findOneMatch, updateOne }),
  getScores: async () => ({ insertMany, find: () => ({ toArray: async () => [] }) }),
  getUsers: async () => ({}),
  getFriendships: async () => ({}),
}));
vi.mock('@/lib/db/client', () => ({ withTransaction: async (work: (session: undefined) => Promise<void>) => work(undefined) }));
vi.mock('@/lib/events/matchEvents', () => ({
  onRoundsChanged: (matchId: string) => onRoundsChanged(matchId),
  onMatchEnded: vi.fn(async () => undefined),
}));
vi.mock('@/lib/notifications/roundScored', () => ({
  notifyRoundScored: (input: unknown) => notifyRoundScored(input),
}));
vi.mock('@/lib/notifications/create', () => ({ notifyUsers: vi.fn(async () => undefined) }));
vi.mock('@/lib/domain/matchInvites', () => ({ invitePlayersToMatch: vi.fn(async () => []) }));
vi.mock('@/lib/stats/winProbability', () => ({ computeWinForecast: vi.fn(async () => null) }));
vi.mock('@/lib/logger', () => ({ logError: vi.fn() }));

const { submitRound, MatchServiceError } = await import('./service');

const CREATOR = 'a'.repeat(24);
const SECOND = 'b'.repeat(24);
const THIRD = 'c'.repeat(24);
const STRANGER = 'd'.repeat(24);
const MATCH_ID = '64b000000000000000000001';

function rosterEntry(userId: string, status: 'active' | 'dnf' = 'active') {
  return { userId, userName: userId.slice(0, 4), joinedAtRound: 1, status, dnfAfterRound: null, order: 0 };
}

function matchDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: new ObjectId(MATCH_ID),
    name: 'Friday night',
    creatorId: CREATOR,
    roster: [rosterEntry(CREATOR), rosterEntry(SECOND), rosterEntry(THIRD)],
    roundsPlayed: 2,
    version: 5,
    deletedAt: null,
    status: 'active',
    ...overrides,
  };
}

function allScores(playerIds: string[]) {
  return playerIds.map((playerId) => ({ playerId, value: 10 }));
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  throw new Error('expected the call to reject');
}

describe('submitRound', () => {
  beforeEach(() => {
    findOneMatch.mockReset();
    updateOne.mockReset();
    insertMany.mockReset();
    onRoundsChanged.mockReset().mockResolvedValue(undefined);
    notifyRoundScored.mockReset().mockResolvedValue(undefined);
    findOneMatch.mockResolvedValue(matchDoc());
  });

  it('rejects a round where an active player has no score', async () => {
    const err = await rejection(
      submitRound({ matchId: MATCH_ID, userId: CREATOR, scores: allScores([CREATOR, SECOND]) })
    );
    expect(err).toBeInstanceOf(MatchServiceError);
    expect(err).toMatchObject({ status: 400, code: 'INCOMPLETE_SCORES' });
    expect(insertMany).not.toHaveBeenCalled();
    expect(onRoundsChanged).not.toHaveBeenCalled();
  });

  it('rejects a score for someone who is not an active player', async () => {
    const err = await rejection(
      submitRound({
        matchId: MATCH_ID,
        userId: CREATOR,
        scores: allScores([CREATOR, SECOND, THIRD, STRANGER]),
      })
    );
    expect(err).toMatchObject({ status: 400, code: 'INVALID_PLAYERS' });
    expect(insertMany).not.toHaveBeenCalled();
  });

  it('rejects a player who dropped out of the match', async () => {
    findOneMatch.mockResolvedValue(matchDoc({ roster: [rosterEntry(CREATOR), rosterEntry(SECOND), rosterEntry(THIRD, 'dnf')] }));
    const err = await rejection(
      submitRound({ matchId: MATCH_ID, userId: CREATOR, scores: allScores([CREATOR, SECOND, THIRD]) })
    );
    expect(err).toMatchObject({ status: 400, code: 'INVALID_PLAYERS' });
  });

  it('refuses a round in a match that has fewer than two active players', async () => {
    findOneMatch.mockResolvedValue(matchDoc({ roster: [rosterEntry(CREATOR)] }));
    const err = await rejection(
      submitRound({ matchId: MATCH_ID, userId: CREATOR, scores: allScores([CREATOR]) })
    );
    expect(err).toMatchObject({ status: 409, code: 'NOT_ENOUGH_PLAYERS' });
  });

  it('refuses anyone but the creator', async () => {
    const err = await rejection(
      submitRound({ matchId: MATCH_ID, userId: SECOND, scores: allScores([CREATOR, SECOND, THIRD]) })
    );
    expect(err).toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  it('appends the next round, bumps the version and recomputes standings', async () => {
    const result = await submitRound({
      matchId: MATCH_ID,
      userId: CREATOR,
      scores: allScores([CREATOR, SECOND, THIRD]),
    });

    expect(result).toEqual({ matchId: MATCH_ID, round: 3, scoreCount: 3, version: 6 });
    expect(insertMany.mock.calls[0][0][0]).toMatchObject({ matchId: MATCH_ID, round: 3, enteredBy: CREATOR });
    expect(updateOne.mock.calls[0][1]).toMatchObject({ $set: { roundsPlayed: 3 }, $inc: { version: 1 } });
    expect(notifyRoundScored).toHaveBeenCalledWith(expect.objectContaining({ round: 3, scoredBy: CREATOR }));
    expect(onRoundsChanged).toHaveBeenCalledWith(MATCH_ID);
  });
});
