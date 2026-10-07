import { describe, it, expect } from 'vitest';
import { getRatingTier, formatWinPct } from './ratingTier';

describe('getRatingTier', () => {
  it('maps ratings below 1100 to Bronze', () => {
    expect(getRatingTier(0)).toBe('Bronze');
    expect(getRatingTier(1099)).toBe('Bronze');
  });

  it('switches tier exactly at each threshold', () => {
    expect(getRatingTier(1100)).toBe('Silver');
    expect(getRatingTier(1249)).toBe('Silver');
    expect(getRatingTier(1250)).toBe('Gold');
    expect(getRatingTier(1399)).toBe('Gold');
    expect(getRatingTier(1400)).toBe('Platinum');
    expect(getRatingTier(1549)).toBe('Platinum');
    expect(getRatingTier(1550)).toBe('Diamond');
  });

  it('keeps the starting rating of 1200 in Silver', () => {
    expect(getRatingTier(1200)).toBe('Silver');
  });

  it('keeps very high ratings in Diamond', () => {
    expect(getRatingTier(2400)).toBe('Diamond');
  });
});

describe('formatWinPct', () => {
  it('rounds a 0..1 ratio to a whole percent', () => {
    expect(formatWinPct(0)).toBe('0%');
    expect(formatWinPct(0.456)).toBe('46%');
    expect(formatWinPct(1)).toBe('100%');
  });
});
