'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProfileCard from '@/components/profile/ProfileCard';
import ProfileEditModal from '@/components/profile/ProfileEditModal';
import MedalsTable from '@/components/profile/MedalsTable';
import { Edit, Share } from 'lucide-react';

export default function MyProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(undefined);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/users/me');
        if (!res.ok) throw new Error('Failed to load profile');
        const data = await res.json();
        setUser(data.user);

        const statsRes = await fetch(`/api/users/${data.user.username}/stats`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.stats);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleSaveProfile = async (data: { name: string; phone: string; dob: string }) => {
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to save profile');
      const result = await res.json();
      setUser(result.user);
      setShowEditModal(false);
    } catch (err) {
      throw err;
    }
  };

  const handleShareProfile = async () => {
    const url = `${window.location.origin}/profile/${user?.username}`;
    try {
      await navigator.clipboard.writeText(url);
      alert('Profile link copied to clipboard!');
    } catch {
      alert(`Could not copy automatically. Your profile link is: ${url}`);
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
        <p className="text-red-600">{error || 'Failed to load profile'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <ProfileCard
          user={user}
          isOwnProfile
          actions={
            <div className="flex gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleShareProfile}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 transition"
              >
                <Share className="w-4 h-4" />
                Share
              </button>
            </div>
          }
        />

        <MedalsTable stats={stats} />

        {showEditModal && (
          <ProfileEditModal
            user={user}
            onClose={() => setShowEditModal(false)}
            onSave={handleSaveProfile}
          />
        )}
      </div>
    </div>
  );
}
