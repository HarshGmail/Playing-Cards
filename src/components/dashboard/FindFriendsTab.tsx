'use client';

import { useState } from 'react';
import { useUserSearchQuery } from '@/lib/queries/users';
import { useAddFriendMutation } from '@/lib/queries/friends';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useUIStore } from '@/lib/store/uiStore';

interface FindFriendsTabProps {
  onAddFriend?: (userId: string, name: string) => void | Promise<void>;
}

export default function FindFriendsTab({ onAddFriend }: FindFriendsTabProps) {
  const { addToast } = useUIStore();
  const [search, setSearch] = useState('');
  const [removedUserIds, setRemovedUserIds] = useState<Set<string>>(new Set());
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: results = [], isLoading: isSearching } = useUserSearchQuery(debouncedSearch);
  const { mutate: addFriend, isPending: isAddingFriend } = useAddFriendMutation();

  const filteredResults = results.filter((r) => !removedUserIds.has(r.id));

  const handleAddFriend = (userId: string, name: string) => {
    addFriend(userId, {
      onSuccess: async () => {
        if (onAddFriend) {
          try {
            await onAddFriend(userId, name);
          } catch {
            addToast({
              type: 'error',
              message: 'Could not send friend request. Try again.',
            });
            return;
          }
        }
        addToast({
          type: 'success',
          message: 'Friend request sent!',
        });
        setRemovedUserIds((prev) => new Set(prev).add(userId));
      },
      onError: () => {
        addToast({
          type: 'error',
          message: 'Could not send friend request. Try again.',
        });
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username..."
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filteredResults.length > 0 && (
        <div className="space-y-2">
          {filteredResults.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {user.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  @{user.username}
                </p>
              </div>
              <button
                onClick={() => handleAddFriend(user.id, user.name)}
                disabled={isAddingFriend}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded text-sm font-medium"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      )}

      {debouncedSearch && filteredResults.length === 0 && !isSearching && (
        <p className="text-center text-gray-600 dark:text-gray-400 py-4">
          No users found.
        </p>
      )}
    </div>
  );
}
