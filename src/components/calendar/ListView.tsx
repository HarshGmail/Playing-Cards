'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MatchSummary } from '@/types';
import { paginate, sortNewestFirst } from '@/lib/domain/calendar';
import MatchCard from './MatchCard';

export const LIST_PAGE_SIZE = 10;

interface ListViewProps {
  matches: MatchSummary[];
  now: Date;
  currentUserId?: string;
}

const pagerButton =
  'inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800';

export default function ListView({ matches, now, currentUserId }: ListViewProps) {
  const [requestedPage, setRequestedPage] = useState(1);
  const sorted = useMemo(() => sortNewestFirst(matches), [matches]);
  const { items, page, pageCount, total } = paginate(sorted, requestedPage, LIST_PAGE_SIZE);

  useEffect(() => {
    if (requestedPage !== page) setRequestedPage(page);
  }, [requestedPage, page]);

  const firstShown = total === 0 ? 0 : (page - 1) * LIST_PAGE_SIZE + 1;
  const lastShown = firstShown + items.length - 1;

  return (
    <div className="space-y-3 p-3 sm:p-4">
      <ul className="space-y-2.5">
        {items.map((match) => (
          <li key={match.id}>
            <MatchCard match={match} now={now} isCreator={match.creatorId === currentUserId} />
          </li>
        ))}
      </ul>
      {pageCount > 1 && (
        <nav className="flex items-center justify-between gap-3 pt-1" aria-label="Match list pages">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {firstShown}–{lastShown} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={pagerButton}
              disabled={page <= 1}
              onClick={() => setRequestedPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Newer
            </button>
            <span className="text-xs tabular-nums text-gray-600 dark:text-gray-400">
              {page} / {pageCount}
            </span>
            <button
              type="button"
              className={pagerButton}
              disabled={page >= pageCount}
              onClick={() => setRequestedPage(page + 1)}
            >
              Older
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
