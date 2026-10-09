'use client';

import type { ReactNode } from 'react';
import { Flame } from 'lucide-react';
import { STREAK_TIERS, STREAK_TIER_LABELS } from '@/lib/domain/streaks';
import { StreakBadges } from '@/components/streaks/StreakBadge';
import type { UserStats } from '@/lib/queries/users';

interface StreakStatsCardProps {
  stats?: UserStats;
}

interface HighlightTileProps {
  emoji: string;
  label: string;
  value: ReactNode;
  caption?: string;
  toneClasses: string;
}

function HighlightTile({ emoji, label, value, caption, toneClasses }: HighlightTileProps) {
  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${toneClasses}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
        <span aria-hidden className="mr-1">
          {emoji}
        </span>
        {label}
      </p>
      <p className="mt-1 text-3xl font-extrabold tabular-nums text-gray-900 dark:text-white">{value}</p>
      {caption && <p className="text-xs text-gray-600 dark:text-gray-400">{caption}</p>}
    </div>
  );
}

function TierTile({ label, count }: { label: string; count: number }) {
  const isEarned = count > 0;
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-center ${
        isEarned
          ? 'border-orange-200 bg-orange-50 dark:border-orange-800/60 dark:bg-orange-900/20'
          : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60'
      }`}
    >
      <p
        className={`text-xl font-bold tabular-nums ${
          isEarned ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 dark:text-gray-500'
        }`}
      >
        {count}
      </p>
      <p className="text-[11px] leading-tight text-gray-600 dark:text-gray-400">{label}</p>
    </div>
  );
}

export default function StreakStatsCard({ stats }: StreakStatsCardProps) {
  if (!stats) return null;
  const { streaks } = stats;

  return (
    <section
      aria-labelledby="streak-stats-heading"
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3
          id="streak-stats-heading"
          className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"
        >
          <Flame className="w-5 h-5 text-orange-500" />
          Streaks
        </h3>
        <StreakBadges
          gameStreak={streaks.currentGameStreak}
          matchStreak={streaks.currentMatchStreak}
        />
      </div>

      <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-3 mb-3">
        <HighlightTile
          emoji="🔥"
          label="Longest game streak"
          value={streaks.longestGameStreak}
          caption="game wins in a row"
          toneClasses="border-orange-200 dark:border-orange-800/60 bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/30"
        />
        <HighlightTile
          emoji="⚡"
          label="Longest match streak"
          value={streaks.longestMatchStreak}
          caption="match wins in a row"
          toneClasses="border-yellow-200 dark:border-yellow-800/60 bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/30"
        />
        <HighlightTile
          emoji="📅"
          label="Days active"
          value={streaks.currentDayStreak}
          caption={`current streak, best ${streaks.longestDayStreak}`}
          toneClasses="border-blue-200 dark:border-blue-800/60 bg-gradient-to-br from-blue-50 to-sky-100 dark:from-blue-900/20 dark:to-sky-900/30"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {STREAK_TIERS.map((tier) => (
          <TierTile key={tier} label={STREAK_TIER_LABELS[tier]} count={streaks.gameStreakCounts[tier]} />
        ))}
      </div>
    </section>
  );
}
