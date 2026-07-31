'use client';

import Link from 'next/link';
import { useNotificationsQuery } from '@/lib/queries/notifications';

export default function NotificationBell() {
  const { data: notifications = [] } = useNotificationsQuery();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Link href="/notifications" className="relative">
      <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-2 transition-colors">
        🔔
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </Link>
  );
}
