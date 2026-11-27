import type { RecordKind } from '@/types';

export interface RecordTrackStyle {
  kind: RecordKind;
  title: string;
  emoji: string;
  spentUnit: [string, string];
  badge: string;
  header: string;
}

export const RECORD_TRACKS: RecordTrackStyle[] = [
  {
    kind: 'matchWins',
    title: 'Match wins',
    emoji: '👑',
    spentUnit: ['match', 'matches'],
    badge: 'from-violet-500 to-purple-700',
    header: 'bg-gradient-to-br from-violet-500 via-violet-600 to-purple-800 text-white',
  },
  {
    kind: 'gameWins',
    title: 'Game wins',
    emoji: '🥇',
    spentUnit: ['game', 'games'],
    badge: 'from-amber-400 to-orange-600',
    header: 'bg-gradient-to-br from-amber-300 via-amber-400 to-orange-600 text-amber-950',
  },
];

export function unitFor(count: number, [singular, plural]: [string, string]): string {
  return count === 1 ? singular : plural;
}
