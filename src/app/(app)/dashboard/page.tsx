'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { useMatchStore } from '@/lib/store/matchStore';
import { useFriendsStore } from '@/lib/store/friendsStore';
import { useUIStore } from '@/lib/store/uiStore';
import SelfStatsCard from '@/components/dashboard/SelfStatsCard';
import IncomingRequestsPanel from '@/components/dashboard/IncomingRequestsPanel';
import FriendsList from '@/components/dashboard/FriendsList';
import FindFriendsTab from '@/components/dashboard/FindFriendsTab';
import MatchListItem from '@/components/dashboard/MatchListItem';

export default function DashboardPage() {
  const { user, isLoading } = useAuth(true);
  const { matches, fetchMatches } = useMatchStore();
  const { friends, fetchFriends, fetchIncomingRequests, addFriend } =
    useFriendsStore();
  const { addToast } = useUIStore();
  const [tab, setTab] = useState<'friends' | 'find'>('friends');
  const [stats, setStats] = useState({
    matchesCreated: 0,
    matchesJoined: 0,
    matchesWon: 0,
  });

  useEffect(() => {
    if (user) {
      fetchMatches();
      fetchFriends();
      fetchIncomingRequests();
    }
  }, [user, fetchMatches, fetchFriends, fetchIncomingRequests]);

  useEffect(() => {
    if (matches && user) {
      const created = matches.filter((m) => m.creatorId === user.id).length;
      const joined = matches.filter(
        (m) =>
          m.creatorId !== user.id &&
          m.roster.some((r) => r.userId === user.id)
      ).length;
      setStats((prev) => ({
        ...prev,
        matchesCreated: created,
        matchesJoined: joined,
      }));
    }
  }, [matches, user]);

  useEffect(() => {
    if (!user) return;
    const loadWins = async () => {
      const res = await fetch(`/api/users/${user.username}/stats`);
      if (!res.ok) return;
      const data = await res.json();
      setStats((prev) => ({ ...prev, matchesWon: data.stats.wins }));
    };
    loadWins();
  }, [user]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  const handleAddFriend = async (userId: string, name: string) => {
    await addFriend(userId);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Self Stats */}
      {user && <SelfStatsCard user={user} stats={stats} />}

      {/* Incoming Requests */}
      <IncomingRequestsPanel />

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/matches/create"
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
        >
          Create Match
        </Link>
        <Link
          href="/matches/join"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Join Match
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Your Matches */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Your Matches
          </h2>
          <div className="space-y-3">
            {matches.length > 0 ? (
              matches.slice(0, 10).map((match) => (
                <MatchListItem
                  key={match.id}
                  match={match}
                  isCreator={match.creatorId === user?.id}
                />
              ))
            ) : (
              <p className="text-gray-600 dark:text-gray-400 py-8 text-center">
                No matches yet.
              </p>
            )}
          </div>
        </div>

        {/* Friends Sidebar */}
        <div className="space-y-6">
          {/* Friends Tab */}
          <div>
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
            {tab === 'find' && (
              <FindFriendsTab onAddFriend={handleAddFriend} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
