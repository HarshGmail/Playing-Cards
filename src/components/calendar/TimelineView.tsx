'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { MatchSummary } from '@/types';
import {
  MINUTES_PER_DAY,
  TimelineInput,
  dayKey,
  isSameDay,
  layoutDayTimeline,
  matchTimeSpan,
} from '@/lib/domain/calendar';
import MatchCard from './MatchCard';
import { formatHourLabel, formatWeekdayShort } from './format';

const HOUR_HEIGHT_PX = 56;
const MIN_CARD_HEIGHT_PX = 24;
const MINUTES_PER_HOUR = 60;
const DEFAULT_SCROLL_HOUR = 8;
const SCROLL_LEAD_HOURS = 1;
const CARD_GAP_PX = 2;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const GRID_HEIGHT_PX = 24 * HOUR_HEIGHT_PX;
const MIN_VISUAL_MINUTES = (MIN_CARD_HEIGHT_PX / HOUR_HEIGHT_PX) * MINUTES_PER_HOUR;

const minutesToPx = (minutes: number) => (minutes / MINUTES_PER_HOUR) * HOUR_HEIGHT_PX;

interface TimelineViewProps {
  days: Date[];
  now: Date;
  matches: MatchSummary[];
  onOpenDay?: (day: Date) => void;
}

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * MINUTES_PER_HOUR + date.getMinutes();
}

function DayHeader({
  day,
  isToday,
  onOpenDay,
}: {
  day: Date;
  isToday: boolean;
  onOpenDay?: (day: Date) => void;
}) {
  const content = (
    <>
      <span
        className={`text-[11px] font-semibold uppercase tracking-wide ${
          isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        {formatWeekdayShort(day)}
      </span>
      <span
        className={`inline-flex h-7 min-w-[28px] items-center justify-center rounded-full px-1 text-sm font-semibold ${
          isToday ? 'bg-blue-600 text-white' : 'text-gray-900 dark:text-gray-100'
        }`}
      >
        {day.getDate()}
      </span>
    </>
  );
  const className = 'flex flex-col items-center gap-0.5 py-2';
  if (!onOpenDay) return <div className={className}>{content}</div>;
  return (
    <button
      type="button"
      onClick={() => onOpenDay(day)}
      className={`${className} transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:hover:bg-gray-800/60`}
    >
      {content}
    </button>
  );
}

function NowLine({ now }: { now: Date }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
      style={{ top: minutesToPx(minutesSinceMidnight(now)) }}
      aria-hidden="true"
    >
      <span className="-ml-1 h-2.5 w-2.5 rounded-full bg-red-500" />
      <span className="h-0.5 flex-1 bg-red-500" />
    </div>
  );
}

function DayColumn({
  day,
  now,
  inputs,
  matchesById,
}: {
  day: Date;
  now: Date;
  inputs: TimelineInput[];
  matchesById: Map<string, MatchSummary>;
}) {
  const isToday = isSameDay(day, now);
  const placements = layoutDayTimeline(inputs, day, MIN_VISUAL_MINUTES);

  return (
    <div
      className={`relative border-l border-gray-200 dark:border-gray-800 ${
        isToday ? 'bg-blue-50/40 dark:bg-blue-500/5' : ''
      }`}
      style={{ height: GRID_HEIGHT_PX }}
    >
      {HOURS.map((hour) => (
        <div
          key={hour}
          className="absolute inset-x-0 border-t border-gray-100 dark:border-gray-800/70"
          style={{ top: hour * HOUR_HEIGHT_PX }}
        />
      ))}
      {placements.map((placement) => {
        const match = matchesById.get(placement.id);
        if (!match) return null;
        const heightPx = minutesToPx(placement.endMinute - placement.startMinute) - CARD_GAP_PX;
        const widthPercent = 100 / placement.columnCount;
        return (
          <div
            key={placement.id}
            className="absolute z-10 px-0.5"
            style={{
              top: minutesToPx(placement.startMinute) + CARD_GAP_PX / 2,
              height: heightPx,
              left: `${placement.column * widthPercent}%`,
              width: `${widthPercent}%`,
            }}
          >
            <MatchCard match={match} now={now} variant="timeline" heightPx={heightPx} />
          </div>
        );
      })}
      {isToday && <NowLine now={now} />}
    </div>
  );
}

export default function TimelineView({ days, now, matches, onOpenDay }: TimelineViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstDayKey = days.length > 0 ? dayKey(days[0]) : '';
  const showsToday = days.some((day) => isSameDay(day, now));

  const { inputs, matchesById } = useMemo(() => {
    const timed: TimelineInput[] = [];
    for (const match of matches) {
      const span = matchTimeSpan(match, now);
      if (span) timed.push({ id: match.id, start: span.start, end: span.end });
    }
    return { inputs: timed, matchesById: new Map(matches.map((match) => [match.id, match])) };
  }, [matches, now]);

  const earliestStartMinute = useMemo(() => {
    const visibleStarts = inputs
      .filter((input) => days.some((day) => isSameDay(day, input.start)))
      .map((input) => minutesSinceMidnight(input.start));
    return visibleStarts.length > 0 ? Math.min(...visibleStarts) : null;
  }, [inputs, days]);

  const initialFocusMinute = showsToday
    ? minutesSinceMidnight(now)
    : (earliestStartMinute ?? DEFAULT_SCROLL_HOUR * MINUTES_PER_HOUR);
  const focusMinuteRef = useRef(initialFocusMinute);
  focusMinuteRef.current = initialFocusMinute;

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const leadMinutes = SCROLL_LEAD_HOURS * MINUTES_PER_HOUR;
    const targetMinute = Math.min(focusMinuteRef.current - leadMinutes, MINUTES_PER_DAY);
    container.scrollTop = minutesToPx(Math.max(0, targetMinute));
  }, [firstDayKey, days.length]);

  const columnTemplate = { gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` };

  const isMultiDay = days.length > 1;

  return (
    <div className={isMultiDay ? 'overflow-x-auto' : ''}>
      <div className={isMultiDay ? 'min-w-[640px]' : ''}>
        <div className="grid border-b border-gray-200 dark:border-gray-800" style={columnTemplate}>
          <div />
          {days.map((day) => (
            <DayHeader
              key={dayKey(day)}
              day={day}
              isToday={isSameDay(day, now)}
              onOpenDay={onOpenDay}
            />
          ))}
        </div>
        <div
          ref={scrollRef}
          className="max-h-[560px] overflow-y-auto overscroll-contain sm:max-h-[640px]"
        >
          <div className="grid" style={columnTemplate}>
            <div className="relative" style={{ height: GRID_HEIGHT_PX }}>
              {HOURS.slice(1).map((hour) => (
                <span
                  key={hour}
                  className="absolute right-2 -translate-y-1/2 text-[10px] font-medium text-gray-500 dark:text-gray-400"
                  style={{ top: hour * HOUR_HEIGHT_PX }}
                >
                  {formatHourLabel(hour)}
                </span>
              ))}
            </div>
            {days.map((day) => (
              <DayColumn
                key={dayKey(day)}
                day={day}
                now={now}
                inputs={inputs}
                matchesById={matchesById}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
