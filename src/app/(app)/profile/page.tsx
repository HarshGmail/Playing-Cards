'use client';

import { useState } from 'react';
import ProfileCard from '@/components/profile/ProfileCard';
import ProfileEditModal from '@/components/profile/ProfileEditModal';
import MedalsTable from '@/components/profile/MedalsTable';
import FriendsLeaderboard from '@/components/profile/FriendsLeaderboard';
import {
  useMeUserQuery,
  useUpdateMeMutation,
  useUserStatsQuery,
  useAvatarMutation,
} from '@/lib/queries/users';
import { Edit, Share } from 'lucide-react';

export default function MyProfilePage() {
  const [showEditModal, setShowEditModal] = useState(false);

  const { data: user, isLoading, error } = useMeUserQuery();
  // Keyed off the loaded user, so it stays idle until the username is known.
  const { data: stats } = useUserStatsQuery(user?.username ?? '');

  const updateMe = useUpdateMeMutation();
  const avatarMutation = useAvatarMutation();

  const handleSaveProfile = async (data: { name: string; phone: string; dob: string }) => {
    await updateMe.mutateAsync(data);
    setShowEditModal(false);
  };

  /**
   * Applies immediately rather than on Save — the avatar has its own endpoint.
   * Returns the stored URL so the modal can drop its local preview.
   */
  const handleAvatarChange = async (file: File | null): Promise<string | null> => {
    const updated = await avatarMutation.mutateAsync(file);
    return updated.profilePicUrl ?? null;
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
      </div>
    );
  }

  // No redirect on failure: middleware already bounces unauthenticated requests
  // away from this route, so an error here is a real fetch failure worth showing
  // rather than a reason to silently navigate home.
  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 flex items-center justify-center">
        <p className="text-red-600">{error?.message || 'Failed to load profile'}</p>
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

        <FriendsLeaderboard self={{ id: user.id, name: user.name, username: user.username }} />

        {showEditModal && (
          <ProfileEditModal
            user={user}
            onClose={() => setShowEditModal(false)}
            onSave={handleSaveProfile}
            onAvatarChange={handleAvatarChange}
          />
        )}
      </div>
    </div>
  );
}
