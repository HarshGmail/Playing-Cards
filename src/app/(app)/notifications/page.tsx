'use client';

import type { MatchInvite, Notification } from '@/types';
import {
  useNotificationsQuery,
  useMarkAllAsReadMutation,
  useMarkAsReadMutation,
} from '@/lib/queries/notifications';
import { useMatchInvitesQuery } from '@/lib/queries/matchInvites';
import { groupByRecency } from '@/lib/notifications/grouping';
import NotificationItem from '@/components/layout/NotificationItem';
import PwaPromptCard from '@/components/pwa/PwaPromptCard';
import { BellRing } from 'lucide-react';

interface NotificationSectionProps {
  heading: string;
  notifications: Notification[];
  pendingInviteByMatchId: Map<string, MatchInvite>;
  onOpen: (notification: Notification) => void;
}

function NotificationSection({
  heading,
  notifications,
  pendingInviteByMatchId,
  onOpen,
}: NotificationSectionProps) {
  if (notifications.length === 0) return null;

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 px-1">
        {heading}
      </h2>
      <div className="space-y-2">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            pendingInvite={
              notification.type === 'match-invite'
                ? pendingInviteByMatchId.get(String(notification.payload.matchId ?? ''))
                : undefined
            }
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}

export default function NotificationsPage() {
  const { data: notifications = [], isLoading, error } = useNotificationsQuery();
  const { data: invites = [] } = useMatchInvitesQuery();
  const markAsRead = useMarkAsReadMutation();
  const markAllAsRead = useMarkAllAsReadMutation();

  const pendingInviteByMatchId = new Map(invites.map((invite) => [invite.matchId, invite]));
  const { today, earlier } = groupByRecency(notifications);

  const handleOpen = (notification: Notification) => {
    if (!notification.read) markAsRead.mutate(notification.id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 sm:py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          {notifications.some((n) => !n.read) && (
            <button
              type="button"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
              className="text-sm px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg transition"
            >
              Mark all read
            </button>
          )}
        </div>

        <PwaPromptCard />

        {error && <p className="text-red-600">{error.message}</p>}

        {notifications.length === 0 ? (
          <div className="p-10 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
            <BellRing className="w-8 h-8 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-700 dark:text-gray-300 font-medium">You are all caught up</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Invites, scored rounds and wins will show up here.
            </p>
          </div>
        ) : (
          <>
            <NotificationSection
              heading="Today"
              notifications={today}
              pendingInviteByMatchId={pendingInviteByMatchId}
              onOpen={handleOpen}
            />
            <NotificationSection
              heading="Earlier"
              notifications={earlier}
              pendingInviteByMatchId={pendingInviteByMatchId}
              onOpen={handleOpen}
            />
          </>
        )}
      </div>
    </div>
  );
}
