'use client';

import { Check, Lock } from 'lucide-react';
import {
  remainingToMilestone,
  trackMilestones,
  type Milestone,
  type MilestoneProgress,
} from '@/lib/domain/milestones';
import { APP_TIME_ZONE } from '@/lib/domain/streaks';
import FlipCardModal, { CARD_FACE_STYLE } from '@/components/stats/FlipCardModal';
import { MILESTONE_THEMES } from './milestoneStyles';

const MILESTONE_TITLE_ID = 'milestone-card-title';

interface MilestoneFlipCardProps {
  milestone: Milestone;
  progress: MilestoneProgress;
  unlocked: boolean;
  achievedAt?: string;
  onClose: () => void;
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-IN');
}

function formatUnlockedDate(achievedAt: string): string {
  return new Date(achievedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: APP_TIME_ZONE,
  });
}

function CornerHero({ emoji, flipped }: { emoji: string; flipped?: boolean }) {
  return (
    <span aria-hidden className={`absolute text-lg ${flipped ? 'bottom-3 right-3 rotate-180' : 'left-3 top-3'}`}>
      {emoji}
    </span>
  );
}

function Status({ milestone, progress, unlocked, achievedAt }: Omit<MilestoneFlipCardProps, 'onClose'>) {
  if (unlocked) {
    return (
      <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
        <Check className="h-4 w-4" aria-hidden />
        {achievedAt ? `Unlocked ${formatUnlockedDate(achievedAt)}` : 'Unlocked'}
      </p>
    );
  }
  const remaining = remainingToMilestone(milestone, progress.value);
  const percent = Math.min(100, Math.round((progress.value / milestone.threshold) * 100));
  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1 flex justify-between text-xs tabular-nums text-gray-600 dark:text-gray-400">
        <span>
          {formatNumber(progress.value)} / {formatNumber(milestone.threshold)}
        </span>
        <span className="font-semibold">{formatNumber(remaining)} more to go</span>
      </p>
    </div>
  );
}

function Ladder({ milestone, progress }: { milestone: Milestone; progress: MilestoneProgress }) {
  const achievedIds = new Set(progress.achieved.map((m) => m.id));
  const levels = trackMilestones(milestone.metric);
  const left = levels.length - achievedIds.size;

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {milestone.trackLabel} ladder · {left === 0 ? 'all unlocked' : `${left} to go`}
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {levels.map((level) => {
          const done = achievedIds.has(level.id);
          const isThis = level.id === milestone.id;
          return (
            <li
              key={level.id}
              title={level.title}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                done
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              } ${isThis ? 'ring-2 ring-violet-500' : ''}`}
            >
              <span aria-hidden className={done ? '' : 'grayscale opacity-60'}>
                {level.emoji}
              </span>
              {formatNumber(level.threshold)}
              {!done && <Lock className="h-2.5 w-2.5" aria-hidden />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function MilestoneFlipCard({ milestone, progress, unlocked, achievedAt, onClose }: MilestoneFlipCardProps) {
  const theme = MILESTONE_THEMES[milestone.color];

  return (
    <FlipCardModal titleId={MILESTONE_TITLE_ID} onClose={onClose}>
      <div
        style={CARD_FACE_STYLE}
        className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      >
        <div className={`relative shrink-0 px-6 pb-4 pt-8 text-center ${theme.card} ${unlocked ? '' : 'grayscale-[0.6]'}`}>
          <CornerHero emoji={milestone.emoji} />
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${theme.pill}`}>
            {milestone.tier}
          </span>
          <div
            aria-hidden
            className={`mx-auto mt-2 flex h-16 w-16 items-center justify-center rounded-2xl text-4xl ring-4 ${theme.heroBubble}`}
          >
            {milestone.emoji}
          </div>
          <h2 id={MILESTONE_TITLE_ID} className="mt-2 text-lg font-extrabold leading-tight">
            {milestone.title}
          </h2>
          <p className="text-xs opacity-80">{milestone.trackLabel}</p>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-10 pt-4 text-gray-900 [scrollbar-width:thin] dark:text-white">
          <Status milestone={milestone} progress={progress} unlocked={unlocked} achievedAt={achievedAt} />
          <div>
            {!unlocked && (
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                How to earn it
              </p>
            )}
            <p className="mt-0.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{milestone.howTo}</p>
          </div>
          <Ladder milestone={milestone} progress={progress} />
        </div>
        <CornerHero emoji={milestone.emoji} flipped />
      </div>
    </FlipCardModal>
  );
}
