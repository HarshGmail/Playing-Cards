'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import SelfStatsCard from '@/components/dashboard/SelfStatsCard';
import IncomingRequestsPanel from '@/components/dashboard/IncomingRequestsPanel';
import MatchInvitesPanel from '@/components/dashboard/MatchInvitesPanel';
import FriendsList from '@/components/dashboard/FriendsList';
import FindFriendsTab from '@/components/dashboard/FindFriendsTab';
import MatchCalendar from '@/components/calendar/MatchCalendar';
import NotificationsNudge from '@/components/dashboard/NotificationsNudge';
import QuickActions from '@/components/dashboard/QuickActions';
import RelevantMatches from '@/components/dashboard/RelevantMatches';
import { CalendarDays } from 'lucide-react';

export default function DashboardPage() {
  const { user, isLoading } = useAuth(true);
  // FriendsList and IncomingRequestsPanel each run their own query, so the page
  // does not need to fetch friends or requests itself.
  const [tab, setTab] = useState<'friends' | 'find'>('friends');

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {user && <SelfStatsCard user={user} />}

      <NotificationsNudge />

      <MatchInvitesPanel />

      <IncomingRequestsPanel />

      <QuickActions />

      <RelevantMatches currentUserId={user?.id} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
            <CalendarDays className="h-5 w-5 text-violet-600 dark:text-violet-400" aria-hidden />
            Match history
          </h2>
          <MatchCalendar currentUserId={user?.id} />
        </section>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex gap-2 mb-4 bg-gray-200 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setTab('friends')}
                className={`flex-1 py-2 px-3 rounded font-medium transition-colors text-sm ${
                  tab === 'friends'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Friends
              </button>
              <button
                onClick={() => setTab('find')}
                className={`flex-1 py-2 px-3 rounded font-medium transition-colors text-sm ${
                  tab === 'find'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                Find
              </button>
            </div>

            {tab === 'friends' && <FriendsList />}
            {tab === 'find' && <FindFriendsTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
