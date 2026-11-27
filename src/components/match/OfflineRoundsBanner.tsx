import { CloudOff, Loader2 } from 'lucide-react';

interface OfflineRoundsBannerProps {
  pendingCount: number;
  syncing: boolean;
}

function roundsLabel(count: number): string {
  return count === 1 ? '1 round' : `${count} rounds`;
}

export default function OfflineRoundsBanner({ pendingCount, syncing }: OfflineRoundsBannerProps) {
  if (pendingCount === 0) return null;
  return (
    <div
      role="status"
      className="mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200"
    >
      {syncing ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      ) : (
        <CloudOff className="h-4 w-4 shrink-0" aria-hidden />
      )}
      <span>
        {syncing
          ? `Syncing ${roundsLabel(pendingCount)}…`
          : `${roundsLabel(pendingCount)} saved on this device. They'll sync as soon as you're back online.`}
      </span>
    </div>
  );
}
