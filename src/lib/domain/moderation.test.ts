import { describe, it, expect } from 'vitest';
import { isModerator, MODERATOR_USERNAME } from './moderation';

describe('isModerator', () => {
  it('recognises the moderator account', () => {
    expect(isModerator(MODERATOR_USERNAME)).toBe(true);
    expect(isModerator('destructor_harsh')).toBe(true);
  });

  it('rejects every other account', () => {
    expect(isModerator('harsh')).toBe(false);
    expect(isModerator('destructor_harsh2')).toBe(false);
    expect(isModerator(' destructor_harsh')).toBe(false);
  });

  it('is case-sensitive, since stored usernames are lowercase', () => {
    expect(isModerator('Destructor_Harsh')).toBe(false);
  });

  it('rejects a missing username', () => {
    expect(isModerator(undefined)).toBe(false);
    expect(isModerator(null)).toBe(false);
    expect(isModerator('')).toBe(false);
  });
});
