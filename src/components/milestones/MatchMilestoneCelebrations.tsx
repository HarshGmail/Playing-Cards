'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useConfettiBurst } from '@/components/effects/useConfettiBurst';
import { findMilestone } from '@/lib/domain/milestones';
import { useMatchCelebrationsQuery } from '@/lib/queries/records';
import type { MatchCelebration } from '@/types';
import { MILESTONE_THEMES } from './milestoneStyles';

const SEEN_KEY_PREFIX = 'match-celebrations-seen:';
const SHOW_FOR_MS = 6000;

function seenKeyFor(matchId: string): string {
  return `${SEEN_KEY_PREFIX}${matchId}`;
}

function readSeen(matchId: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(seenKeyFor(matchId)) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function writeSeen(matchId: string, seen: Set<string>): void {
  try {
    localStorage.setItem(seenKeyFor(matchId), JSON.stringify(Array.from(seen)));
  } catch {
    return;
  }
}

function CelebrationCard({
  celebration,
  isSelf,
  remaining,
  onDismiss,
}: {
  celebration: MatchCelebration;
  isSelf: boolean;
  remaining: number;
  onDismiss: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const milestone = findMilestone(celebration.milestoneId)!;
  const theme = MILESTONE_THEMES[milestone.color];
  useConfettiBurst(celebration.id);

  return (
    <motion.button
      type="button"
      onClick={onDismiss}
      aria-label={`${isSelf ? 'You' : celebration.userName} unlocked ${milestone.title}. Dismiss`}
      initial={reduceMotion ? { opacity: 0 } : { y: -80, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { y: -40, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 360, damping: 26 }}
      className={`pointer-events-auto flex w-full max-w-md items-center gap-3 overflow-hidden rounded-2xl p-3 pr-4 text-left shadow-2xl ring-2 ring-white/40 ${theme.card}`}
    >
      <span
        aria-hidden
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ring-4 ${theme.heroBubble}`}
      >
        {milestone.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-black uppercase tracking-wide">
          🎉 {isSelf ? 'You' : celebration.userName} unlocked
        </span>
        <span className="block truncate text-base font-extrabold leading-tight">{milestone.title}</span>
        <span className="block truncate text-xs opacity-90">
          {milestone.tier} · {milestone.trackLabel}
        </span>
      </span>
      {remaining > 1 && (
        <span className="shrink-0 self-start rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-semibold tabular-nums">
          +{remaining - 1}
        </span>
      )}
    </motion.button>
  );
}

interface MatchMilestoneCelebrationsProps {
  matchId: string;
  currentUserId?: string;
}

export default function MatchMilestoneCelebrations({ matchId, currentUserId }: MatchMilestoneCelebrationsProps) {
  const { data: celebrations = [] } = useMatchCelebrationsQuery(matchId);
  const [seen, setSeen] = useState<Set<string> | null>(null);

  useEffect(() => {
    setSeen(readSeen(matchId));
  }, [matchId]);

  const queue = seen
    ? celebrations.filter((celebration) => !seen.has(celebration.id) && findMilestone(celebration.milestoneId))
    : [];
  const current = queue[0] ?? null;

  const dismiss = useCallback(() => {
    if (!current) return;
    setSeen((previous) => {
      const next = new Set(previous ?? []);
      next.add(current.id);
      writeSeen(matchId, next);
      return next;
    });
  }, [current, matchId]);

  useEffect(() => {
    if (!current) return;
    const timer = window.setTimeout(dismiss, SHOW_FOR_MS);
    return () => window.clearTimeout(timer);
  }, [current, dismiss]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex justify-center px-4">
      <AnimatePresence mode="wait">
        {current && (
          <CelebrationCard
            key={current.id}
            celebration={current}
            isSelf={current.userId === currentUserId}
            remaining={queue.length}
            onDismiss={dismiss}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
