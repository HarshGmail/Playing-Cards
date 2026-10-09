'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { MIN_VISIBLE_STREAK } from '@/lib/domain/streaks';

export type StreakKind = 'game' | 'match';

interface StreakKindStyle {
  emoji: string;
  noun: string;
  pillClasses: string;
  flicker: { scale: number[]; rotate?: number[]; opacity?: number[] };
}

const KIND_STYLES: Record<StreakKind, StreakKindStyle> = {
  game: {
    emoji: '🔥',
    noun: 'game wins',
    pillClasses:
      'bg-orange-100 text-orange-700 ring-orange-300/70 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-400/30',
    flicker: { scale: [1, 1.15, 0.95, 1.1, 1], rotate: [0, -6, 4, -3, 0] },
  },
  match: {
    emoji: '⚡',
    noun: 'match wins',
    pillClasses:
      'bg-yellow-100 text-yellow-800 ring-yellow-300/70 dark:bg-yellow-500/15 dark:text-yellow-300 dark:ring-yellow-400/30',
    flicker: { scale: [1, 1.1, 0.95, 1.05, 1], opacity: [1, 0.65, 1, 0.8, 1] },
  },
};

const FLICKER_TRANSITION = { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } as const;

export function isStreakVisible(count: number): boolean {
  return count >= MIN_VISIBLE_STREAK;
}

export function streakLabel(kind: StreakKind, count: number): string {
  return `${count} ${KIND_STYLES[kind].noun} in a row`;
}

interface StreakBadgeProps {
  kind: StreakKind;
  count: number;
  className?: string;
}

export default function StreakBadge({ kind, count, className = '' }: StreakBadgeProps) {
  const prefersReducedMotion = useReducedMotion();
  if (!isStreakVisible(count)) return null;

  const style = KIND_STYLES[kind];
  const label = streakLabel(kind, count);

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none tabular-nums ring-1 ring-inset ${style.pillClasses} ${className}`}
    >
      <motion.span
        aria-hidden
        className="inline-block"
        animate={prefersReducedMotion ? undefined : style.flicker}
        transition={FLICKER_TRANSITION}
      >
        {style.emoji}
      </motion.span>
      <span aria-hidden>{count}</span>
    </span>
  );
}

interface StreakBadgesProps {
  gameStreak?: number;
  matchStreak?: number;
  className?: string;
}

export function StreakBadges({ gameStreak = 0, matchStreak = 0, className = '' }: StreakBadgesProps) {
  if (!isStreakVisible(gameStreak) && !isStreakVisible(matchStreak)) return null;

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <StreakBadge kind="game" count={gameStreak} />
      <StreakBadge kind="match" count={matchStreak} />
    </span>
  );
}
