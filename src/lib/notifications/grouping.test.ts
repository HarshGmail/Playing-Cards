import { describe, it, expect } from 'vitest';
import { groupByRecency, formatRelativeTime } from './grouping';

const now = new Date(2026, 9, 7, 15, 0, 0);

describe('groupByRecency', () => {
  it('splits items into today and earlier', () => {
    const items = [
      { id: 'a', createdAt: new Date(2026, 9, 7, 9, 0, 0).toISOString() },
      { id: 'b', createdAt: new Date(2026, 9, 6, 23, 59, 0).toISOString() },
      { id: 'c', createdAt: new Date(2026, 9, 1, 12, 0, 0).toISOString() },
    ];
    const groups = groupByRecency(items, now);
    expect(groups.today.map((i) => i.id)).toEqual(['a']);
    expect(groups.earlier.map((i) => i.id)).toEqual(['b', 'c']);
  });
});

describe('formatRelativeTime', () => {
  it('uses the largest sensible unit', () => {
    expect(formatRelativeTime(new Date(2026, 9, 7, 14, 59, 40), now)).toBe('Just now');
    expect(formatRelativeTime(new Date(2026, 9, 7, 14, 30, 0), now)).toBe('30m ago');
    expect(formatRelativeTime(new Date(2026, 9, 7, 12, 0, 0), now)).toBe('3h ago');
    expect(formatRelativeTime(new Date(2026, 9, 5, 15, 0, 0), now)).toBe('2d ago');
  });
});
