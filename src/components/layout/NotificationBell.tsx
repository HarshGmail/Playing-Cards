'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import type { Notification } from '@/types';
import {
  useNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} from '@/lib/queries/notifications';
import { useMatchInvitesQuery } from '@/lib/queries/matchInvites';
import NotificationItem from './NotificationItem';

const DROPDOWN_ITEM_LIMIT = 6;
const MAX_BADGE_COUNT = 9;

interface NotificationBellProps {
  enabled?: boolean;
}

export default function NotificationBell({ enabled = true }: NotificationBellProps) {
  const { data: notifications = [] } = useNotificationsQuery(enabled);
  const { data: invites = [] } = useMatchInvitesQuery(enabled);
  const markAsRead = useMarkAsReadMutation();
  const markAllAsRead = useMarkAllAsReadMutation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const pendingInviteByMatchId = new Map(invites.map((invite) => [invite.matchId, invite]));
  const visible = notifications.slice(0, DROPDOWN_ITEM_LIMIT);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const handleOpen = (notification: Notification) => {
    if (!notification.read) markAsRead.mutate(notification.id);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={isOpen}
        className="relative text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-2 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center font-bold">
            {unreadCount > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-16 sm:top-full sm:mt-2 sm:w-96 max-h-[80vh] flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <p className="font-semibold text-gray-900 dark:text-white">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
                className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto p-2 space-y-2">
            {visible.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                You are all caught up
              </p>
            ) : (
              visible.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  pendingInvite={
                    notification.type === 'match-invite'
                      ? pendingInviteByMatchId.get(String(notification.payload.matchId ?? ''))
                      : undefined
                  }
                  onOpen={handleOpen}
                  compact
                />
              ))
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setIsOpen(false)}
            className="block text-center text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 rounded-b-xl"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
