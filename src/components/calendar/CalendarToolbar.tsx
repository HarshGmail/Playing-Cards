'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CALENDAR_VIEWS, CalendarView } from '@/lib/domain/calendar';

const VIEW_LABELS: Record<CalendarView, string> = {
  month: 'Month',
  week: 'Week',
  day: 'Day',
  list: 'List',
};

interface CalendarToolbarProps {
  view: CalendarView;
  title: string;
  isFetching: boolean;
  onViewChange: (view: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

const iconButton =
  'inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white';

export default function CalendarToolbar({
  view,
  title,
  isFetching,
  onViewChange,
  onPrev,
  onNext,
  onToday,
}: CalendarToolbarProps) {
  const isNavigable = view !== 'list';

  return (
    <div className="flex flex-col gap-3 border-b border-gray-200 px-3 py-3 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="flex min-w-0 items-center gap-1.5">
        {isNavigable && (
          <>
            <button
              type="button"
              onClick={onToday}
              className="mr-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Today
            </button>
            <button type="button" onClick={onPrev} className={iconButton} aria-label="Previous">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={onNext} className={iconButton} aria-label="Next">
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
        <h2
          className="ml-1 truncate text-base font-semibold text-gray-900 dark:text-white sm:text-lg"
          aria-live="polite"
        >
          {title}
        </h2>
        <span
          className={`ml-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500 transition-opacity ${
            isFetching ? 'animate-pulse opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
        />
      </div>

      <div
        role="tablist"
        aria-label="Calendar view"
        className="grid grid-cols-4 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800"
      >
        {CALENDAR_VIEWS.map((option) => {
          const isSelected = option === view;
          return (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onViewChange(option)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isSelected
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {VIEW_LABELS[option]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
