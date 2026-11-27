import type { ShowdownMark, ShowdownTally } from '@/lib/domain/showdownStats';

export const SHOWDOWN_MARKS: Record<ShowdownMark, { label: string; title: string; cell: string; badge: string }> = {
  correct: {
    label: '✓',
    title: 'Correct show',
    cell: 'bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
    badge: 'bg-emerald-600 text-white',
  },
  wrong: {
    label: '+50',
    title: 'Wrong show',
    cell: 'bg-red-50 font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-300',
    badge: 'bg-red-600 text-white',
  },
  beat: {
    label: '🛡',
    title: 'Beat the show',
    cell: 'bg-sky-50 font-semibold text-sky-700 dark:bg-sky-900/20 dark:text-sky-300',
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-800 dark:text-sky-100',
  },
};

export const SHOWDOWN_TALLY_ROWS: Array<{ key: keyof ShowdownTally; label: string; className: string }> = [
  { key: 'correctShows', label: '✓ Shows', className: 'text-emerald-700 dark:text-emerald-300' },
  { key: 'beatShows', label: '🛡 Beat a show', className: 'text-sky-700 dark:text-sky-300' },
  { key: 'wrongShows', label: '✗ Wrong shows', className: 'text-red-700 dark:text-red-300' },
];
