import { describe, it, expect } from 'vitest';
import { gameDisplayName, isLeastShowdown, ratingGameFor, rulesPathFor, toGameType } from './catalog';

describe('toGameType', () => {
  it('passes through known game types', () => {
    expect(toGameType('least-count')).toBe('least-count');
    expect(toGameType('other')).toBe('other');
  });

  it('resolves matches created before the field existed to least-count', () => {
    // Every match created before gameType was introduced was Least Count, so an
    // absent value must not read as unknown.
    expect(toGameType(undefined)).toBe('least-count');
    expect(toGameType(null)).toBe('least-count');
  });

  it('resolves unrecognised values rather than trusting them', () => {
    expect(toGameType('rummy')).toBe('least-count');
    expect(toGameType(42)).toBe('least-count');
  });
});

describe('gameDisplayName', () => {
  it('uses the catalog label for known games and ignores any stray label', () => {
    expect(gameDisplayName('least-count')).toBe('Least Count');
    expect(gameDisplayName('least-count', 'Bluff')).toBe('Least Count');
  });

  it("uses the free-text label for 'other'", () => {
    expect(gameDisplayName('other', 'Teen Patti')).toBe('Teen Patti');
  });

  it("falls back to 'Other' when the label is missing or blank", () => {
    expect(gameDisplayName('other')).toBe('Other');
    expect(gameDisplayName('other', null)).toBe('Other');
    expect(gameDisplayName('other', '   ')).toBe('Other');
  });

  it('names legacy matches Least Count', () => {
    expect(gameDisplayName(undefined)).toBe('Least Count');
  });
});

describe('rulesPathFor', () => {
  it('links documented games to their rules page', () => {
    expect(rulesPathFor('least-count')).toBe('/rules/least-count');
    expect(rulesPathFor(undefined)).toBe('/rules/least-count');
  });

  it('has no rules page for an unspecified game', () => {
    expect(rulesPathFor('other')).toBeNull();
    expect(rulesPathFor('other', 'Exploding Kittens')).toBeNull();
  });

  it('links a named variant typed as Other to its own rules', () => {
    expect(rulesPathFor('other', 'Least Showdown')).toBe('/rules/least-showdown');
    expect(rulesPathFor('other', '  least showdown ')).toBe('/rules/least-showdown');
  });
});

describe('isLeastShowdown', () => {
  it('recognises the Least Showdown label regardless of spacing or case', () => {
    expect(isLeastShowdown('other', 'Least Showdown')).toBe(true);
    expect(isLeastShowdown('other', 'LEAST  SHOWDOWN')).toBe(true);
    expect(isLeastShowdown('least-count')).toBe(false);
    expect(isLeastShowdown('other', 'Least Count')).toBe(false);
  });
});

describe('ratingGameFor', () => {
  it('rates catalog games under their type', () => {
    expect(ratingGameFor('least-count')).toEqual({ key: 'least-count', name: 'Least Count' });
    expect(ratingGameFor(undefined)).toEqual({ key: 'least-count', name: 'Least Count' });
  });

  it('gives each named other game its own key, ignoring case and spacing', () => {
    expect(ratingGameFor('other', 'Exploding Kittens')).toEqual({
      key: 'exploding-kittens',
      name: 'Exploding Kittens',
    });
    expect(ratingGameFor('other', '  exploding   KITTENS! ').key).toBe('exploding-kittens');
  });

  it('falls back to a shared key when an other game has no usable name', () => {
    expect(ratingGameFor('other', null).key).toBe('other');
    expect(ratingGameFor('other', '???').key).toBe('other');
  });
});
