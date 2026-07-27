'use client';

import FriendCard from './FriendCard';
import { useFriendsStore } from '@/lib/store/friendsStore';

interface FriendsListProps {
  title?: string;
  onCreateMatch?: (friendId: string, friendName: string) => void;
}

export default function FriendsList({
  title = 'Friends',
  onCreateMatch,
}: FriendsListProps) {
  const { friends, removeFriend } = useFriendsStore();

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
            key={friend.userId}
            name={friend.name}
            username={friend.username}
            profilePicUrl={friend.profilePicUrl}
            onRemove={() => removeFriend(friend.userId)}
          />
        ))}
      </div>
    </div>
  );
}
