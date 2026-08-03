import { PositionColorToken } from '@/lib/domain/positionColor';

/**
 * Tailwind classes for each position token. Shared by the leaderboard rows and
 * the podium cards, which are rendered by separate components but must colour
 * a given position identically.
 */
export const POSITION_CLASSES: Record<
  PositionColorToken,
  { badge: string; text: string; ring: string }
> = {
  'pos-1': {
    badge: 'bg-purple-600 text-white',
    text: 'text-purple-600 dark:text-purple-400',
    ring: 'border-purple-200 dark:border-purple-800 from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/40',
  },
  'pos-2': {
    badge: 'bg-green-600 text-white',
    text: 'text-green-600 dark:text-green-400',
    ring: 'border-green-200 dark:border-green-800 from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/40',
  },
  'pos-3': {
    badge: 'bg-yellow-500 text-white',
    text: 'text-yellow-600 dark:text-yellow-400',
    ring: 'border-yellow-200 dark:border-yellow-800 from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/40',
  },
  'pos-last': {
    badge: 'bg-red-600 text-white',
    text: 'text-red-600 dark:text-red-400',
    ring: 'border-red-200 dark:border-red-800 from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/40',
  },
  'pos-mid': {
    badge: 'bg-gray-500 text-white',
    text: 'text-gray-600 dark:text-gray-400',
    ring: 'border-gray-200 dark:border-gray-700 from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800',
  },
  'pos-dnf': {
    badge: 'bg-gray-400 text-white',
    text: 'text-gray-400 dark:text-gray-500',
    ring: 'border-gray-200 dark:border-gray-700 from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800',
  },
};
