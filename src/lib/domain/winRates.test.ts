import { describe, it, expect } from 'vitest';
import { formatStrikeRate, matchWinRate, strikeRate } from './winRates';

describe('matchWinRate', () => {
  it('divides match wins by matches played', () => {
    expect(matchWinRate(3, 12)).toBe(0.25);
  });

  it('is zero before any match is played', () => {
    expect(matchWinRate(0, 0)).toBe(0);
  });
});

describe('strikeRate', () => {
  it('divides rounds won by rounds played', () => {
    expect(strikeRate(7, 20)).toBe(0.35);
  });

  it('is zero before any round is played', () => {
    expect(strikeRate(0, 0)).toBe(0);
  });
});

describe('formatStrikeRate', () => {
  it('shows one decimal place of the percentage', () => {
    expect(formatStrikeRate(0.3456)).toBe('34.6');
    expect(formatStrikeRate(0)).toBe('0.0');
  });
});
