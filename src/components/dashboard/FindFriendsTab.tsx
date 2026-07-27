'use client';

import { useState } from 'react';
import { useUIStore } from '@/lib/store/uiStore';

interface FindFriendsTabProps {
  onAddFriend?: (userId: string, name: string) => void | Promise<void>;
}

export default function FindFriendsTab({ onAddFriend }: FindFriendsTabProps) {
  const { addToast } = useUIStore();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!search.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(search)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Search failed. Try again.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async (userId: string, name: string) => {
    try {
      await onAddFriend?.(userId, name);
    } catch {
      addToast({
        type: 'error',
        message: 'Could not send friend request. Try again.',
      });
      return;
    }
    addToast({
      type: 'success',
      message: 'Friend request sent!',
    });
    setResults(results.filter((r) => r.id !== userId));
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search by username..."
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((user) => (
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
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      )}

      {search && results.length === 0 && !isSearching && (
        <p className="text-center text-gray-600 dark:text-gray-400 py-4">
          No users found.
        </p>
      )}
    </div>
  );
}
