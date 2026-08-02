'use client';

import { useState } from 'react';
import { Mail, Phone, Cake } from 'lucide-react';
import Avatar from '@/components/common/Avatar';
import ImageLightbox from '@/components/common/ImageLightbox';

interface ProfileCardProps {
  user: {
    id: string;
    name: string;
    username: string;
    email?: string;
    phone?: string;
    dob?: string;
    profilePicUrl?: string | null;
  };
  actions?: React.ReactNode;
  isOwnProfile?: boolean;
}

export default function ProfileCard({ user, actions, isOwnProfile }: ProfileCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Only an actual picture expands — initials would open an empty lightbox. This
  // component serves both /profile and /profile/[username], so wiring it here
  // covers viewing your own picture and anyone else's.
  const canExpand = !!user.profilePicUrl;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {canExpand ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label={`View ${user.name}'s profile picture`}
              className="rounded-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              <Avatar name={user.name} profilePicUrl={user.profilePicUrl} size={64} />
            </button>
          ) : (
            <Avatar name={user.name} profilePicUrl={user.profilePicUrl} size={64} />
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">@{user.username}</p>
            {isOwnProfile && (
              <span className="inline-block mt-1 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                Your Profile
              </span>
            )}
          </div>
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        {user.email && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Mail className="w-4 h-4 flex-shrink-0" />
            <span>{user.email}</span>
          </div>
        )}
        {user.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Phone className="w-4 h-4 flex-shrink-0" />
            <span>{user.phone}</span>
          </div>
        )}
        {user.dob && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Cake className="w-4 h-4 flex-shrink-0" />
            <span>{new Date(user.dob).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {expanded && user.profilePicUrl && (
        <ImageLightbox
          src={user.profilePicUrl}
          alt={`${user.name}'s profile picture`}
          onClose={() => setExpanded(false)}
        />
      )}
    </div>
  );
}
