'use client';

import { Radio } from 'lucide-react';
import { useFriendsMatchesQuery, useLiveMatchesQuery } from '@/lib/queries/matches';
import FriendMatchCard from './FriendMatchCard';
import LiveMatchCard from './LiveMatchCard';

export default function RelevantMatches({ currentUserId }: { currentUserId?: string }) {
  const { data: myLiveMatches = [] } = useLiveMatchesQuery();
  const { data: friendMatches = [] } = useFriendsMatchesQuery();
  const liveCount = myLiveMatches.length + friendMatches.filter((match) => match.status === 'active').length;
  if (myLiveMatches.length === 0 && friendMatches.length === 0) return null;

  return (
    <section aria-labelledby="relevant-matches-heading">
      <h2
        id="relevant-matches-heading"
        className="mb-3 flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white"
      >
        Relevant matches
        {liveCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold tabular-nums text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <Radio className="h-3.5 w-3.5" aria-hidden />
            {liveCount} live
          </span>
        )}
      </h2>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {myLiveMatches.map((match) => (
          <LiveMatchCard key={match.id} match={match} currentUserId={currentUserId} />
        ))}
        {friendMatches.map((match) => (
          <FriendMatchCard key={match.id} match={match} />
        ))}
      </div>
    </section>
  );
}
