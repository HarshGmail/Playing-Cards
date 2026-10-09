'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Award, Sparkles } from 'lucide-react';
import {
  ALL_MILESTONES,
  milestoneProgress,
  type Milestone,
  type MilestoneMetric,
  type MilestoneProgress,
  type MilestoneStats,
} from '@/lib/domain/milestones';
import { APP_TIME_ZONE } from '@/lib/domain/streaks';
import type { UserStats } from '@/lib/queries/users';

export const MILESTONES_SECTION_ID = 'milestones';

const MILESTONES_HASH = `#${MILESTONES_SECTION_ID}`;
const RECENT_MILESTONE_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
const SKELETON_CARD_COUNT = 4;

const METRIC_UNITS: Record<MilestoneMetric, string> = {
  gamesWon: 'game wins',
  matchWins: 'match wins',
  matchesPlayed: 'matches played',
  gamesPlayed: 'games played',
  longestGameStreak: 'game wins in a row',
  longestMatchStreak: 'match wins in a row',
  longestDayStreak: 'days in a row',
};

interface MilestonesSectionProps {
  stats?: UserStats;
}

function toMilestoneStats(stats: UserStats): MilestoneStats {
  return {
    gamesWon: stats.gamesWon,
    matchWins: stats.matchWins,
    matchesPlayed: stats.matchesPlayed,
    gamesPlayed: stats.gamesPlayed,
    longestGameStreak: stats.streaks.longestGameStreak,
    longestMatchStreak: stats.streaks.longestMatchStreak,
    longestDayStreak: stats.streaks.longestDayStreak,
  };
}

function formatAchievedDate(achievedAt: string): string {
  return new Date(achievedAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: APP_TIME_ZONE,
  });
}

function isRecentlyAchieved(achievedAt: string | undefined, nowMs: number): boolean {
  if (!achievedAt) return false;
  return nowMs - Date.parse(achievedAt) <= RECENT_MILESTONE_WINDOW_MS;
}

