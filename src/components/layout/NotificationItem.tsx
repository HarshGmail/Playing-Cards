'use client';

import Link from 'next/link';
import type { MatchInvite, Notification } from '@/types';
import { formatNotification } from '@/lib/notifications/format';
import { formatRelativeTime } from '@/lib/notifications/grouping';
import { appearanceFor } from './notificationAppearance';
import InviteActions from './InviteActions';

interface NotificationItemProps {
  notification: Notification;
  pendingInvite?: MatchInvite;
  onOpen: (notification: Notification) => void;
  compact?: boolean;
}

function InviteStatus({ notification, pendingInvite, compact }: Pick<NotificationItemProps, 'notification' | 'pendingInvite' | 'compact'>) {
  if (notification.type !== 'match-invite') return null;
  if (pendingInvite) return <InviteActions invite={pendingInvite} compact={compact} />;
  return (
    <p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
      Invite answered
    </p>
  );
}

export default function NotificationItem({
  notification,
  pendingInvite,
  onOpen,
  compact = false,
}: NotificationItemProps) {
  const { title, body, url } = formatNotification(notification);
  const { icon: Icon, iconClass, cardClass, unreadCardClass } = appearanceFor(notification.type);
  const isInvite = notification.type === 'match-invite';
  const isGold = notification.type === 'match-won';

  const content = (
    <>
      <p
        className={`text-xs font-semibold uppercase tracking-wide ${
          isGold ? 'text-amber-700 dark:text-amber-300' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        {title}
      </p>
      <p
        className={`mt-0.5 ${compact ? 'text-sm' : 'text-base'} ${
          notification.read
            ? 'text-gray-600 dark:text-gray-400'
            : 'font-medium text-gray-900 dark:text-white'
        }`}
      >
        {body}
      </p>
    </>
  );

  return (
    <div
      className={`rounded-xl border p-3 sm:p-4 transition ${
        notification.read ? cardClass : unreadCardClass
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${iconClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          {isInvite ? (
            <div onClick={() => onOpen(notification)}>{content}</div>
          ) : (
            <Link href={url} onClick={() => onOpen(notification)} className="block hover:opacity-80">
              {content}
            </Link>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {formatRelativeTime(notification.createdAt)}
          </p>
          <InviteStatus notification={notification} pendingInvite={pendingInvite} compact={compact} />
        </div>
        {!notification.read && (
          <span
            aria-label="Unread"
            className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
              isGold ? 'bg-amber-500' : 'bg-violet-600 dark:bg-violet-400'
            }`}
          />
        )}
      </div>
    </div>
  );
}
