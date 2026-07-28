'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProfileCard from '@/components/profile/ProfileCard';
import MedalsTable from '@/components/profile/MedalsTable';
import { UserPlus, UserCheck, UserMinus } from 'lucide-react';

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(undefined);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'friend'>('none');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/users/${username}`);
        if (!res.ok) throw new Error('User not found');
        const data = await res.json();
        setUser(data.user);

        const statsRes = await fetch(`/api/users/${username}/stats`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.stats);
        }

        // Check friend status
        const friendsRes = await fetch('/api/friends');
        if (friendsRes.ok) {
          const friendsData = await friendsRes.json();
          const isFriend = friendsData.friends.some((f: any) => f.id === data.user.id);
          if (isFriend) {
            setFriendStatus('friend');
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  const handleAddFriend = async () => {
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: user.id }),
      });
      if (res.ok) {
        setFriendStatus('pending');
      }
    } catch (err) {
      console.error('Failed to send friend request', err);
    }
  };

  const handleRemoveFriend = async () => {
    try {
      const res = await fetch(`/api/friends/${user.id}`, { method: 'DELETE' });
      if (res.ok) {
        setFriendStatus('none');
      }
    } catch (err) {
      console.error('Failed to remove friend', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 flex items-center justify-center">
        <p className="text-red-600">{error || 'User not found'}</p>
      </div>
    );
  }

  const friendButton = (
    <>
      {friendStatus === 'none' && (
        <button
          onClick={handleAddFriend}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition"
        >
          <UserPlus className="w-4 h-4" />
          Add Friend
        </button>
      )}
      {friendStatus === 'pending' && (
        <button
          disabled
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg flex items-center gap-2 opacity-60"
        >
          <UserPlus className="w-4 h-4" />
          Request Sent
        </button>
      )}
      {friendStatus === 'friend' && (
        <button
          onClick={handleRemoveFriend}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 transition"
        >
          <UserMinus className="w-4 h-4" />
          Remove
        </button>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <ProfileCard user={user} actions={friendButton} />
        <MedalsTable stats={stats} />
      </div>
    </div>
  );
}
