import type { MilestoneColor, MilestoneTier } from '@/lib/domain/milestones';

export interface MilestoneTheme {
  card: string;
  sheen: string;
  heroBubble: string;
  pill: string;
  bar: string;
}

export const MILESTONE_THEMES: Record<MilestoneColor, MilestoneTheme> = {
  amber: {
    card: 'bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-600 text-amber-950',
    sheen: 'from-white/60',
    heroBubble: 'bg-white/50 ring-amber-100/80',
    pill: 'bg-amber-950/15 text-amber-950',
    bar: 'bg-amber-950/60',
  },
  violet: {
    card: 'bg-gradient-to-br from-violet-400 via-violet-500 to-purple-700 text-white',
    sheen: 'from-white/40',
    heroBubble: 'bg-white/25 ring-white/50',
    pill: 'bg-white/20 text-white',
    bar: 'bg-white/80',
  },
  sky: {
    card: 'bg-gradient-to-br from-sky-400 via-sky-500 to-blue-700 text-white',
    sheen: 'from-white/40',
    heroBubble: 'bg-white/25 ring-white/50',
    pill: 'bg-white/20 text-white',
    bar: 'bg-white/80',
  },
  indigo: {
    card: 'bg-gradient-to-br from-indigo-400 via-indigo-500 to-indigo-800 text-white',
    sheen: 'from-white/40',
    heroBubble: 'bg-white/25 ring-white/50',
    pill: 'bg-white/20 text-white',
    bar: 'bg-white/80',
  },
  orange: {
    card: 'bg-gradient-to-br from-orange-400 via-orange-500 to-red-700 text-white',
    sheen: 'from-white/40',
    heroBubble: 'bg-white/25 ring-white/50',
    pill: 'bg-white/20 text-white',
    bar: 'bg-white/80',
  },
  emerald: {
    card: 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-700 text-white',
    sheen: 'from-white/40',
    heroBubble: 'bg-white/25 ring-white/50',
    pill: 'bg-white/20 text-white',
    bar: 'bg-white/80',
  },
  rose: {
    card: 'bg-gradient-to-br from-rose-400 via-rose-500 to-red-700 text-white',
    sheen: 'from-white/40',
    heroBubble: 'bg-white/25 ring-white/50',
    pill: 'bg-white/20 text-white',
    bar: 'bg-white/80',
  },
  fuchsia: {
    card: 'bg-gradient-to-br from-fuchsia-400 via-fuchsia-500 to-pink-700 text-white',
    sheen: 'from-white/40',
    heroBubble: 'bg-white/25 ring-white/50',
    pill: 'bg-white/20 text-white',
    bar: 'bg-white/80',
  },
  teal: {
    card: 'bg-gradient-to-br from-teal-400 via-teal-500 to-cyan-700 text-white',
    sheen: 'from-white/40',
    heroBubble: 'bg-white/25 ring-white/50',
    pill: 'bg-white/20 text-white',
    bar: 'bg-white/80',
  },
};

export const LOCKED_CARD_CLASS =
  'bg-gray-100 text-gray-500 border-dashed border-gray-300 dark:bg-gray-800/60 dark:text-gray-400 dark:border-gray-600';

export const TIER_LABEL_CLASS: Record<MilestoneTier, string> = {
  Bronze: 'text-orange-700',
  Silver: 'text-slate-600',
  Gold: 'text-amber-600',
  Legend: 'text-fuchsia-600',
};
