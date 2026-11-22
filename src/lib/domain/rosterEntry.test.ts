import { describe, it, expect } from 'vitest';
import type { RosterEntry } from '@/lib/db/collections';
import { buildRosterEntry, decideDirectAdd } from './rosterEntry';

function entry(userId: string, order: number): RosterEntry {
  return { userId, userName: userId, joinedAtRound: 1, status: 'active', dnfAfterRound: null, order };
}

const PLAYER = { userId: 'new', userName: 'New Player' };

describe('buildRosterEntry', () => {
  it('joins an unstarted match at round one at the end of the roster', () => {
    const match = { roster: [entry('a', 0), entry('b', 1)], roundsPlayed: 0 };
    expect(buildRosterEntry(match, PLAYER)).toEqual({
      userId: 'new',
      userName: 'New Player',
      joinedAtRound: 1,
      status: 'active',
      dnfAfterRound: null,
      order: 2,
    });
  });

  it('joins a match in progress at the next round to be played', () => {
    const match = { roster: [entry('a', 0)], roundsPlayed: 3 };
    expect(buildRosterEntry(match, PLAYER).joinedAtRound).toBe(4);
  });
});

describe('decideDirectAdd', () => {
  const active = { roster: [entry('a', 0)], status: 'active' as const };

  it('allows adding a player who is not on the roster', () => {
    expect(decideDirectAdd(active, 'new')).toBe('add');
  });

  it('refuses an ended match', () => {
    expect(decideDirectAdd({ ...active, status: 'ended' }, 'new')).toBe('match-ended');
  });

  it('reports a player who is already on the roster', () => {
    expect(decideDirectAdd(active, 'a')).toBe('already-in-match');
  });

  it('reports an ended match before an existing roster member', () => {
    expect(decideDirectAdd({ ...active, status: 'ended' }, 'a')).toBe('match-ended');
  });
});
