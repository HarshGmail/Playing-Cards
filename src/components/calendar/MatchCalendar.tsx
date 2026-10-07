'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CalendarX2 } from 'lucide-react';
import type { MatchSummary } from '@/types';
import {
  CalendarView,
  DateRange,
  bucketMatchesByDay,
  dayKey,
  daysInRange,
  formatViewTitle,
  getViewRange,
} from '@/lib/domain/calendar';
import { useCalendarMatchesQuery } from '@/lib/queries/calendar';
import CalendarToolbar from './CalendarToolbar';
import MonthView from './MonthView';
import TimelineView from './TimelineView';
import ListView from './ListView';
import { NavigationDirection, useCalendarNavigation, useIsPhone, useNow } from './hooks';

const SLIDE_OFFSET_PX = 24;
const TRANSITION = { duration: 0.18, ease: 'easeOut' } as const;

interface MatchCalendarProps {
  currentUserId?: string;
}

function rangeKey(view: CalendarView, range: DateRange | null): string {
  return range ? `${view}:${dayKey(range.from)}` : view;
}

function CalendarSkeleton() {
  return (
    <div className="space-y-2 p-4" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
      ))}
    </div>
  );
}

function EmptyState({ view }: { view: CalendarView }) {
  const message =
    view === 'list' ? 'No matches yet.' : `No matches this ${view === 'day' ? 'day' : view}.`;
  return (
    <div className="flex flex-col items-center gap-2 border-t border-gray-100 px-4 py-5 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
      <CalendarX2 className="h-5 w-5" aria-hidden="true" />
      {message}
    </div>
  );
}

interface ViewBodyProps {
  view: CalendarView;
  range: DateRange | null;
  anchor: Date;
  now: Date;
  matches: MatchSummary[];
  isPhone: boolean;
  currentUserId?: string;
  onOpenDay: (day: Date) => void;
}

function ViewBody({
  view,
  range,
  anchor,
  now,
  matches,
  isPhone,
  currentUserId,
  onOpenDay,
}: ViewBodyProps) {
  const buckets = useMemo(() => bucketMatchesByDay(matches), [matches]);

  if (view === 'list' || !range) {
    return <ListView matches={matches} now={now} currentUserId={currentUserId} />;
  }
  if (view === 'month') {
    return (
      <MonthView
        range={range}
        anchor={anchor}
        now={now}
        buckets={buckets}
        isCompact={isPhone}
        onOpenDay={onOpenDay}
      />
    );
  }
  return (
    <TimelineView
      days={daysInRange(range)}
      now={now}
      matches={matches}
      onOpenDay={view === 'week' ? onOpenDay : undefined}
    />
  );
}

export default function MatchCalendar({ currentUserId }: MatchCalendarProps) {
  const { view, anchor, direction, setView, shift, goToday, openDay } = useCalendarNavigation();
  const isPhone = useIsPhone();
  const now = useNow();
  const prefersReducedMotion = useReducedMotion();

  const activeView = view ?? 'list';
  const range = useMemo(() => getViewRange(activeView, anchor), [activeView, anchor]);
  const from = range?.from.toISOString() ?? null;
  const to = range?.to.toISOString() ?? null;
  const {
    data: matches,
    isPending,
    isFetching,
    isPlaceholderData,
  } = useCalendarMatchesQuery(from, to, view !== null);

  const offset = prefersReducedMotion ? 0 : SLIDE_OFFSET_PX;
  const slideVariants = {
    enter: (step: NavigationDirection) => ({ x: step * offset, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (step: NavigationDirection) => ({ x: -step * offset, opacity: 0 }),
  };
  const hasMatches = (matches?.length ?? 0) > 0;
  const showsEmpty = !isPending && !isPlaceholderData && !hasMatches;

  return (
    <section
      aria-label="Match calendar"
      className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <CalendarToolbar
        view={activeView}
        title={formatViewTitle(activeView, anchor)}
        isFetching={isFetching && !isPending}
        onViewChange={setView}
        onPrev={() => shift(-1)}
        onNext={() => shift(1)}
        onToday={goToday}
      />
      {!view || isPending ? (
        <CalendarSkeleton />
      ) : (
        <div className="relative overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={rangeKey(activeView, range)}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={TRANSITION}
              className={isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}
            >
              {activeView === 'list' && showsEmpty ? null : (
                <ViewBody
                  view={activeView}
                  range={range}
                  anchor={anchor}
                  now={now}
                  matches={matches ?? []}
                  isPhone={isPhone}
                  currentUserId={currentUserId}
                  onOpenDay={openDay}
                />
              )}
              {showsEmpty && <EmptyState view={activeView} />}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
