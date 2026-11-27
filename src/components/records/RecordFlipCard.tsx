'use client';

import Avatar from '@/components/common/Avatar';
import PlayerNameLink from '@/components/common/PlayerNameLink';
import FlipCardModal, { CARD_FACE_STYLE } from '@/components/stats/FlipCardModal';
import { describeRecordCard } from '@/lib/domain/recordCopy';
import { APP_TIME_ZONE } from '@/lib/domain/streaks';
import type { FastestRecordView, RecordProgressView } from '@/types';
import type { RecordTrackStyle } from './recordTracks';

const RECORD_TITLE_ID = 'record-card-title';

interface RecordFlipCardProps {
  record: FastestRecordView;
  track: RecordTrackStyle;
  scopeLabel: string;
  formatLabel: string;
  viewerId?: string;
  viewerProgress: RecordProgressView | null;
  onClose: () => void;
}

function formatLongDate(at: string): string {
  return new Date(at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: APP_TIME_ZONE,
  });
}

export default function RecordFlipCard({
  record,
  track,
  scopeLabel,
  formatLabel,
  viewerId,
  viewerProgress,
  onClose,
}: RecordFlipCardProps) {
  const { holder } = record;
  const viewerHolds = holder.userId === viewerId;
  const copy = describeRecordCard({
    kind: record.kind,
    threshold: record.threshold,
    holder: { name: holder.name, count: holder.count, isViewer: viewerHolds },
    viewerReachedCount: record.viewer?.count ?? null,
    viewerProgress,
  });

  return (
    <FlipCardModal titleId={RECORD_TITLE_ID} onClose={onClose}>
      <div
        style={CARD_FACE_STYLE}
        className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      >
        <div className={`shrink-0 px-6 pb-5 pt-7 text-center ${track.header}`}>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
            {scopeLabel} · {formatLabel}
          </p>
          <div className="mx-auto mt-3 flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-white/25 ring-4 ring-white/40">
            <span aria-hidden className="text-2xl leading-none">
              {track.emoji}
            </span>
            <span className="mt-0.5 text-sm font-black tabular-nums">{record.threshold.toLocaleString('en-IN')}</span>
          </div>
          <h2 id={RECORD_TITLE_ID} className="mt-3 text-lg font-extrabold leading-tight">
            {copy.title}
          </h2>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-5 text-gray-900 [scrollbar-width:thin] dark:text-white">
          <div className="my-auto flex flex-col gap-4">
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/70">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Record holder
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <Avatar name={holder.name} profilePicUrl={holder.profilePicUrl} size={32} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    <PlayerNameLink
                      userId={holder.userId}
                      userName={holder.username}
                      displayName={holder.name}
                      className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                    />
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatLongDate(holder.at)}</p>
                </div>
              </div>
              <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-200">{copy.holderLine}</p>
            </div>

            <div className="rounded-xl bg-violet-50 p-3 dark:bg-violet-900/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">You</p>
              <p className="mt-1 text-sm font-semibold text-violet-950 dark:text-violet-100">{copy.viewerLine}</p>
              {copy.nudge && <p className="mt-1 text-xs text-violet-800/80 dark:text-violet-200/80">{copy.nudge}</p>}
            </div>
          </div>
        </div>
      </div>
    </FlipCardModal>
  );
}