function useScrollToMilestonesHash(sectionRef: React.RefObject<HTMLElement>, isLoaded: boolean) {
  const prefersReducedMotion = useReducedMotion();
  const hasScrolled = useRef(false);

  useEffect(() => {
    if (!isLoaded || hasScrolled.current) return;
    if (window.location.hash !== MILESTONES_HASH) return;
    const frame = requestAnimationFrame(() => {
      hasScrolled.current = true;
      sectionRef.current?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [isLoaded, prefersReducedMotion, sectionRef]);
}

interface AchievedChipProps {
  milestone: Milestone;
  achievedAt: string | undefined;
  isRecent: boolean;
}

function AchievedChip({ milestone, achievedAt, isRecent }: AchievedChipProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.li
      initial={isRecent && !prefersReducedMotion ? { scale: 0.8, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 18 }}
      className={`relative flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${
        isRecent
          ? 'border-amber-400 bg-gradient-to-r from-amber-50 to-yellow-100 text-amber-900 shadow-sm shadow-amber-400/40 ring-2 ring-amber-300/70 dark:border-amber-500 dark:from-amber-900/40 dark:to-yellow-900/20 dark:text-amber-100 dark:ring-amber-500/40'
          : 'border-purple-200 bg-purple-50 text-purple-900 dark:border-purple-800/60 dark:bg-purple-900/20 dark:text-purple-100'
      }`}
    >
      <span aria-hidden>{milestone.emoji}</span>
      <span className="font-semibold">{milestone.title}</span>
      {achievedAt && (
        <span className="text-[10px] opacity-70 tabular-nums">{formatAchievedDate(achievedAt)}</span>
      )}
      {isRecent && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400 px-1.5 text-[9px] font-bold uppercase text-amber-950">
          <Sparkles className="h-2.5 w-2.5" aria-hidden />
          New
        </span>
      )}
    </motion.li>
  );
}

function LockedChip({ milestone }: { milestone: Milestone }) {
  return (
    <li className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-400 grayscale dark:border-gray-600 dark:text-gray-500">
      <span aria-hidden className="opacity-50">
        {milestone.emoji}
      </span>
      <span>{milestone.title}</span>
    </li>
  );
}

function ProgressBar({ progress }: { progress: MilestoneProgress }) {
  const prefersReducedMotion = useReducedMotion();
  const { next, value, track, progressToNext } = progress;
  const percent = Math.round(progressToNext * 100);

  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
        <span className="tabular-nums">
          {next ? `${value} / ${next.threshold} ${METRIC_UNITS[track.metric]}` : 'Every milestone unlocked'}
        </span>
        {next && <span className="truncate font-medium">Next: {next.title}</span>}
      </div>
      <div
        role="progressbar"
        aria-label={`${track.label} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
      >
        <motion.div
          initial={prefersReducedMotion ? false : { width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className={`h-full rounded-full ${
            next
              ? 'bg-gradient-to-r from-purple-500 to-fuchsia-500'
              : 'bg-gradient-to-r from-amber-400 to-yellow-500'
          }`}
        />
      </div>
    </div>
  );
}

interface TrackCardProps {
  progress: MilestoneProgress;
  achievedAtById: Map<string, string>;
  nowMs: number;
}

function TrackCard({ progress, achievedAtById, nowMs }: TrackCardProps) {
  const { track, achieved } = progress;
  const achievedIds = new Set(achieved.map((m) => m.id));
  const locked = ALL_MILESTONES.filter((m) => m.metric === track.metric && !achievedIds.has(m.id));

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4 dark:border-gray-700 dark:bg-gray-800/60">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
          <span aria-hidden className="text-lg">
            {track.emoji}
          </span>
          {track.label}
        </p>
        <span className="text-xs font-bold tabular-nums text-gray-500 dark:text-gray-400">
          {achieved.length}/{track.thresholds.length}
        </span>
      </div>
      <ul className="flex flex-wrap gap-1.5">
        {achieved.map((milestone) => {
          const achievedAt = achievedAtById.get(milestone.id);
          return (
            <AchievedChip
              key={milestone.id}
              milestone={milestone}
              achievedAt={achievedAt}
              isRecent={isRecentlyAchieved(achievedAt, nowMs)}
            />
          );
        })}
        {locked.map((milestone) => (
          <LockedChip key={milestone.id} milestone={milestone} />
        ))}
      </ul>
      <ProgressBar progress={progress} />
    </div>
  );
}

function MilestonesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-busy="true" aria-label="Loading milestones">
      {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
        <div key={index} className="h-28 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700/60" />
      ))}
    </div>
  );
}

export default function MilestonesSection({ stats }: MilestonesSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  useScrollToMilestonesHash(sectionRef, !!stats);

  const tracks = stats
    ? milestoneProgress(
        toMilestoneStats(stats),
        stats.milestones.map((m) => m.id)
      )
    : [];
  const achievedAtById = new Map((stats?.milestones ?? []).map((m) => [m.id, m.achievedAt]));
  const unlockedCount = tracks.reduce((sum, t) => sum + t.achieved.length, 0);
  const nowMs = Date.now();

  return (
    <section
      id={MILESTONES_SECTION_ID}
      ref={sectionRef}
      aria-labelledby="milestones-heading"
      className="scroll-mt-20 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3
          id="milestones-heading"
          className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"
        >
          <Award className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Milestones
        </h3>
        {stats && (
          <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold tabular-nums text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
            {unlockedCount} / {ALL_MILESTONES.length} unlocked
          </span>
        )}
      </div>

      {stats ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {tracks.map((progress) => (
            <TrackCard
              key={progress.track.metric}
              progress={progress}
              achievedAtById={achievedAtById}
              nowMs={nowMs}
            />
          ))}
        </div>
      ) : (
        <MilestonesSkeleton />
      )}
    </section>
  );
}
