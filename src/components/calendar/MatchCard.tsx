'use client';

import Link from 'next/link';
import { Trophy, Crown, Equal, Users } from 'lucide-react';
import type { MatchSummary } from '@/types';
import Avatar from '@/components/common/Avatar';
import { gameDisplayName, toGameType } from '@/lib/games/catalog';
import type { GameType } from '@/lib/games/catalog';
import { describeMatchStanding, matchTimeSpan } from '@/lib/domain/calendar';
import { formatShortDate, formatSpan, formatTime } from './format';

export type MatchCardVariant = 'full' | 'timeline' | 'chip';

const MAX_AVATARS = 4;
const TIMELINE_COMPACT_HEIGHT_PX = 56;

interface GameAccent {
  bar: string;
  surface: string;
  dot: string;
}

const GAME_ACCENTS: Record<GameType, GameAccent> = {
  'least-count': {
    bar: 'border-l-indigo-500 dark:border-l-indigo-400',
    surface: 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:hover:bg-indigo-500/25',
    dot: 'bg-indigo-500 dark:bg-indigo-400',
  },
  other: {
    bar: 'border-l-amber-500 dark:border-l-amber-400',
    surface: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/15 dark:hover:bg-amber-500/25',
    dot: 'bg-amber-500 dark:bg-amber-400',
  },
};

export function gameAccentFor(match: Pick<MatchSummary, 'gameType'>): GameAccent {
  return GAME_ACCENTS[toGameType(match.gameType)];
}

function StatusPill({ isLive }: { isLive: boolean }) {
  if (isLive) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75 motion-reduce:hidden" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>
        Live
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-300">
      Finished
    </span>
  );
}

function RosterAvatars({ roster }: { roster: MatchSummary['roster'] }) {
  const shown = roster.slice(0, MAX_AVATARS);
  const hiddenCount = roster.length - shown.length;
  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((entry) => (
        <Avatar
          key={entry.userId}
          name={entry.userName}
          profilePicUrl={entry.profilePicUrl}
          size={22}
          className="ring-2 ring-white dark:ring-gray-900"
        />
      ))}
      {hiddenCount > 0 && (
        <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-gray-200 px-1 text-[10px] font-semibold text-gray-700 ring-2 ring-white dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-900">
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}

function StandingLine({ match }: { match: MatchSummary }) {
  const standing = describeMatchStanding(match);
  const base = 'flex min-w-0 items-center gap-1 text-xs';
  if (standing.kind === 'winner') {
    return (
      <p className={`${base} font-medium text-amber-700 dark:text-amber-300`}>
        <Trophy className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
        <span className="truncate">Winner: {standing.name}</span>
      </p>
    );
  }
  if (standing.kind === 'leading') {
    return (
      <p className={`${base} text-gray-700 dark:text-gray-300`}>
        <Crown
          className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
        <span className="truncate">
          Leading: <span className="font-medium">{standing.name}</span> ({standing.total})
        </span>
      </p>
    );
  }
  if (standing.kind === 'tied') {
    return (
      <p className={`${base} text-gray-700 dark:text-gray-300`}>
        <Equal className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
        <span className="truncate">{standing.isFinal ? 'Tied' : `Tied (${standing.total})`}</span>
      </p>
    );
  }
  return <p className={`${base} text-gray-500 dark:text-gray-400`}>No rounds yet</p>;
}

interface MatchCardProps {
  match: MatchSummary;
  now: Date;
  variant?: MatchCardVariant;
  heightPx?: number;
  isCreator?: boolean;
}

export default function MatchCard({
  match,
  now,
  variant = 'full',
  heightPx,
  isCreator,
}: MatchCardProps) {
  const isLive = match.status === 'active';
  const accent = gameAccentFor(match);
  const gameName = gameDisplayName(match.gameType, match.gameLabel);
  const span = matchTimeSpan(match, now);
  const href = `/matches/${match.id}`;
  const focusRing =
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-900';

  if (variant === 'chip') {
    return (
      <Link
        href={href}
        title={`${match.name} · ${gameName}`}
        className={`flex items-center gap-1.5 truncate rounded border-l-[3px] px-1.5 py-0.5 text-[11px] leading-4 text-gray-800 transition-colors dark:text-gray-100 ${accent.bar} ${accent.surface} ${focusRing}`}
      >
        {isLive && (
          <span
            className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500"
            aria-label="Live"
          />
        )}
        {span && (
          <span className="flex-shrink-0 text-gray-500 dark:text-gray-400">
            {formatTime(span.start)}
          </span>
        )}
        <span className="truncate font-medium">{match.name}</span>
      </Link>
    );
  }

  if (variant === 'timeline') {
    const isCompact = heightPx !== undefined && heightPx < TIMELINE_COMPACT_HEIGHT_PX;
    return (
      <Link
        href={href}
        className={`flex h-full flex-col overflow-hidden rounded-md border-l-4 px-2 py-1 text-gray-900 shadow-sm transition-colors dark:text-gray-100 ${accent.bar} ${accent.surface} ${focusRing}`}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          {isLive && (
            <span
              className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500"
              aria-label="Live"
            />
          )}
          <span className="truncate text-xs font-semibold">{match.name}</span>
        </div>
        {!isCompact && (
          <>
            <p className="truncate text-[11px] text-gray-600 dark:text-gray-400">
              {gameName}
              {span && ` · ${formatSpan(span, isLive)}`}
            </p>
            <div className="mt-1 space-y-1">
              <StandingLine match={match} />
              <RosterAvatars roster={match.roster} />
            </div>
          </>
        )}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`block rounded-lg border border-l-4 border-gray-200 bg-white p-3 shadow-sm transition-all hover:-translate-y-px hover:shadow-md dark:border-gray-700 dark:bg-gray-900 ${accent.bar} ${focusRing}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate font-semibold text-gray-900 dark:text-white">{match.name}</h4>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-gray-600 dark:text-gray-400">
            <span
              className={`inline-block h-2 w-2 rounded-full ${accent.dot}`}
              aria-hidden="true"
            />
            <span>{gameName}</span>
            <span aria-hidden="true">·</span>
            <span>
              {match.roundsPlayed} {match.roundsPlayed === 1 ? 'round' : 'rounds'}
            </span>
            {span && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {formatShortDate(span.start)}, {formatSpan(span, isLive)}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {isCreator && (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
              Creator
            </span>
          )}
          <StatusPill isLive={isLive} />
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-3">
        <StandingLine match={match} />
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <RosterAvatars roster={match.roster} />
          {match.roster.length === 0 && (
            <Users className="h-4 w-4 text-gray-400" aria-label="No players" />
          )}
        </div>
      </div>
    </Link>
  );
}
