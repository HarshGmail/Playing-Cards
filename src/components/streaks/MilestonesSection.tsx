'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Award } from 'lucide-react';
import {
  ALL_MILESTONES,
  milestoneProgress,
  type MilestoneProgress,
  type MilestoneStats,
} from '@/lib/domain/milestones';
import type { UserStats } from '@/lib/queries/users';
import MilestoneCard from '@/components/milestones/MilestoneCard';

export const MILESTONES_SECTION_ID = 'milestones';

const MILESTONES_HASH = `#${MILESTONES_SECTION_ID}`;
const SKELETON_CARD_COUNT = 6;
const RECENT_MILESTONE_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

function isRecentlyAchieved(achievedAt: string | undefined, nowMs: number): boolean {
  if (!achievedAt) return false;
  return nowMs - Date.parse(achievedAt) <= RECENT_MILESTONE_WINDOW_MS;
}

interface MilestonesSectionProps {
  stats?: UserStats;
}

function toMilestoneStats(stats: UserStats): MilestoneStats {
  return {
    gamesWon: stats.gamesWon,
    matchWins: stats.matchWins,
    matchesPlayed: stats.matchesPlayed,
    gamesPlayed: stats.gamesPlayed,
    podiumFinishes: stats.podiums.first + stats.podiums.second + stats.podiums.third,
    peakRating: stats.peakRating,
    longestGameStreak: stats.streaks.longestGameStreak,
    longestMatchStreak: stats.streaks.longestMatchStreak,
    longestDayStreak: stats.streaks.longestDayStreak,
  };
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

function TrackBlock({
  progress,
  achievedAtById,
  nowMs,
}: {
  progress: MilestoneProgress;
  achievedAtById: Map<string, string>;
  nowMs: number;
}) {
  const { track, value, achieved, next, progressToNext } = progress;
  const achievedIds = new Set(achieved.map((m) => m.id));
  const levels = ALL_MILESTONES.filter((m) => m.metric === track.metric);
  const ordered = [...levels].sort((a, b) => Number(achievedIds.has(b.id)) - Number(achievedIds.has(a.id)));
  const percent = Math.round(progressToNext * 100);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
          <span aria-hidden className="text-lg">
            {track.emoji}
          </span>
          {track.label}
          <span className="text-xs font-bold tabular-nums text-gray-500 dark:text-gray-400">
            {achieved.length}/{track.levels.length}
          </span>
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 tabular-nums">
          {next ? `${(next.threshold - value).toLocaleString('en-IN')} more to go` : 'All unlocked'}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={`${track.label} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ordered.map((milestone) => {
          const achievedAt = achievedAtById.get(milestone.id);
          const isNext = next?.id === milestone.id;
          return (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              unlocked={achievedIds.has(milestone.id)}
              achievedAt={achievedAt}
              isNew={isRecentlyAchieved(achievedAt, nowMs)}
              progressPercent={isNext ? Math.round(progressToNext * 100) : undefined}
              progressLabel={
                isNext
                  ? `${value.toLocaleString('en-IN')} / ${milestone.threshold.toLocaleString('en-IN')}`
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function MilestonesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading milestones">
      {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
        <div key={index} className="h-36 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-700/60" />
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
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3
          id="milestones-heading"
          className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"
        >
          <Award className="w-5 h-5 text-amber-500" />
          Milestones
        </h3>
        {stats && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold tabular-nums text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            {unlockedCount} / {ALL_MILESTONES.length} unlocked
          </span>
        )}
      </div>

      {stats ? (
        <div className="space-y-8">
          {tracks.map((progress) => (
            <TrackBlock
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
