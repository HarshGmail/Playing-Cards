import { describe, it, expect } from 'vitest';
import { gameDisplayName, rulesPathFor, toGameType } from './catalog';

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
  });
});
