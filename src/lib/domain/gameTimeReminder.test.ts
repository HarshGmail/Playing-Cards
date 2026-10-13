import { describe, it, expect } from 'vitest';
import {
  GAME_TIME_MESSAGES,
  gameTimeMessageFor,
  inactiveSince,
  INACTIVITY_WINDOW_MS,
  usersToRemind,
} from './gameTimeReminder';

describe('usersToRemind', () => {
  it('keeps only users with no recent activity, in their original order', () => {
    expect(usersToRemind(['a', 'b', 'c', 'd'], new Set(['b', 'd']))).toEqual(['a', 'c']);
  });

  it('reminds everyone when nobody played', () => {
    expect(usersToRemind(['a', 'b'], [])).toEqual(['a', 'b']);
  });
});

describe('inactiveSince', () => {
  it('looks back exactly one day', () => {
    const now = new Date('2026-10-13T16:00:00Z');
    expect(now.getTime() - inactiveSince(now).getTime()).toBe(INACTIVITY_WINDOW_MS);
  });
});

describe('gameTimeMessageFor', () => {
  it('rotates through the messages one per day', () => {
    const day = new Date('2026-10-13T16:00:00Z');
    const nextDay = new Date(day.getTime() + INACTIVITY_WINDOW_MS);
    expect(GAME_TIME_MESSAGES).toContain(gameTimeMessageFor(day));
    expect(gameTimeMessageFor(nextDay)).not.toBe(gameTimeMessageFor(day));
  });
});
