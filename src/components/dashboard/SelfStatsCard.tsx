'use client';

import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { User } from '@/types';
import { useUserStatsQuery } from '@/lib/queries/users';
import { StreakBadges } from '@/components/streaks/StreakBadge';
import Avatar from '@/components/common/Avatar';
import { formatWinPct } from '@/lib/domain/ratingTier';
import { findMilestone, type Milestone } from '@/lib/domain/milestones';
import { MILESTONES_URL } from '@/lib/notifications/format';

interface SelfStatsCardProps {
  user: User;
}

interface StatTileProps {
  value: string;
  label: string;
}

function StatTile({ value, label }: StatTileProps) {
  return (
    <div className="rounded-2xl bg-white/15 px-3 py-3 text-center ring-1 ring-white/20 backdrop-blur-sm">
      <p className="text-2xl font-black tabular-nums sm:text-3xl">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-white/75">{label}</p>
    </div>
  );
}

function latestMilestone(milestones: Array<{ id: string; achievedAt: string }>): Milestone | null {
  const latest = [...milestones].sort((a, b) => Date.parse(b.achievedAt) - Date.parse(a.achievedAt))[0];
  return latest ? findMilestone(latest.id) : null;
}

export default function SelfStatsCard({ user }: SelfStatsCardProps) {
  const { data: stats } = useUserStatsQuery(user.username);
  const latest = stats ? latestMilestone(stats.milestones) : null;
  const firstName = user.name.split(' ')[0];

  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-5 text-white shadow-xl sm:p-7">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-amber-300/20 blur-3xl" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-white/20 p-1 ring-2 ring-white/40">
            <Avatar name={user.name} profilePicUrl={user.profilePicUrl} size={64} fallbackClassName="bg-white text-violet-700" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/80">Hey {firstName} 👋</p>
            <h2 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xl font-black tracking-tight sm:text-3xl">
              {user.name}
              {stats && (
                <StreakBadges
                  gameStreak={stats.streaks.currentGameStreak}
                  matchStreak={stats.streaks.currentMatchStreak}
                />
              )}
            </h2>
            <p className="text-sm text-white/75">@{user.username}</p>
            {latest && (
              <Link
                href={MILESTONES_URL}
                className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-amber-300/90 px-3 py-1 text-xs font-bold text-amber-950 shadow-sm transition hover:bg-amber-200"
              >
                <Trophy className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">
                  {latest.emoji} {latest.title}
                </span>
              </Link>
            )}
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:w-[26rem]">
            <StatTile value={String(Math.round(stats.rating))} label="Rating" />
            <StatTile value={String(stats.matchWins)} label="Match wins" />
            <StatTile value={formatWinPct(stats.winPct)} label="Win %" />
          </div>
        )}
      </div>
    </section>
  );
}
