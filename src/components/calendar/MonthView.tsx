'use client';

import type { MatchSummary } from '@/types';
import {
  DAYS_PER_WEEK,
  DateRange,
  dayKey,
  daysInRange,
  isSameDay,
  isSameMonth,
} from '@/lib/domain/calendar';
import MatchCard, { gameAccentFor } from './MatchCard';
import { formatWeekdayShort } from './format';

const MAX_CHIPS_PER_DAY = 3;
const MAX_DOTS_PER_DAY = 3;

interface MonthViewProps {
  range: DateRange;
  anchor: Date;
  now: Date;
  buckets: Map<string, MatchSummary[]>;
  isCompact: boolean;
  onOpenDay: (day: Date) => void;
}

function DayNumber({
  day,
  isToday,
  isOutside,
}: {
  day: Date;
  isToday: boolean;
  isOutside: boolean;
}) {
  const tone = isToday
    ? 'bg-blue-600 text-white'
    : isOutside
      ? 'text-gray-400 dark:text-gray-600'
      : 'text-gray-800 dark:text-gray-200';
  return (
    <span
      className={`inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-1 text-xs font-semibold ${tone}`}
    >
      {day.getDate()}
    </span>
  );
}

function CompactDayCell({
  day,
  matches,
  isToday,
  isOutside,
  onOpenDay,
}: {
  day: Date;
  matches: MatchSummary[];
  isToday: boolean;
  isOutside: boolean;
  onOpenDay: (day: Date) => void;
}) {
  const label = day.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  return (
    <button
      type="button"
      onClick={() => onOpenDay(day)}
      aria-label={`${label}, ${matches.length} ${matches.length === 1 ? 'match' : 'matches'}`}
      className={`flex aspect-square flex-col items-center justify-start gap-1 pt-1.5 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:hover:bg-gray-800/60 ${
        isOutside ? 'bg-gray-50/60 dark:bg-gray-950/40' : ''
      }`}
    >
      <DayNumber day={day} isToday={isToday} isOutside={isOutside} />
      <span className="flex items-center gap-0.5">
        {matches.slice(0, MAX_DOTS_PER_DAY).map((match) => (
          <span key={match.id} className={`h-1.5 w-1.5 rounded-full ${gameAccentFor(match).dot}`} />
        ))}
      </span>
      {matches.length > MAX_DOTS_PER_DAY && (
        <span className="text-[10px] leading-none text-gray-500 dark:text-gray-400">
          {matches.length}
        </span>
      )}
    </button>
  );
}

function FullDayCell({
  day,
  matches,
  now,
  isToday,
  isOutside,
  onOpenDay,
}: {
  day: Date;
  matches: MatchSummary[];
  now: Date;
  isToday: boolean;
  isOutside: boolean;
  onOpenDay: (day: Date) => void;
}) {
  const visible = matches.slice(0, MAX_CHIPS_PER_DAY);
  const hiddenCount = matches.length - visible.length;
  return (
    <div
      className={`flex min-h-[112px] min-w-0 flex-col gap-1 p-1.5 ${
        isOutside ? 'bg-gray-50/70 dark:bg-gray-950/40' : ''
      } ${isToday ? 'bg-blue-50/60 dark:bg-blue-500/5' : ''}`}
    >
      <button
        type="button"
        onClick={() => onOpenDay(day)}
        className="self-start rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label={`Open ${day.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`}
      >
        <DayNumber day={day} isToday={isToday} isOutside={isOutside} />
      </button>
      {visible.map((match) => (
        <MatchCard key={match.id} match={match} now={now} variant="chip" />
      ))}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => onOpenDay(day)}
          className="self-start rounded px-1.5 text-[11px] font-medium text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-blue-400"
        >
          +{hiddenCount} more
        </button>
      )}
    </div>
  );
}

export default function MonthView({
  range,
  anchor,
  now,
  buckets,
  isCompact,
  onOpenDay,
}: MonthViewProps) {
  const days = daysInRange(range);
  const weekdayHeaders = days.slice(0, DAYS_PER_WEEK);

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
        {weekdayHeaders.map((day) => (
          <div
            key={day.getDay()}
            className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
          >
            {isCompact ? formatWeekdayShort(day).charAt(0) : formatWeekdayShort(day)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-800">
        {days.map((day) => {
          const cellProps = {
            day,
            matches: buckets.get(dayKey(day)) ?? [],
            isToday: isSameDay(day, now),
            isOutside: !isSameMonth(day, anchor),
            onOpenDay,
          };
          return (
            <div key={dayKey(day)} className="bg-white dark:bg-gray-900">
              {isCompact ? (
                <CompactDayCell {...cellProps} />
              ) : (
                <FullDayCell {...cellProps} now={now} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
