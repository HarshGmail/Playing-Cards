import { describe, it, expect, vi, beforeEach } from 'vitest';

const findUsersByUsername = vi.fn();
const getActiveRoster = vi.fn();
const submitRound = vi.fn();
const getMatchStandings = vi.fn();

vi.mock('@/lib/matches/service', () => ({
  createMatch: vi.fn(),
  endMatch: vi.fn(),
  findUsersByUsername: (usernames: string[]) => findUsersByUsername(usernames),
  getActiveRoster: (matchId: string, userId: string) => getActiveRoster(matchId, userId),
  getMatchStandings: (input: unknown) => getMatchStandings(input),
  listFriends: vi.fn(),
  listUserMatches: vi.fn(),
  submitRound: (input: unknown) => submitRound(input),
}));

const { mcpTools, McpToolError } = await import('./tools');

const CONTEXT = { userId: 'creator-id', origin: 'https://app.test' };
const alice = { userId: 'alice-id', username: 'alice', name: 'Alice' };
const bob = { userId: 'bob-id', username: 'bob', name: 'Bob' };

describe('add_round', () => {
  beforeEach(() => {
    findUsersByUsername.mockReset();
    getActiveRoster.mockReset();
    submitRound.mockReset();
    getMatchStandings.mockReset();
  });

  it('refuses a username that is not a Playing Cards user', async () => {
    findUsersByUsername.mockResolvedValue([alice]);

    const call = mcpTools.add_round.handler(CONTEXT, {
      match_id: 'm1',
      scores: { alice: 10, ghost: 12 },
    });

    await expect(call).rejects.toBeInstanceOf(McpToolError);
    await expect(call).rejects.toThrow('Unknown username: ghost');
    expect(submitRound).not.toHaveBeenCalled();
  });

  it('names the active player who has no score and submits nothing', async () => {
    findUsersByUsername.mockResolvedValue([alice]);
    getActiveRoster.mockResolvedValue([alice, bob]);

    const call = mcpTools.add_round.handler(CONTEXT, {
      match_id: 'm1',
      scores: { alice: 10 },
    });

    await expect(call).rejects.toThrow('Missing a score for: bob');
    expect(submitRound).not.toHaveBeenCalled();
  });

  it('matches usernames regardless of case and surrounding spaces', async () => {
    findUsersByUsername.mockResolvedValue([alice, bob]);
    getActiveRoster.mockResolvedValue([alice, bob]);
    submitRound.mockResolvedValue({ matchId: 'm1', round: 4, scoreCount: 2, version: 9 });
    getMatchStandings.mockResolvedValue({ id: 'm1', standings: [] });

    await mcpTools.add_round.handler(CONTEXT, {
      match_id: 'm1',
      scores: { ' Alice ': 7, BOB: 20 },
    });

    expect(findUsersByUsername).toHaveBeenCalledWith(['alice', 'bob']);
    expect(submitRound).toHaveBeenCalledWith({
      matchId: 'm1',
      userId: 'creator-id',
      scores: [
        { playerId: 'alice-id', value: 7 },
        { playerId: 'bob-id', value: 20 },
      ],
    });
  });

  it('returns the round number and the current standings', async () => {
    findUsersByUsername.mockResolvedValue([alice, bob]);
    getActiveRoster.mockResolvedValue([alice, bob]);
    submitRound.mockResolvedValue({ matchId: 'm1', round: 4, scoreCount: 2, version: 9 });
    getMatchStandings.mockResolvedValue({
      id: 'm1',
      standings: [
        { position: 1, player: alice, total: 30, gamesWon: 2, roundsPlayed: 4, isDnf: false },
        { position: 2, player: bob, total: 41, gamesWon: 1, roundsPlayed: 4, isDnf: false },
      ],
    });

    const result = await mcpTools.add_round.handler(CONTEXT, {
      match_id: 'm1',
      scores: { alice: 7, bob: 20 },
    });

    expect(result).toEqual({
      match_id: 'm1',
      round: 4,
      standings: [
        { position: 1, username: 'alice', name: 'Alice', total: 30, games_won: 2, rounds_played: 4, dnf: false },
        { position: 2, username: 'bob', name: 'Bob', total: 41, games_won: 1, rounds_played: 4, dnf: false },
      ],
    });
  });
});
