import { describe, it, expect } from 'vitest';
import { formatNotification, formatRatingDelta } from './format';

describe('formatNotification', () => {
  it('formats a match win with rating delta and a celebrate link', () => {
    const result = formatNotification({
      type: 'match-won',
      payload: { matchId: 'm1', matchName: 'Friday Night', ratingDelta: 12 },
    });
    expect(result.body).toBe('You won Friday Night! 🏆 +12 rating');
    expect(result.url).toBe('/matches/m1?celebrate=1');
  });

  it('links a friend request to the sender profile', () => {
    const result = formatNotification({
      type: 'friend-request',
      payload: { fromUserName: 'Asha Rao', fromUsername: 'asha' },
    });
    expect(result.body).toBe('Asha Rao sent you a friend request');
    expect(result.url).toBe('/profile/asha');
  });

  it('links an accepted request to the new friend profile', () => {
    const result = formatNotification({
      type: 'friend-accepted',
      payload: { toUserName: 'Ben', toUsername: 'ben' },
    });
    expect(result.body).toBe('Ben accepted your friend request');
    expect(result.url).toBe('/profile/ben');
  });

  it('falls back to your own profile when the handle is missing', () => {
    const result = formatNotification({ type: 'friend-accepted', payload: {} });
    expect(result.url).toBe('/profile');
  });

  it('omits the rating when the delta is null', () => {
    const result = formatNotification({
      type: 'match-won',
      payload: { matchId: 'm1', matchName: 'Friday Night', ratingDelta: null },
    });
    expect(result.body).toBe('You won Friday Night! 🏆');
  });

  it('keeps the invite on the notifications page because the invitee cannot open the match', () => {
    const result = formatNotification({
      type: 'match-invite',
      payload: { matchId: 'm1', matchName: 'Friday Night', invitedByName: 'Asha' },
    });
    expect(result.body).toBe('Asha invited you to play Friday Night');
    expect(result.url).toBe('/notifications');
  });

  it('formats a scored round with the player score', () => {
    const result = formatNotification({
      type: 'round-scored',
      payload: {
        matchId: 'm1',
        matchName: 'Friday Night',
        round: 3,
        edited: false,
        scoredByName: 'Ravi',
        yourScore: 14,
      },
    });
    expect(result.title).toBe('Round 3 scored');
    expect(result.body).toBe('Ravi scored round 3 in Friday Night — you got 14');
    expect(result.url).toBe('/matches/m1');
  });

  it('marks corrected rounds and tolerates a missing score', () => {
    const result = formatNotification({
      type: 'round-scored',
      payload: { matchId: 'm1', matchName: 'Friday Night', round: 2, edited: true, yourScore: null },
    });
    expect(result.title).toBe('Round 2 corrected');
    expect(result.body).toBe('The scorer corrected round 2 in Friday Night');
  });

  it('describes spectators differently from players', () => {
    const spectator = formatNotification({
      type: 'added-to-match',
      payload: { matchId: 'm1', matchName: 'Friday Night', role: 'spectator', invitedByName: 'Asha' },
    });
    expect(spectator.body).toBe('Asha added you as a spectator of Friday Night');
  });

  it('falls back for unknown types', () => {
    expect(formatNotification({ type: 'something-new', payload: {} })).toEqual({
      title: 'Notification',
      body: 'New notification',
      url: '/notifications',
    });
  });
});

describe('formatRatingDelta', () => {
  it('signs positive deltas and rounds', () => {
    expect(formatRatingDelta(7.4)).toBe('+7 rating');
    expect(formatRatingDelta(-5)).toBe('-5 rating');
  });

  it('returns an empty string for non-numbers', () => {
    expect(formatRatingDelta(null)).toBe('');
    expect(formatRatingDelta(undefined)).toBe('');
  });
});
