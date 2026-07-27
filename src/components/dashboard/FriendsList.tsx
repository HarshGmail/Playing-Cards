'use client';

import FriendCard from './FriendCard';
import { useFriendsStore } from '@/lib/store/friendsStore';
import { useUIStore } from '@/lib/store/uiStore';

interface FriendsListProps {
  title?: string;
  onCreateMatch?: (friendId: string, friendName: string) => void;
}

export default function FriendsList({
  title = 'Friends',
  onCreateMatch,
}: FriendsListProps) {
  const { friends, removeFriend } = useFriendsStore();
  const { addToast } = useUIStore();

  const handleRemove = async (friendId: string) => {
    try {
      await removeFriend(friendId);
    } catch {
      addToast({ type: 'error', message: 'Could not remove friend. Try again.' });
    }
  };

  if (friends.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600 dark:text-gray-400">
        <p>No friends yet. Start by adding some!</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
        {title} ({friends.length})
      </h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {friends.map((friend) => (
          <FriendCard
            key={friend.id}
            name={friend.name}
            username={friend.username}
            profilePicUrl={friend.profilePicUrl}
            onRemove={() => handleRemove(friend.id)}
          />
        ))}
      </div>
    </div>
  );
}
