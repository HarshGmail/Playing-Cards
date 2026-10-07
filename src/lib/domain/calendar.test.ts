import { describe, it, expect } from 'vitest';
import {
  addMonths,
  bucketMatchesByDay,
  daysInRange,
  dayKey,
  describeMatchStanding,
  formatViewTitle,
  getViewRange,
  isCalendarView,
  layoutDayTimeline,
  matchTimeSpan,
  paginate,
  shiftAnchor,
  sortNewestFirst,
  startOfWeek,
} from './calendar';

const at = (year: number, month: number, day: number, hour = 0, minute = 0) =>
  new Date(year, month - 1, day, hour, minute);

describe('getViewRange', () => {
  it('builds a Monday-first month grid including leading and trailing days', () => {
    const range = getViewRange('month', at(2026, 10, 15));
    expect(range).not.toBeNull();
    expect(range!.from).toEqual(at(2026, 9, 28));
    expect(range!.to).toEqual(at(2026, 11, 2));
    expect(daysInRange(range!)).toHaveLength(35);
    expect(range!.from.getDay()).toBe(1);
  });

  it('covers six weeks when the month needs them', () => {
    const range = getViewRange('month', at(2026, 3, 10))!;
    expect(range.from).toEqual(at(2026, 2, 23));
    expect(daysInRange(range)).toHaveLength(42);
  });

  it('returns Monday to next Monday for a week', () => {
    const range = getViewRange('week', at(2026, 10, 11, 15))!;
    expect(range.from).toEqual(at(2026, 10, 5));
    expect(range.to).toEqual(at(2026, 10, 12));
  });

  it('returns a single day and nothing for list', () => {
    expect(getViewRange('day', at(2026, 10, 7, 13))).toEqual({
      from: at(2026, 10, 7),
      to: at(2026, 10, 8),
    });
    expect(getViewRange('list', at(2026, 10, 7))).toBeNull();
  });
});

describe('navigation helpers', () => {
  it('treats Sunday as the end of the week', () => {
    expect(startOfWeek(at(2026, 10, 11))).toEqual(at(2026, 10, 5));
    expect(startOfWeek(at(2026, 10, 5))).toEqual(at(2026, 10, 5));
  });

  it('clamps day when shifting months', () => {
    expect(addMonths(at(2026, 1, 31), 1)).toEqual(at(2026, 2, 28));
    expect(addMonths(at(2026, 1, 15), -1)).toEqual(at(2025, 12, 15));
  });

  it('shifts by the view unit', () => {
    const anchor = at(2026, 10, 7);
    expect(shiftAnchor('day', anchor, 1)).toEqual(at(2026, 10, 8));
    expect(shiftAnchor('week', anchor, -1)).toEqual(at(2026, 9, 30));
    expect(shiftAnchor('month', anchor, 1)).toEqual(at(2026, 11, 7));
    expect(shiftAnchor('list', anchor, 1)).toEqual(anchor);
  });

  it('formats titles', () => {
    expect(formatViewTitle('month', at(2026, 10, 7), 'en-US')).toBe('October 2026');
    expect(formatViewTitle('week', at(2026, 10, 7), 'en-US')).toBe('Oct 5 – 11, 2026');
    expect(formatViewTitle('week', at(2026, 9, 30), 'en-US')).toBe('Sep 28 – Oct 4, 2026');
    expect(formatViewTitle('list', at(2026, 10, 7))).toBe('All matches');
  });

  it('validates stored views', () => {
    expect(isCalendarView('week')).toBe(true);
    expect(isCalendarView('year')).toBe(false);
    expect(isCalendarView(null)).toBe(false);
  });
});

describe('matchTimeSpan', () => {
  const now = at(2026, 10, 7, 12);

  it('runs active matches until now', () => {
    const span = matchTimeSpan(
      { id: 'a', status: 'active', createdAt: at(2026, 10, 7, 10).toISOString() },
      now
    );
    expect(span).toEqual({ start: at(2026, 10, 7, 10), end: now });
  });

  it('uses endedAt for finished matches and tolerates missing fields', () => {
    expect(
      matchTimeSpan(
        {
          id: 'b',
          status: 'ended',
          createdAt: at(2026, 10, 7, 9).toISOString(),
          endedAt: at(2026, 10, 7, 11).toISOString(),
        },
        now
      )
    ).toEqual({ start: at(2026, 10, 7, 9), end: at(2026, 10, 7, 11) });
    expect(
      matchTimeSpan({ id: 'c', status: 'ended', createdAt: at(2026, 10, 7, 9).toISOString() }, now)
    ).toEqual({ start: at(2026, 10, 7, 9), end: at(2026, 10, 7, 9) });
    expect(matchTimeSpan({ id: 'd', status: 'active' }, now)).toBeNull();
    expect(matchTimeSpan({ id: 'e', status: 'active', createdAt: 'nope' }, now)).toBeNull();
  });
});

