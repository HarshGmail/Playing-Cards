import type { MatchLeader } from '@/types';

export type CalendarView = 'month' | 'week' | 'day' | 'list';

export const CALENDAR_VIEWS: CalendarView[] = ['month', 'week', 'day', 'list'];

export const MINUTES_PER_DAY = 24 * 60;
export const DEFAULT_MIN_VISUAL_MINUTES = 30;
export const DAYS_PER_WEEK = 7;

export interface DateRange {
  from: Date;
  to: Date;
}

export interface TimedMatch {
  id: string;
  status: 'active' | 'ended';
  createdAt?: string | null;
  endedAt?: string | null;
}

export interface TimeSpan {
  start: Date;
  end: Date;
}

export interface TimelineInput {
  id: string;
  start: Date;
  end: Date;
}

export interface TimelinePlacement {
  id: string;
  startMinute: number;
  endMinute: number;
  column: number;
  columnCount: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
}

export type MatchStanding =
  | { kind: 'winner'; name: string; total: number }
  | { kind: 'leading'; name: string; total: number }
  | { kind: 'tied'; total: number; isFinal: boolean }
  | { kind: 'empty' };

export function isCalendarView(value: unknown): value is CalendarView {
  return typeof value === 'string' && (CALENDAR_VIEWS as string[]).includes(value);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function addMonths(date: Date, months: number): Date {
  const targetMonthStart = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const year = targetMonthStart.getFullYear();
  const month = targetMonthStart.getMonth();
  const day = Math.min(date.getDate(), daysInMonth(year, month));
  return new Date(year, month, day);
}

export function startOfWeek(date: Date): Date {
  const daysSinceMonday = (date.getDay() + 6) % DAYS_PER_WEEK;
  return addDays(startOfDay(date), -daysSinceMonday);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function getViewRange(view: CalendarView, anchor: Date): DateRange | null {
  if (view === 'list') return null;
  if (view === 'day') {
    const from = startOfDay(anchor);
    return { from, to: addDays(from, 1) };
  }
  if (view === 'week') {
    const from = startOfWeek(anchor);
    return { from, to: addDays(from, DAYS_PER_WEEK) };
  }
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const lastOfMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return {
    from: startOfWeek(firstOfMonth),
    to: addDays(startOfWeek(lastOfMonth), DAYS_PER_WEEK),
  };
}

export function daysInRange(range: DateRange): Date[] {
  const days: Date[] = [];
  for (let day = range.from; day < range.to; day = addDays(day, 1)) {
    days.push(day);
  }
  return days;
}

export function shiftAnchor(view: CalendarView, anchor: Date, direction: 1 | -1): Date {
  if (view === 'month') return addMonths(anchor, direction);
  if (view === 'week') return addDays(anchor, direction * DAYS_PER_WEEK);
  if (view === 'day') return addDays(anchor, direction);
  return anchor;
}

export function formatViewTitle(view: CalendarView, anchor: Date, locale?: string): string {
  if (view === 'list') return 'All matches';
  if (view === 'month') {
    return anchor.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }
  if (view === 'day') {
    return anchor.toLocaleDateString(locale, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
  const start = startOfWeek(anchor);
  const end = addDays(start, DAYS_PER_WEEK - 1);
  const monthDay = (date: Date) =>
    date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  if (start.getFullYear() !== end.getFullYear()) {
    const withYear = (date: Date) =>
      date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${withYear(start)} – ${withYear(end)}`;
  }
  const endLabel = isSameMonth(start, end) ? String(end.getDate()) : monthDay(end);
  return `${monthDay(start)} – ${endLabel}, ${end.getFullYear()}`;
}

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function matchTimeSpan(match: TimedMatch, now: Date): TimeSpan | null {
  const start = parseDate(match.createdAt);
  if (!start) return null;
  if (match.status === 'active') {
    return { start, end: now > start ? now : start };
  }
  const endedAt = parseDate(match.endedAt);
  return { start, end: endedAt && endedAt > start ? endedAt : start };
}

export function bucketMatchesByDay<T extends TimedMatch>(matches: T[]): Map<string, T[]> {
  const buckets = new Map<string, T[]>();
  const dated = matches
    .map((match) => ({ match, start: parseDate(match.createdAt) }))
    .filter((entry): entry is { match: T; start: Date } => entry.start !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  for (const { match, start } of dated) {
    const key = dayKey(start);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(match);
    else buckets.set(key, [match]);
  }
  return buckets;
}

function minuteOfDay(time: Date, dayStart: Date, dayEnd: Date): number {
  if (time <= dayStart) return 0;
  if (time >= dayEnd) return MINUTES_PER_DAY;
  return time.getHours() * 60 + time.getMinutes() + time.getSeconds() / 60;
}

interface VisualSegment {
  id: string;
  startMinute: number;
  endMinute: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
}

function toVisualSegment(
  input: TimelineInput,
  dayStart: Date,
  dayEnd: Date,
  minVisualMinutes: number
): VisualSegment {
  const rawStart = minuteOfDay(input.start, dayStart, dayEnd);
  const rawEnd = minuteOfDay(input.end, dayStart, dayEnd);
  const endMinute = Math.min(MINUTES_PER_DAY, Math.max(rawEnd, rawStart + minVisualMinutes));
  const startMinute = Math.max(0, Math.min(rawStart, endMinute - minVisualMinutes));
  return {
    id: input.id,
    startMinute,
    endMinute,
    continuesBefore: input.start < dayStart,
    continuesAfter: input.end > dayEnd,
  };
}

function intersectsDay(input: TimelineInput, dayStart: Date, dayEnd: Date): boolean {
  if (input.start >= dayEnd) return false;
  if (input.end > dayStart) return true;
  return input.start >= dayStart;
}

function assignColumns(cluster: VisualSegment[]): TimelinePlacement[] {
  const columnEnds: number[] = [];
  const placed = cluster.map((segment) => {
    let column = columnEnds.findIndex((end) => end <= segment.startMinute);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(segment.endMinute);
    } else {
      columnEnds[column] = segment.endMinute;
    }
    return { ...segment, column };
  });
  return placed.map((segment) => ({ ...segment, columnCount: columnEnds.length }));
}

export function layoutDayTimeline(
  inputs: TimelineInput[],
  day: Date,
  minVisualMinutes: number = DEFAULT_MIN_VISUAL_MINUTES
): TimelinePlacement[] {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const segments = inputs
    .filter((input) => intersectsDay(input, dayStart, dayEnd))
    .map((input) => toVisualSegment(input, dayStart, dayEnd, minVisualMinutes))
    .sort((a, b) => a.startMinute - b.startMinute || b.endMinute - a.endMinute);

  const placements: TimelinePlacement[] = [];
  let cluster: VisualSegment[] = [];
  let clusterEnd = -Infinity;
  for (const segment of segments) {
    if (cluster.length > 0 && segment.startMinute >= clusterEnd) {
      placements.push(...assignColumns(cluster));
      cluster = [];
      clusterEnd = -Infinity;
    }
    cluster.push(segment);
    clusterEnd = Math.max(clusterEnd, segment.endMinute);
  }
  if (cluster.length > 0) placements.push(...assignColumns(cluster));
  return placements;
}

export function sortNewestFirst<T extends TimedMatch>(matches: T[]): T[] {
  const timeOf = (match: T) => parseDate(match.createdAt)?.getTime() ?? -Infinity;
  return [...matches].sort((a, b) => timeOf(b) - timeOf(a));
}

export function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(1, Math.floor(page) || 1), pageCount);
  const offset = (currentPage - 1) * pageSize;
  return {
    items: items.slice(offset, offset + pageSize),
    page: currentPage,
    pageCount,
    total: items.length,
  };
}

export function describeMatchStanding(match: {
  status: 'active' | 'ended';
  leader?: MatchLeader | null;
}): MatchStanding {
  const leader = match.leader;
  if (!leader) return { kind: 'empty' };
  const isFinal = match.status === 'ended';
  if (leader.isTied) return { kind: 'tied', total: leader.total, isFinal };
  return { kind: isFinal ? 'winner' : 'leading', name: leader.name, total: leader.total };
}
