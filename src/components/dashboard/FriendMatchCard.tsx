'use client';

import Link from 'next/link';
import { ChevronRight, Crown, Trophy, Users } from 'lucide-react';
import PlayerNameLink from '@/components/common/PlayerNameLink';
import { StatusPill } from '@/components/calendar/MatchCard';
import { formatShortDate } from '@/components/calendar/format';
import { POSITION_CLASSES } from '@/components/match/positionClasses';
import { getPositionColor } from '@/lib/domain/positionColor';
import type { FriendMatchCard as FriendMatchSummary } from '@/types';

const MAX_FRIEND_NAMES = 2;

function friendsHeadline(friendNames: string[]): string {
  if (friendNames.length === 0) return 'Friends';
  const shown = friendNames.slice(0, MAX_FRIEND_NAMES).join(' & ');
  const more = friendNames.length - MAX_FRIEND_NAMES;
  return more > 0 ? `${shown} +${more}` : shown;
}

function ResultLine({ match }: { match: FriendMatchSummary }) {
  const [first] = match.standings;
  if (!first) return null;
  const isLive = match.status === 'active';
  const Icon = isLive ? Crown : Trophy;
  return (
    <p
      className={`flex min-w-0 items-center gap-1.5 text-xs font-medium ${
        isLive ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">{isLive ? `${first.name} leads` : `${first.name} won`}</span>
    </p>
  );
}

export default function FriendMatchCard({ match }: { match: FriendMatchSummary }) {
  const isLive = match.status === 'active';
  const playedOn = new Date(match.endedAt ?? match.createdAt);
  const matchHref = `/matches/${match.id}`;

  return (
    <article
      className={`flex w-[17rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-gray-900 sm:w-[19rem] ${
        isLive ? 'border-emerald-300 dark:border-emerald-700/70' : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <p className="truncate bg-gray-100 px-4 py-2 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
        Match of {friendsHeadline(match.friendNames)}
      </p>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={matchHref} className="min-w-0 hover:underline">
            <p className="truncate font-bold text-gray-900 dark:text-white">{match.name}</p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {match.gameName} · {formatShortDate(playedOn)} · {match.roundsPlayed} rounds
            </p>
          </Link>
          <StatusPill isLive={isLive} />
        </div>

        <ol className="space-y-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
          {match.standings.map((standing) => {
            const colors = POSITION_CLASSES[getPositionColor(standing.position, false, false)];
            return (
              <li key={standing.playerId} className="flex items-center gap-2 text-sm">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${colors.badge}`}
                >
                  {standing.position}
                </span>
                <span className="min-w-0 flex-1 truncate text-gray-800 dark:text-gray-200">
                  <PlayerNameLink
                    userId={standing.playerId}
                    userName={standing.username}
                    displayName={standing.name}
                    profilePicUrl={standing.profilePicUrl}
                    className="text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400"
                  />
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-gray-900 dark:text-white">{standing.total}</span>
              </li>
            );
          })}
        </ol>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          <ResultLine match={match} />
          <span className="flex shrink-0 items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {match.playerCount}
          </span>
        </div>
        <Link
          href={matchHref}
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-gray-100 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        >
          {isLive ? 'Watch live' : 'View result'}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
