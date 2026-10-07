'use client';

import { Check, Loader2, X } from 'lucide-react';
import type { MatchInvite } from '@/types';
import { useRespondToInviteMutation } from '@/lib/queries/matchInvites';
import { useUIStore } from '@/lib/store/uiStore';

type InviteAction = 'accept' | 'decline';

const ACCEPT_CLASS =
  'inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold transition';
const DECLINE_CLASS =
  'inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60 text-gray-700 dark:text-gray-200 text-sm font-medium transition';

interface InviteActionsProps {
  invite: MatchInvite;
  compact?: boolean;
}

export default function InviteActions({ invite, compact = false }: InviteActionsProps) {
  const respond = useRespondToInviteMutation();
  const { addToast } = useUIStore();
  const pendingAction = respond.isPending ? respond.variables?.action : undefined;

  const handleRespond = (action: InviteAction) => {
    respond.mutate(
      { inviteId: invite.id, action },
      {
        onSuccess: () =>
          addToast({
            type: 'success',
            message:
              action === 'accept'
                ? `You joined ${invite.matchName}.`
                : `Declined the invite to ${invite.matchName}.`,
          }),
        onError: (err) =>
          addToast({
            type: 'error',
            message: err.message || 'Could not respond to the invite. Try again.',
          }),
      }
    );
  };

  const sizeClass = compact ? 'flex-1' : 'flex-1 sm:flex-none';

  return (
    <div className="flex gap-2 mt-3">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleRespond('accept');
        }}
        disabled={respond.isPending}
        className={`${ACCEPT_CLASS} ${sizeClass}`}
      >
        {pendingAction === 'accept' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Accept
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleRespond('decline');
        }}
        disabled={respond.isPending}
        className={`${DECLINE_CLASS} ${sizeClass}`}
      >
        {pendingAction === 'decline' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
        Decline
      </button>
    </div>
  );
}
