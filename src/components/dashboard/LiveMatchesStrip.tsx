'use client';

import Link from 'next/link';
import { ChevronRight, Radio } from 'lucide-react';
import { RosterAvatars, StandingLine, StatusPill } from '@/components/calendar/MatchCard';
import { gameDisplayName } from '@/lib/games/catalog';
import { useLiveMatchesQuery } from '@/lib/queries/matches';
import type { MatchSummary } from '@/types';

function roleLabel(match: MatchSummary, currentUserId?: string): string {
  const isPlaying = match.roster.some((entry) => entry.userId === currentUserId);
  if (isPlaying) return 'You are playing';
  return match.creatorId === currentUserId ? 'You are scoring' : 'Watching';
}

function roundLabel(roundsPlayed: number): string {
  return roundsPlayed === 0 ? 'Not started' : `Round ${roundsPlayed}`;
}

function LiveMatchCard({ match, currentUserId }: { match: MatchSummary; currentUserId?: string }) {
  return (
    <Link
      href={`/matches/${match.id}`}
      className="group flex w-[17rem] shrink-0 snap-start flex-col gap-2 rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-emerald-700/70 dark:from-emerald-900/25 dark:to-gray-900 sm:w-[19rem]"
    >
      <div className="flex items-center justify-between gap-2">
        <StatusPill isLive />
        <span className="text-xs font-medium tabular-nums text-gray-500 dark:text-gray-400">
          {roundLabel(match.roundsPlayed)}
        </span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-base font-bold text-gray-900 dark:text-white">{match.name}</p>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
          {gameDisplayName(match.gameType, match.gameLabel)} · {roleLabel(match, currentUserId)}
        </p>
      </div>
      <StandingLine match={match} />
      <div className="mt-auto flex items-center justify-between pt-1">
        <RosterAvatars roster={match.roster} />
        <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-emerald-700 group-hover:gap-1.5 transition-all dark:text-emerald-300">
          Open
          <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

export default function LiveMatchesStrip({ currentUserId }: { currentUserId?: string }) {
  const { data: matches = [] } = useLiveMatchesQuery();
  if (matches.length === 0) return null;

  return (
    <section aria-labelledby="live-matches-heading">
      <h2 id="live-matches-heading" className="mb-3 flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
        <Radio className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
        Live now
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold tabular-nums text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          {matches.length}
        </span>
      </h2>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {matches.map((match) => (
          <LiveMatchCard key={match.id} match={match} currentUserId={currentUserId} />
        ))}
      </div>
    </section>
  );
}
