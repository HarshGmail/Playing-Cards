'use client';

import { useState } from 'react';
import Avatar from '@/components/common/Avatar';
import type { PendingInvite } from '@/types';

interface RosterEntry {
  userId: string;
  userName: string;
  profilePicUrl?: string | null;
  status: 'active' | 'dnf';
  dnfAfterRound: number | null;
}

interface RosterPanelProps {
  matchId: string;
  roster: RosterEntry[];
  /** Invited players who have not answered. Not scoreable until they accept. */
  pendingInvites?: PendingInvite[];
  isCreator: boolean;
  onChange: () => void;
}

export default function RosterPanel({
  matchId,
  roster,
  pendingInvites = [],
  isCreator,
  onChange,
}: RosterPanelProps) {
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
          <div className="flex items-center gap-3">
            <Avatar name={entry.userName} profilePicUrl={entry.profilePicUrl} size={36} />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{entry.userName}</p>
              {entry.status === 'dnf' && (
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Did Not Finish (after round {entry.dnfAfterRound})
                </p>
              )}
            </div>
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

      {pendingInvites.length > 0 && (
        <div className="pt-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Invited ({pendingInvites.length})
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            They join the roster — and can be scored — once they accept.
          </p>
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <div
                key={invite.inviteId}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    name={invite.userName}
                    profilePicUrl={invite.profilePicUrl}
                    size={36}
                    className="opacity-60"
                  />
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-300">
                      {invite.userName}
                    </p>
                    {invite.username && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        @{invite.username}
                      </p>
                    )}
                  </div>
                </div>
                <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                  Awaiting reply
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
