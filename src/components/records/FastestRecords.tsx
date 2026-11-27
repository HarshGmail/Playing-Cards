'use client';

import { useState } from 'react';
import { Timer } from 'lucide-react';
import PlayerNameLink from '@/components/common/PlayerNameLink';
import SegmentedToggle from '@/components/profile/SegmentedToggle';
import { useAuth } from '@/lib/hooks/useAuth';
import { useFastestRecordsQuery } from '@/lib/queries/records';
import { ALL_GAMES_KEY } from '@/lib/games/catalog';
import { APP_TIME_ZONE } from '@/lib/domain/streaks';
import type { FastestRecordView, RecordKind } from '@/types';

interface TrackStyle {
  title: string;
  emoji: string;
  spentUnit: [string, string];
  goalUnit: [string, string];
  badge: string;
}

const TRACKS: Array<{ kind: RecordKind } & TrackStyle> = [
  {
    kind: 'matchWins',
    title: 'Match wins',
    emoji: '👑',
    spentUnit: ['match', 'matches'],
    goalUnit: ['match win', 'match wins'],
    badge: 'from-violet-500 to-purple-700',
  },
  {
    kind: 'gameWins',
    title: 'Game wins',
    emoji: '🥇',
    spentUnit: ['game', 'games'],
    goalUnit: ['game win', 'game wins'],
    badge: 'from-amber-400 to-orange-600',
  },
];

const ALL_GAMES_OPTION = { value: ALL_GAMES_KEY, label: 'All included' };

function unitFor(count: number, [singular, plural]: [string, string]): string {
  return count === 1 ? singular : plural;
}

function formatRecordDate(at: string): string {
  return new Date(at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: APP_TIME_ZONE,
  });
}

function RecordRow({ record, track, viewerId }: { record: FastestRecordView; track: TrackStyle; viewerId?: string }) {
  const { holder, viewer, threshold } = record;
  const viewerHolds = holder.userId === viewerId;

  return (
    <li
      className={`flex items-center gap-3 rounded-xl border p-3 transition ${
        viewerHolds
          ? 'border-amber-300 bg-amber-50/80 dark:border-amber-700/70 dark:bg-amber-900/15'
          : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40'
      }`}
    >
      <div
        className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${track.badge}`}
        aria-label={`${threshold} ${unitFor(threshold, track.goalUnit)}`}
      >
        <span className="text-lg font-black leading-none tabular-nums">{threshold.toLocaleString('en-IN')}</span>
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide opacity-90">
          {unitFor(threshold, ['win', 'wins'])}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-gray-900 dark:text-white">
          <PlayerNameLink
            userId={holder.userId}
            userName={holder.username}
            displayName={holder.name}
            profilePicUrl={holder.profilePicUrl}
            className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
          />
          {viewerHolds && <span className="ml-1 text-xs font-medium text-amber-700 dark:text-amber-400">(you)</span>}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{formatRecordDate(holder.at)}</p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-xl font-black leading-none tabular-nums text-gray-900 dark:text-white">
          {holder.count.toLocaleString('en-IN')}
        </p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">{unitFor(holder.count, track.spentUnit)}</p>
        {viewer && !viewerHolds && (
          <p className="mt-1 text-[11px] font-medium tabular-nums text-violet-700 dark:text-violet-300">
            You: {viewer.count.toLocaleString('en-IN')}
          </p>
        )}
      </div>
    </li>
  );
}

function RecordsSkeleton() {
  return (
    <div className="grid gap-5 md:grid-cols-2" aria-busy="true" aria-label="Loading records">
      {[0, 1].map((column) => (
        <div key={column} className="space-y-2">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-[4.5rem] animate-pulse rounded-xl bg-gray-100 dark:bg-gray-700/60" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function FastestRecords() {
  const { user } = useAuth();
  const [gameKey, setGameKey] = useState(ALL_GAMES_KEY);
  const { data, isPending, isError, isPlaceholderData } = useFastestRecordsQuery(gameKey);
  const games = data?.games ?? [];

  return (
    <section
      aria-labelledby="fastest-records-heading"
      className="rounded-xl bg-white p-4 shadow-lg dark:bg-gray-800 sm:p-6"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 id="fastest-records-heading" className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <Timer className="h-5 w-5 text-violet-600 dark:text-violet-400" aria-hidden />
            Fastest to
          </h3>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Fewest matches or games to get there. Records change hands whenever someone does it quicker.
          </p>
        </div>
        {games.length > 1 && (
          <div className="max-w-full overflow-x-auto">
            <SegmentedToggle
              ariaLabel="Records format"
              options={[ALL_GAMES_OPTION, ...games.map((game) => ({ value: game.key, label: game.name }))]}
              value={gameKey}
              onChange={setGameKey}
            />
          </div>
        )}
      </div>

      {isPending && <RecordsSkeleton />}
      {isError && <p className="text-sm text-red-600 dark:text-red-400">Could not load records.</p>}

      {data && (
        <div className={`grid gap-5 md:grid-cols-2 ${isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}`}>
          {TRACKS.map((track) => {
            const records = data[track.kind];
            return (
              <div key={track.kind}>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <span aria-hidden>{track.emoji}</span>
                  {track.title}
                </p>
                {records.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
                    No records yet. Be the first.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {records.map((record) => (
                      <RecordRow
                        key={`${track.kind}-${record.threshold}`}
                        record={record}
                        track={track}
                        viewerId={user?.id}
                      />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
