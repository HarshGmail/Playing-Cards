'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Lock, Sparkles } from 'lucide-react';
import type { Milestone } from '@/lib/domain/milestones';
import { APP_TIME_ZONE } from '@/lib/domain/streaks';
import type { MilestoneFriendHolder } from '@/types';
import FriendHolderStack from './FriendHolderStack';
import { LOCKED_CARD_CLASS, MILESTONE_THEMES } from './milestoneStyles';

interface MilestoneCardProps {
  milestone: Milestone;
  unlocked: boolean;
  achievedAt?: string;
  progressPercent?: number;
  progressLabel?: string;
  isNew?: boolean;
  friendHolders?: MilestoneFriendHolder[];
}

function formatAchievedDate(achievedAt: string): string {
  return new Date(achievedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: APP_TIME_ZONE,
  });
}

function UnlockedCard({ milestone, achievedAt, isNew, friendHolders = [] }: Pick<MilestoneCardProps, 'milestone' | 'achievedAt' | 'isNew' | 'friendHolders'>) {
  const reduceMotion = useReducedMotion();
  const theme = MILESTONE_THEMES[milestone.color];

  return (
    <motion.article
      initial={isNew && !reduceMotion ? { scale: 0.85, rotate: -2, opacity: 0 } : false}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 20 }}
      aria-label={`${milestone.title}, ${milestone.tier} unlocked`}
      className={`relative isolate overflow-hidden rounded-2xl p-4 shadow-lg ring-1 ring-black/5 ${theme.card}`}
    >
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${theme.sheen} to-transparent blur-xl`}
      />
      <div className="flex items-start justify-between gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${theme.pill}`}>
          {milestone.tier}
        </span>
        {isNew && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
            <Sparkles className="h-3 w-3" aria-hidden />
            New
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div
          aria-hidden
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-4xl shadow-inner ring-4 ${theme.heroBubble}`}
        >
          {milestone.emoji}
        </div>
        <div className="min-w-0">
          <p className="text-base font-extrabold leading-tight drop-shadow-sm">{milestone.title}</p>
          <p className="mt-0.5 text-xs opacity-80">{milestone.trackLabel}</p>
        </div>
      </div>
      <p className="mt-3 text-[11px] font-medium opacity-80 tabular-nums">
        {achievedAt ? `Unlocked ${formatAchievedDate(achievedAt)}` : 'Unlocked'}
      </p>
      {friendHolders.length > 0 && (
        <div className="mt-2">
          <FriendHolderStack holders={friendHolders} />
        </div>
      )}
    </motion.article>
  );
}

function LockedCard({ milestone, progressPercent, progressLabel, friendHolders = [] }: Pick<MilestoneCardProps, 'milestone' | 'progressPercent' | 'progressLabel' | 'friendHolders'>) {
  return (
    <article
      aria-label={`${milestone.title}, locked`}
      className={`relative overflow-hidden rounded-2xl border p-4 ${LOCKED_CARD_CLASS}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          {milestone.tier}
        </span>
        <Lock className="h-4 w-4 opacity-60" aria-hidden />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div
          aria-hidden
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gray-200 text-4xl grayscale opacity-60 dark:bg-gray-700"
        >
          {milestone.emoji}
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold leading-tight text-gray-700 dark:text-gray-200">{milestone.title}</p>
          <p className="mt-0.5 text-xs">{milestone.trackLabel}</p>
        </div>
      </div>
      {progressPercent !== undefined && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {progressLabel && <p className="mt-1 text-[11px] tabular-nums">{progressLabel}</p>}
        </div>
      )}
      {friendHolders.length > 0 && (
        <div className="mt-3">
          <FriendHolderStack holders={friendHolders} tone="muted" />
        </div>
      )}
    </article>
  );
}

export default function MilestoneCard(props: MilestoneCardProps) {
  if (props.unlocked) {
    return <UnlockedCard
        milestone={props.milestone}
        achievedAt={props.achievedAt}
        isNew={props.isNew}
        friendHolders={props.friendHolders}
      />;
  }
  return (
    <LockedCard
      milestone={props.milestone}
      progressPercent={props.progressPercent}
      progressLabel={props.progressLabel}
      friendHolders={props.friendHolders}
    />
  );
}
