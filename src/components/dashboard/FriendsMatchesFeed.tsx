'use client';

import { Crown, Trophy, Users } from 'lucide-react';
import PlayerNameLink from '@/components/common/PlayerNameLink';
import { StatusPill } from '@/components/calendar/MatchCard';
import { formatShortDate } from '@/components/calendar/format';
import { POSITION_CLASSES } from '@/components/match/positionClasses';
import { getPositionColor } from '@/lib/domain/positionColor';
import { useFriendsMatchesQuery } from '@/lib/queries/matches';
import type { FriendMatchCard } from '@/types';

const MAX_FRIEND_NAMES = 2;

function friendsHeadline(friendNames: string[]): string {
  if (friendNames.length === 0) return 'Friends';
  const shown = friendNames.slice(0, MAX_FRIEND_NAMES).join(' & ');
  const more = friendNames.length - MAX_FRIEND_NAMES;
  return more > 0 ? `${shown} +${more}` : shown;
}

function ResultLine({ match }: { match: FriendMatchCard }) {
  const [first] = match.standings;
  if (!first) return null;
  const isLive = match.status === 'active';
  const Icon = isLive ? Crown : Trophy;
  return (
    <p
      className={`flex items-center gap-1.5 text-xs font-medium ${
        isLive ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'
      }`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">{isLive ? `${first.name} leads` : `${first.name} won`}</span>
    </p>
  );
}

function FeedCard({ match }: { match: FriendMatchCard }) {
  const isLive = match.status === 'active';
  const playedOn = new Date(match.endedAt ?? match.createdAt);

  return (
    <article className="flex w-[17rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900 sm:w-[19rem]">
      <p className="truncate bg-gray-100 px-4 py-2 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
        Match of {friendsHeadline(match.friendNames)}
      </p>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-bold text-gray-900 dark:text-white">{match.name}</p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {match.gameName} · {formatShortDate(playedOn)} · {match.roundsPlayed} rounds
            </p>
          </div>
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
      </div>
    </article>
  );
}

export default function FriendsMatchesFeed() {
  const { data: matches = [] } = useFriendsMatchesQuery();
  if (matches.length === 0) return null;

  return (
    <section aria-labelledby="friends-matches-heading">
      <h2 id="friends-matches-heading" className="mb-3 text-xl font-bold text-gray-900 dark:text-white">
        Friends&apos; matches
      </h2>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {matches.map((match) => (
          <FeedCard key={match.id} match={match} />
        ))}
      </div>
    </section>
  );
}