describe('bucketMatchesByDay', () => {
  it('groups by local day in chronological order and skips undated matches', () => {
    const matches = [
      { id: 'late', status: 'ended' as const, createdAt: at(2026, 10, 7, 20).toISOString() },
      { id: 'early', status: 'ended' as const, createdAt: at(2026, 10, 7, 8).toISOString() },
      { id: 'next', status: 'active' as const, createdAt: at(2026, 10, 8, 1).toISOString() },
      { id: 'undated', status: 'active' as const },
    ];
    const buckets = bucketMatchesByDay(matches);
    expect(buckets.get(dayKey(at(2026, 10, 7)))?.map((m) => m.id)).toEqual(['early', 'late']);
    expect(buckets.get(dayKey(at(2026, 10, 8)))?.map((m) => m.id)).toEqual(['next']);
    expect(buckets.size).toBe(2);
  });
});

describe('layoutDayTimeline', () => {
  const day = at(2026, 10, 7);

  it('positions in minutes and enforces a minimum height', () => {
    const [placement] = layoutDayTimeline(
      [{ id: 'a', start: at(2026, 10, 7, 9), end: at(2026, 10, 7, 9, 5) }],
      day,
      30
    );
    expect(placement).toMatchObject({
      startMinute: 540,
      endMinute: 570,
      column: 0,
      columnCount: 1,
    });
  });

  it('keeps short matches at the end of the day inside the grid', () => {
    const [placement] = layoutDayTimeline(
      [{ id: 'a', start: at(2026, 10, 7, 23, 50), end: at(2026, 10, 7, 23, 55) }],
      day,
      30
    );
    expect(placement.endMinute).toBe(1440);
    expect(placement.startMinute).toBe(1410);
  });

  it('splits overlapping matches into columns and reuses freed columns', () => {
    const placements = layoutDayTimeline(
      [
        { id: 'a', start: at(2026, 10, 7, 9), end: at(2026, 10, 7, 11) },
        { id: 'b', start: at(2026, 10, 7, 10), end: at(2026, 10, 7, 12) },
        { id: 'c', start: at(2026, 10, 7, 11), end: at(2026, 10, 7, 12, 30) },
        { id: 'd', start: at(2026, 10, 7, 15), end: at(2026, 10, 7, 16) },
      ],
      day
    );
    const byId = Object.fromEntries(placements.map((p) => [p.id, p]));
    expect(byId.a).toMatchObject({ column: 0, columnCount: 2 });
    expect(byId.b).toMatchObject({ column: 1, columnCount: 2 });
    expect(byId.c).toMatchObject({ column: 0, columnCount: 2 });
    expect(byId.d).toMatchObject({ column: 0, columnCount: 1 });
  });

  it('clips matches crossing midnight and flags continuation', () => {
    const overnight = { id: 'n', start: at(2026, 10, 6, 22), end: at(2026, 10, 7, 2) };
    const [today] = layoutDayTimeline([overnight], day);
    expect(today).toMatchObject({ startMinute: 0, endMinute: 120, continuesBefore: true });
    const [yesterday] = layoutDayTimeline([overnight], at(2026, 10, 6));
    expect(yesterday).toMatchObject({ startMinute: 1320, endMinute: 1440, continuesAfter: true });
    expect(layoutDayTimeline([overnight], at(2026, 10, 8))).toEqual([]);
  });
});

describe('list helpers', () => {
  it('sorts newest first with undated last', () => {
    const sorted = sortNewestFirst([
      { id: 'old', status: 'ended' as const, createdAt: at(2026, 1, 1).toISOString() },
      { id: 'none', status: 'ended' as const },
      { id: 'new', status: 'ended' as const, createdAt: at(2026, 5, 1).toISOString() },
    ]);
    expect(sorted.map((m) => m.id)).toEqual(['new', 'old', 'none']);
  });

  it('paginates and clamps the page', () => {
    const items = Array.from({ length: 23 }, (_, index) => index);
    expect(paginate(items, 1, 10)).toMatchObject({ page: 1, pageCount: 3, total: 23 });
    expect(paginate(items, 3, 10).items).toEqual([20, 21, 22]);
    expect(paginate(items, 9, 10).page).toBe(3);
    expect(paginate(items, 0, 10).page).toBe(1);
    expect(paginate([], 1, 10)).toEqual({ items: [], page: 1, pageCount: 1, total: 0 });
  });
});

describe('describeMatchStanding', () => {
  const leader = { playerId: 'p', name: 'Asha', total: 42, isTied: false };

  it('reports winner, leader, tie and empty', () => {
    expect(describeMatchStanding({ status: 'ended', leader })).toEqual({
      kind: 'winner',
      name: 'Asha',
      total: 42,
    });
    expect(describeMatchStanding({ status: 'active', leader })).toEqual({
      kind: 'leading',
      name: 'Asha',
      total: 42,
    });
    expect(
      describeMatchStanding({ status: 'active', leader: { ...leader, isTied: true } })
    ).toEqual({ kind: 'tied', total: 42, isFinal: false });
    expect(describeMatchStanding({ status: 'ended', leader: null })).toEqual({ kind: 'empty' });
    expect(describeMatchStanding({ status: 'ended' })).toEqual({ kind: 'empty' });
  });
});
