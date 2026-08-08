'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Notification } from '@/types';
import {
  useNotificationsQuery,
  useMarkAllAsReadMutation,
  useMarkAsReadMutation,
} from '@/lib/queries/notifications';
import {
  useMatchInvitesQuery,
  useRespondToInviteMutation,
} from '@/lib/queries/matchInvites';
import { useUIStore } from '@/lib/store/uiStore';

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function getNotificationMessage(notification: Notification): string {
  const p = notification.payload;

  switch (notification.type) {
    case 'friend-request':
      return `${str(p.fromUserName)} sent you a friend request`;
    case 'friend-accepted':
      return `${str(p.toUserName)} accepted your friend request`;
    case 'join-request':
      return `${str(p.userName)} requested to join your match`;
    case 'join-approved':
      return `You were approved to join ${str(p.matchName)}`;
    case 'join-declined':
      return `Your request to join ${str(p.matchName)} was declined`;
    case 'added-to-match':
      return p.role === 'spectator'
        ? `${str(p.invitedByName) || 'Someone'} added you as a spectator of ${str(p.matchName)}`
        : `You were added to ${str(p.matchName)}`;
    case 'match-ended':
      return `${str(p.matchName)} has ended`;
    case 'match-invite':
      return `${str(p.invitedByName) || 'Someone'} invited you to play ${str(p.matchName)}`;
    case 'match-invite-accepted':
      return `${str(p.userName)} accepted your invite to ${str(p.matchName)}`;
    case 'match-invite-declined':
      return `${str(p.userName)} declined your invite to ${str(p.matchName)}`;
    case 'round-scored': {
      const verb = p.edited ? 'corrected' : 'scored';
      const scorer = str(p.scoredByName) || 'The scorer';
      const base = `${scorer} ${verb} round ${p.round} in ${str(p.matchName)}`;
      return typeof p.yourScore === 'number' ? `${base} — you got ${p.yourScore}` : base;
    }
    default:
      return 'New notification';
  }
}

/** The match a notification points at, when the recipient can actually open it. */
function matchLinkFor(notification: Notification): string | null {
  // A match-invite deliberately gets no link: the invitee has no read access to
  // the match until they accept, so the page would 403.
  if (notification.type === 'match-invite') return null;

  const matchId = str(notification.payload.matchId);
  return matchId ? `/matches/${matchId}` : null;
}

export default function NotificationsPage() {
  const { data: notifications = [], isLoading, error } = useNotificationsQuery();
  const { data: invites = [] } = useMatchInvitesQuery();
  const markAsRead = useMarkAsReadMutation();
  const markAllAsRead = useMarkAllAsReadMutation();
  const respond = useRespondToInviteMutation();
  const { addToast } = useUIStore();
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);

  // Invites are keyed by match rather than by the notification's inviteId: a
  // declined-then-re-invited player has a fresh invite id, and the stale
  // notification should still act on the live one.
  const pendingInviteByMatchId = new Map(invites.map((i) => [i.matchId, i]));

  const handleRespond = (
    inviteId: string,
    matchName: string,
    action: 'accept' | 'decline'
  ) => {
    setPendingInviteId(inviteId);
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
        onSettled: () => setPendingInviteId(null),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          {notifications.some((n) => !n.read) && (
            <button
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
              className="text-sm px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition"
            >
              Mark All Read
            </button>
          )}
        </div>

        {error && <p className="text-red-600 mb-4">{error.message}</p>}

        {notifications.length === 0 ? (
          <div className="p-8 bg-white dark:bg-gray-800 rounded-lg text-center">
            <p className="text-gray-600 dark:text-gray-400">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => {
              const invite =
                notif.type === 'match-invite'
                  ? pendingInviteByMatchId.get(str(notif.payload.matchId))
                  : undefined;
              const link = matchLinkFor(notif);
              const message = getNotificationMessage(notif);

              return (
                <div
                  key={notif.id}
                  className={`p-4 rounded-lg border transition ${
                    notif.read
                      ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                  }`}
                  onClick={() => !notif.read && markAsRead.mutate(notif.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p
                        className={
                          notif.read
                            ? 'text-gray-600 dark:text-gray-400'
                            : 'font-medium text-gray-900 dark:text-white'
                        }
                      >
                        {link ? (
                          <Link href={link} className="hover:underline">
                            {message}
                          </Link>
                        ) : (
                          message
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {new Date(notif.createdAt).toLocaleString()}
                      </p>

                      {invite && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRespond(invite.id, invite.matchName, 'accept');
                            }}
                            disabled={pendingInviteId === invite.id}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded text-sm font-medium transition"
                          >
                            Accept
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRespond(invite.id, invite.matchName, 'decline');
                            }}
                            disabled={pendingInviteId === invite.id}
                            className="px-3 py-1 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 disabled:bg-gray-400 text-gray-900 dark:text-white rounded text-sm font-medium transition"
                          >
                            Decline
                          </button>
                        </div>
                      )}

                      {notif.type === 'match-invite' && !invite && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 italic">
                          Already answered
                        </p>
                      )}
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 mt-1 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
