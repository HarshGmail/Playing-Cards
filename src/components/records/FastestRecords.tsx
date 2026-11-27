'use client';

import { Timer } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import PlayerNameLink from '@/components/common/PlayerNameLink';
import { useAuth } from '@/lib/hooks/useAuth';
import { useFastestRecordsQuery } from '@/lib/queries/records';
import { recordGoal, recordSpent } from '@/lib/domain/recordCopy';
import { APP_TIME_ZONE } from '@/lib/domain/streaks';
import type { FastestRecordView, RecordKind } from '@/types';

const COLUMNS: Array<{ kind: RecordKind; title: string; emoji: string }> = [
  { kind: 'matchWins', title: 'Match wins', emoji: '👑' },
  { kind: 'gameWins', title: 'Game wins', emoji: '🥇' },
];

function formatRecordDate(at: string): string {
  return new Date(at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: APP_TIME_ZONE,
  });
}

function RecordRow({ record, viewerId }: { record: FastestRecordView; viewerId?: string }) {
  const { holder, viewer, kind, threshold } = record;
  const viewerHolds = holder.userId === viewerId;

  return (
    <li
      className={`rounded-lg px-3 py-2.5 ${
        viewerHolds ? 'bg-amber-50 ring-1 ring-amber-300 dark:bg-amber-900/20 dark:ring-amber-700' : 'bg-gray-50 dark:bg-gray-800/60'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Fastest to {recordGoal(kind, threshold)}
      </p>
      <div className="mt-1 flex items-center gap-2 min-w-0">
        <Avatar name={holder.name} profilePicUrl={holder.profilePicUrl} size={24} />
        <span className="min-w-0 truncate font-medium text-gray-900 dark:text-white">
          <PlayerNameLink
            userId={holder.userId}
            userName={holder.username}
            displayName={holder.name}
            profilePicUrl={holder.profilePicUrl}
            className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
          />
          {viewerHolds && <span className="ml-1 text-xs text-amber-700 dark:text-amber-400">(you)</span>}
        </span>
        <span className="ml-auto shrink-0 text-right text-sm font-bold tabular-nums text-gray-900 dark:text-white">
          {recordSpent(kind, holder.count)}
        </span>
      </div>
      <p className="mt-0.5 flex justify-between gap-2 text-[11px] text-gray-500 dark:text-gray-400">
        <span>{formatRecordDate(holder.at)}</span>
        {viewer && !viewerHolds && <span className="tabular-nums">You: {recordSpent(kind, viewer.count)}</span>}
      </p>
    </li>
  );
}

export default function FastestRecords({ gameKey }: { gameKey: string }) {
  const { user } = useAuth();
  const { data, isPending, isError } = useFastestRecordsQuery(gameKey);

  return (
    <section aria-labelledby="fastest-records-heading" className="mt-6 border-t border-gray-200 pt-5 dark:border-gray-700">
      <h4 id="fastest-records-heading" className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
        <Timer className="h-5 w-5 text-violet-600 dark:text-violet-400" aria-hidden />
        Fastest to
      </h4>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
        Fewest matches or games to get there. Anyone can break these.
      </p>

      {isPending && <div className="mt-3 h-24 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" aria-hidden />}
      {isError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">Could not load records.</p>}

      {data && (
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {COLUMNS.map(({ kind, title, emoji }) => {
            const records = data[kind];
            return (
              <div key={kind}>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <span aria-hidden>{emoji}</span>
                  {title}
                </p>
                {records.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No records yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {records.map((record) => (
                      <RecordRow key={`${kind}-${record.threshold}`} record={record} viewerId={user?.id} />
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
