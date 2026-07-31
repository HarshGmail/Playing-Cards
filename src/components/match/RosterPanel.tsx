'use client';

import { useState } from 'react';

interface RosterEntry {
  userId: string;
  userName: string;
  status: 'active' | 'dnf';
  dnfAfterRound: number | null;
}

interface RosterPanelProps {
  matchId: string;
  roster: RosterEntry[];
  isCreator: boolean;
  onChange: () => void;
}

export default function RosterPanel({ matchId, roster, isCreator, onChange }: RosterPanelProps) {
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const handleAction = async (userId: string, action: 'mark-dnf' | 'rejoin') => {
    setPendingUserId(userId);
    setActionError('');
    try {
      const res = await fetch(`/api/matches/${matchId}/roster/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error('Failed to update player status');
      onChange();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update player status');
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <div className="space-y-4">
      {actionError && <p className="text-sm text-red-600">{actionError}</p>}
      {roster.map((entry) => (
        <div
          key={entry.userId}
          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
        >
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{entry.userName}</p>
            {entry.status === 'dnf' && (
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Did Not Finish (after round {entry.dnfAfterRound})
              </p>
            )}
          </div>
          {isCreator && (
            <button
              disabled={pendingUserId === entry.userId}
              onClick={() =>
                handleAction(entry.userId, entry.status === 'dnf' ? 'rejoin' : 'mark-dnf')
              }
              className={`px-3 py-1 text-sm rounded-lg transition disabled:opacity-50 ${
                entry.status === 'dnf'
                  ? 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400'
              }`}
            >
              {entry.status === 'dnf' ? 'Rejoin' : 'Mark DNF'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
