import type { TimeSpan } from '@/lib/domain/calendar';
import { isSameDay } from '@/lib/domain/calendar';

const TIME_FORMAT: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
const SHORT_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
};

export function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, TIME_FORMAT);
}

export function formatHourLabel(hour: number): string {
  return new Date(2000, 0, 1, hour).toLocaleTimeString(undefined, { hour: 'numeric' });
}

export function formatShortDate(date: Date): string {
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(
    undefined,
    sameYear ? SHORT_DATE_FORMAT : { ...SHORT_DATE_FORMAT, year: 'numeric' }
  );
}

export function formatSpan(span: TimeSpan, isActive: boolean): string {
  const start = formatTime(span.start);
  if (isActive) return `${start} – now`;
  if (span.end.getTime() === span.start.getTime()) return start;
  const end = isSameDay(span.start, span.end)
    ? formatTime(span.end)
    : `${formatShortDate(span.end)} ${formatTime(span.end)}`;
  return `${start} – ${end}`;
}

export function formatWeekdayShort(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}
