'use client';

import { useCallback, useState } from 'react';
import { Timer } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import SegmentedToggle from '@/components/profile/SegmentedToggle';
import { useAuth } from '@/lib/hooks/useAuth';
import { useFastestRecordsQuery } from '@/lib/queries/records';
import { ALL_GAMES_KEY } from '@/lib/games/catalog';
import { APP_TIME_ZONE } from '@/lib/domain/streaks';
import type { FastestRecordView, LeaderboardScope, RecordProgressView, RecordSubject } from '@/types';
import RecordFlipCard from './RecordFlipCard';
import { RECORD_TRACKS, unitFor, type RecordTrackStyle } from './recordTracks';

const ALL_GAMES_LABEL = 'All included';
const ALL_GAMES_OPTION = { value: ALL_GAMES_KEY, label: ALL_GAMES_LABEL };

const SCOPE_OPTIONS: { value: LeaderboardScope; label: string }[] = [
  { value: 'friends', label: 'Friends' },
  { value: 'global', label: 'Global' },
];

const SCOPE_LABELS: Record<LeaderboardScope, string> = { friends: 'Among friends', global: 'Everyone' };

function formatRecordDate(at: string): string {
  return new Date(at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: APP_TIME_ZONE,
  });
}

interface RecordRowProps {
  record: FastestRecordView;
  track: RecordTrackStyle;
  viewerId?: string;
  subject: RecordSubject;
  subjectProgress: RecordProgressView | null;
  scopeLabel: string;
  formatLabel: string;
}

function shortSubjectName(subject: RecordSubject): string {
  return subject.isViewer ? 'You' : subject.name.trim().split(/\s+/)[0] || subject.name;
}

function RecordRow({ record, track, viewerId, subject, subjectProgress, scopeLabel, formatLabel }: RecordRowProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { holder, subjectReached, threshold } = record;
  const subjectHolds = holder.userId === subject.userId;

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        title="Tap to compare with the record"
        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
          subjectHolds
            ? 'border-amber-300 bg-amber-50/80 dark:border-amber-700/70 dark:bg-amber-900/15'
            : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40'
        }`}
      >
        <span
          className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${track.badge}`}
        >
          <span className="text-lg font-black leading-none tabular-nums">{threshold.toLocaleString('en-IN')}</span>
          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide opacity-90">
            {unitFor(threshold, ['win', 'wins'])}
          </span>
        </span>

        <span className="flex min-w-0 flex-1 items-center gap-2">
          <Avatar name={holder.name} profilePicUrl={holder.profilePicUrl} size={28} />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-gray-900 dark:text-white">
              {holder.name}
              {subjectHolds && subject.isViewer && <span className="ml-1 text-xs font-medium text-amber-700 dark:text-amber-400">(you)</span>}
            </span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">{formatRecordDate(holder.at)}</span>
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className="block text-xl font-black leading-none tabular-nums text-gray-900 dark:text-white">
            {holder.count.toLocaleString('en-IN')}
          </span>
          <span className="block text-[11px] text-gray-500 dark:text-gray-400">
            {unitFor(holder.count, track.spentUnit)}
          </span>
          {subjectReached && !subjectHolds && (
            <span className="mt-1 block text-[11px] font-medium tabular-nums text-violet-700 dark:text-violet-300">
              {shortSubjectName(subject)}: {subjectReached.count.toLocaleString('en-IN')}
            </span>
          )}
        </span>
      </button>
      {open && (
        <RecordFlipCard
          record={record}
          track={track}
          scopeLabel={scopeLabel}
          formatLabel={formatLabel}
          viewerId={viewerId}
          subject={subject}
          subjectProgress={subjectProgress}
          onClose={close}
        />
      )}
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

export default function FastestRecords({ subjectUsername }: { subjectUsername?: string }) {
  const { user } = useAuth();
  const [scope, setScope] = useState<LeaderboardScope>('friends');
  const [gameKey, setGameKey] = useState(ALL_GAMES_KEY);
  const { data, isPending, isError, isPlaceholderData } = useFastestRecordsQuery(gameKey, scope, subjectUsername);
  const games = data?.games ?? [];
  const formatLabel = games.find((game) => game.key === gameKey)?.name ?? ALL_GAMES_LABEL;

  return (
    <section
      aria-labelledby="fastest-records-heading"
      className="rounded-xl bg-white p-4 shadow-lg dark:bg-gray-800 sm:p-6"
    >
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 id="fastest-records-heading" className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <Timer className="h-5 w-5 text-violet-600 dark:text-violet-400" aria-hidden />
              Fastest to
            </h3>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Fewest matches or games to get there. Tap a record to compare.
            </p>
          </div>
          <div className="self-start">
            <SegmentedToggle ariaLabel="Records scope" options={SCOPE_OPTIONS} value={scope} onChange={setScope} />
          </div>
        </div>
        {games.length > 1 && (
          <div className="max-w-full self-start overflow-x-auto">
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
          {RECORD_TRACKS.map((track) => {
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
                        subject={data.subject}
                        subjectProgress={data.subjectProgress[track.kind]}
                        scopeLabel={SCOPE_LABELS[scope]}
                        formatLabel={formatLabel}
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
