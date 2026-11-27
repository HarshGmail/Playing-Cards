import { describe, it, expect } from 'vitest';
import { isFriendOfParticipant, isMatchParticipant } from './matchAccess';

const match = {
  creatorId: 'creator',
  roster: [{ userId: 'player', userName: 'P', joinedAtRound: 1, status: 'active' as const, dnfAfterRound: null, order: 0 }],
  spectators: [{ userId: 'watcher', userName: 'W', }],
};

describe('match access', () => {
  it('lets the creator, players and spectators in', () => {
    for (const userId of ['creator', 'player', 'watcher']) expect(isMatchParticipant(match, userId)).toBe(true);
    expect(isMatchParticipant(match, 'stranger')).toBe(false);
  });

  it("lets friends of the creator or a player watch, but not friends of a spectator", () => {
    expect(isFriendOfParticipant(match, ['player'])).toBe(true);
    expect(isFriendOfParticipant(match, ['creator'])).toBe(true);
    expect(isFriendOfParticipant(match, ['watcher'])).toBe(false);
    expect(isFriendOfParticipant(match, [])).toBe(false);
  });
});
