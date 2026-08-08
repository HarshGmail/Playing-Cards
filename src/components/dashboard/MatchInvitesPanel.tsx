'use client';

import { useState } from 'react';
import Avatar from '@/components/common/Avatar';
import {
  useMatchInvitesQuery,
  useRespondToInviteMutation,
} from '@/lib/queries/matchInvites';
import { useUIStore } from '@/lib/store/uiStore';

export default function MatchInvitesPanel() {
  const { data: invites = [] } = useMatchInvitesQuery();
  const respond = useRespondToInviteMutation();
  const { addToast } = useUIStore();
  // Per-invite rather than the mutation's own isPending: with several invites
  // listed, a shared flag would disable every button whenever one is in flight.
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleRespond = (
    inviteId: string,
    matchName: string,
    action: 'accept' | 'decline'
  ) => {
    setPendingId(inviteId);
    respond.mutate(
      { inviteId, action },
      {
        onSuccess: () => {
          addToast({
            type: 'success',
            message:
              action === 'accept'
                ? `You joined ${matchName}.`
                : `Declined the invite to ${matchName}.`,
          });
        },
        onError: (err: any) => {
          addToast({
            type: 'error',
            message: err?.message || 'Could not respond to the invite. Try again.',
          });
        },
        onSettled: () => setPendingId(null),
      }
    );
  };

  if (invites.length === 0) return null;

  return (
    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
      <h3 className="font-semibold text-green-900 dark:text-green-200 mb-1">
        Match Invites ({invites.length})
      </h3>
      <p className="text-xs text-green-800/80 dark:text-green-300/80 mb-3">
        You are only added to a match — and its effect on your stats — once you accept.
      </p>
      <div className="space-y-2">
        {invites.map((invite) => (
          <div
            key={invite.id}
            className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-700"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                name={invite.invitedByName}
                profilePicUrl={invite.invitedByProfilePicUrl}
                size={36}
              />
              <div className="min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {invite.matchName}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {invite.invitedByName} invited you
                  {invite.roundsPlayed > 0 && ` • ${invite.roundsPlayed} rounds played`}
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleRespond(invite.id, invite.matchName, 'accept')}
                disabled={pendingId === invite.id}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded text-sm font-medium transition"
              >
                Accept
              </button>
              <button
                onClick={() => handleRespond(invite.id, invite.matchName, 'decline')}
                disabled={pendingId === invite.id}
                className="px-3 py-1 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 disabled:bg-gray-400 text-gray-900 dark:text-white rounded text-sm font-medium transition"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
